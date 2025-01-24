"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getProducts,
  getUserAnalytics,
  getMonthlyAnalytics,
  getYearlyAnalytics,
} from "@/lib/inventory-operations";
// import {
//   products as staticProducts,
//   userAnalytics as staticUserAnalytics,
// } from "@/lib/static-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase";
import { ChevronLeft } from "lucide-react";

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [userAnalytics, setUserAnalytics] = useState({
    totalProductsBought: 0,
    totalSales: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
  });
  const [monthlyAnalytics, setMonthlyAnalytics] = useState([]); // New state for monthly analytics
  const [yearlyAnalytics, setYearlyAnalytics] = useState([]); // New state for yearly analytics
  const [timeFrame, setTimeFrame] = useState("monthly"); // New state for time frame

  useEffect(() => {
    async function fetchData() {
      try {
        const userId = auth.currentUser.uid;
        const [
          fetchedProducts,
          fetchedUserAnalytics,
          fetchedMonthlyAnalytics,
          fetchedYearlyAnalytics,
        ] = await Promise.all([
          getProducts(userId),
          getUserAnalytics(userId),
          getMonthlyAnalytics(userId), // Fetch monthly analytics
          getYearlyAnalytics(userId), // Fetch yearly analytics
        ]);
        setProducts(fetchedProducts);
        setUserAnalytics(fetchedUserAnalytics);
        setMonthlyAnalytics(fetchedMonthlyAnalytics); // Set monthly analytics
        setYearlyAnalytics(fetchedYearlyAnalytics); // Set yearly analytics
        console.log("FETCHED DATA", fetchedProducts, fetchedUserAnalytics);
        console.log(
          "Monthly Analytics:",
          fetchedMonthlyAnalytics,
          fetchedYearlyAnalytics
        ); // Log monthly analytics
      } catch (error) {
        console.error("Error fetching data:", error);
        // setProducts(staticProducts);
        // setUserAnalytics(staticUserAnalytics);
        toast.error("Failed to fetch data. Using static data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryData = products.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + product.totalSales;
    return acc;
  }, {});

  const pieChartData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  const currentData =
    timeFrame === "monthly" ? monthlyAnalytics : yearlyAnalytics; // Determine current data based on time frame

  if (loading) {
    return <div>Loading...</div>;
  }

  if (userAnalytics && !userAnalytics.totalProductsBought) {
    return (
      <div>
        <h2>No Analytics to show 🥲</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* <h1 className="text-3xl font-bold mb-6">Admin Analytics Dashboard</h1> */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link href="/profile/inventory">
          <Button variant="outline">
            <ChevronLeft /> Inventory
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Admin Analytics Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Products Bought</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {userAnalytics?.totalProductsBought}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userAnalytics?.totalSales}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ₹{userAnalytics?.totalRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ₹{userAnalytics?.averageOrderValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={products
                  .sort((a, b) => b.totalRevenue - a.totalRevenue)
                  .slice(0, 5)}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalRevenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Sales and Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center space-x-4 mb-4">
            <Button
              variant={timeFrame === "monthly" ? "default" : "outline"}
              onClick={() => setTimeFrame("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={timeFrame === "yearly" ? "default" : "outline"}
              onClick={() => setTimeFrame("yearly")}
            >
              Yearly
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={timeFrame === "monthly" ? "month" : "year"} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sales"
                stroke="#8884d8"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#82ca9d"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Purchase Count</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.purchaseCount}</TableCell>
                  <TableCell>{product.totalSales}</TableCell>
                  <TableCell>₹{product.totalRevenue.toFixed(2)}</TableCell>
                  <TableCell>
                    <Link href={`/profile/analytics/${product.id}`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
