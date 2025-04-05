"use client";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Package,
  Search,
  ShoppingBag,
  User,
  Printer,
  FileText,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  startAfter,
  limit,
} from "firebase/firestore";
import Image from "next/image";
import { useReactToPrint } from "react-to-print";

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [hasMore, setHasMore] = useState(true);
  const [lastOrder, setLastOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [billDialogOpen, setBillDialogOpen] = useState(false);

  const billRef = useRef();

  // Handle printing functionality
  const handlePrint = useReactToPrint({
    content: () => billRef.current,
    documentTitle: `Invoice_${selectedOrder?.orderId || "order"}`,
  });

  useEffect(() => {
    fetchOrders();
  }, [timeFilter]);

  const fetchOrders = async (isLoadMore = false) => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      let ordersQuery = query(
        collection(db, "businesses", auth.currentUser.uid, "orders"),
        orderBy("timestamp", "desc")
      );

      // Apply time filter
      if (timeFilter !== "all") {
        const now = new Date();
        let startDate = new Date();
        switch (timeFilter) {
          case "today":
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(now.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(now.getMonth() - 1);
            break;
        }
        ordersQuery = query(ordersQuery, where("timestamp", ">=", startDate));
      }

      // Apply pagination
      if (isLoadMore && lastOrder) {
        ordersQuery = query(ordersQuery, startAfter(lastOrder), limit(10));
      } else {
        ordersQuery = query(ordersQuery, limit(10));
      }

      const querySnapshot = await getDocs(ordersQuery);
      const ordersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      }));

      setOrders((prev) => (isLoadMore ? [...prev, ...ordersData] : ordersData));
      setLastOrder(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === 10);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
    }
  };

  const loadMore = () => {
    fetchOrders(true);
  };

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      order.orderId.toLowerCase().includes(searchLower) ||
      order.userId.toLowerCase().includes(searchLower)
    );
  });

  const calculateTotal = (products) => {
    return products.reduce((total, product) => {
      return total + product.amount * product.quantity;
    }, 0);
  };

  // Function to handle bill generation
  const handleGenerateBill = (order) => {
    setSelectedOrder(order);
    setBillDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Orders
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((order) => order.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {orders
                .reduce((total, order) => total + (order.amount || 0), 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total earnings from orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            Manage and view your recent order details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <ShoppingBag className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                No Orders Yet
              </h3>
              <p className="mt-2 text-sm text-gray-500 max-w-md">
                {searchQuery
                  ? "No orders match your search criteria. Try adjusting your filters."
                  : "You haven't received any orders yet. Orders will appear here when customers make purchases."}
              </p>
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setTimeFilter("all");
                  }}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 py-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-medium text-sm sm:text-base">
                            Order #{order.orderId.substring(0, 8)}...
                          </h3>
                          <Badge
                            variant={
                              order.status === "completed"
                                ? "success"
                                : "outline"
                            }
                            className="ml-2"
                          >
                            {order.status === "completed"
                              ? "Completed"
                              : order.status}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {format(
                            new Date(order.timestamp),
                            "MMM d, yyyy · h:mm a"
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm sm:text-base">
                          ₹{order.amount?.toFixed(2)}
                        </p>
                        <div className="flex items-center text-muted-foreground text-sm">
                          <User className="h-3 w-3 mr-1" />
                          <span>{order.userId.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="px-4 py-3 border-b">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">Items</h4>
                        <span className="text-xs text-muted-foreground">
                          {order.products?.length || 0} item(s)
                        </span>
                      </div>
                    </div>
                    <div className="divide-y">
                      {order.products?.map((product, idx) => (
                        <div key={idx} className="p-4 flex items-center gap-3">
                          <div className="relative w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            {product.imageUrl ? (
                              <Image
                                src={product.imageUrl}
                                alt={product.productName}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-grow">
                            <h5 className="font-medium text-sm">
                              {product.productName}
                            </h5>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <span>
                                ₹{product.amount?.toFixed(2)} ×{" "}
                                {product.quantity}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ₹{(product.amount * product.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t p-4 bg-gray-50">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Total</span>
                          <span className="font-semibold">
                            ₹{order.amount?.toFixed(2)}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 mt-2 w-full"
                          onClick={() => handleGenerateBill(order)}
                        >
                          <FileText className="h-4 w-4" />
                          <span>Generate Bill</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Generation Dialog */}
      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderId?.substring(0, 8)} details
            </DialogDescription>
          </DialogHeader>

          <div ref={billRef} className="p-4 bg-white">
            {/* Bill Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">INVOICE</h1>
              <p className="text-muted-foreground">Thikana Portal</p>
            </div>

            {/* Bill Info */}
            <div className="flex justify-between mb-6">
              <div>
                <h3 className="font-medium">Invoice To:</h3>
                <p>Customer ID: {selectedOrder?.userId?.substring(0, 8)}</p>
                <p>
                  Order Date:{" "}
                  {selectedOrder &&
                    format(new Date(selectedOrder?.timestamp), "MMM d, yyyy")}
                </p>
              </div>
              <div className="text-right">
                <h3 className="font-medium">Invoice Details:</h3>
                <p>Invoice #: INV-{selectedOrder?.orderId?.substring(0, 8)}</p>
                <p>Order #: {selectedOrder?.orderId?.substring(0, 8)}</p>
              </div>
            </div>

            {/* Bill Items */}
            <table className="w-full mb-6">
              <thead className="border-b-2 border-gray-300">
                <tr>
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedOrder?.products?.map((product, idx) => (
                  <tr key={idx}>
                    <td className="py-2">{product.productName}</td>
                    <td className="py-2 text-right">{product.quantity}</td>
                    <td className="py-2 text-right">
                      ₹{product.amount?.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      ₹{(product.amount * product.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 font-medium">
                <tr>
                  <td colSpan={3} className="py-2 text-right">
                    Subtotal:
                  </td>
                  <td className="py-2 text-right">
                    ₹{selectedOrder?.amount?.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 text-right">
                    Tax:
                  </td>
                  <td className="py-2 text-right">₹0.00</td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={3} className="py-2 text-right">
                    Total:
                  </td>
                  <td className="py-2 text-right">
                    ₹{selectedOrder?.amount?.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Payment info */}
            <div className="border-t pt-4 mb-6">
              <h3 className="font-medium mb-2">Payment Information</h3>
              <p>Status: {selectedOrder?.paymentStatus || "Paid"}</p>
              <p>Method: {selectedOrder?.paymentMethod || "Online Payment"}</p>
            </div>

            {/* Thank You */}
            <div className="text-center mt-8">
              <p className="font-medium">Thank you for your business!</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBillDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handlePrint} className="flex items-center gap-1">
              <Printer className="h-4 w-4" />
              <span>Print / Save PDF</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
