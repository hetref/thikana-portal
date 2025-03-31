"use client";
import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Package, Search, ShoppingBag, User } from "lucide-react";
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

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [hasMore, setHasMore] = useState(true);
  const [lastOrder, setLastOrder] = useState(null);

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
            <div className="text-center py-8">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No orders
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No orders match your current filters
              </p>
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
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total</span>
                        <span className="font-semibold">
                          ₹{order.amount?.toFixed(2)}
                        </span>
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
    </div>
  );
}
