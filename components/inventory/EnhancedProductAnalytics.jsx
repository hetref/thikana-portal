"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { collection, query, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { months, currentYear } from "@/lib/date-utils";

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28CFF"];

export default function EnhancedProductAnalytics({ userId, productId }) {
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [activeTimeRange, setActiveTimeRange] = useState("monthly");

  // Format data for charts
  const formatMonthlyData = (data) => {
    if (!data) return [];

    const allMonths = Array.from({ length: 12 }, (_, i) => {
      // Get month name (Jan, Feb, etc.)
      const monthName = new Date(0, i).toLocaleString("default", {
        month: "short",
      });
      return {
        name: monthName,
        sales: 0,
        revenue: 0,
      };
    });

    // Fill in the data for months we have data for
    Object.entries(data).forEach(([key, value]) => {
      const [year, month] = key.split("-");

      // Only use current year's data
      if (year === currentYear.toString()) {
        const monthIndex = parseInt(month) - 1; // Convert to 0-based index
        if (monthIndex >= 0 && monthIndex < 12) {
          allMonths[monthIndex].sales = value.sales || 0;
          allMonths[monthIndex].revenue = value.revenue || 0;
        }
      }
    });

    return allMonths;
  };

  const formatYearlyData = (data) => {
    if (!data) return [];

    return Object.entries(data).map(([year, value]) => ({
      name: year,
      sales: value.sales || 0,
      revenue: value.revenue || 0,
    }));
  };

  useEffect(() => {
    if (!userId || !productId) return;

    const productRef = doc(db, `users/${userId}/products`, productId);

    const unsubscribe = onSnapshot(
      productRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setProductData(data);

          // Process monthly data
          if (data.monthlySales) {
            setMonthlyData(formatMonthlyData(data.monthlySales));
          }

          // Process yearly data
          if (data.yearlySales) {
            setYearlyData(formatYearlyData(data.yearlySales));
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching product data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, productId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!productData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No analytics data available for this product.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create chart data for ratings distribution
  const ratingsData = [
    { name: "5 Stars", value: productData.ratings?.fiveStars || 0 },
    { name: "4 Stars", value: productData.ratings?.fourStars || 0 },
    { name: "3 Stars", value: productData.ratings?.threeStars || 0 },
    { name: "2 Stars", value: productData.ratings?.twoStars || 0 },
    { name: "1 Star", value: productData.ratings?.oneStar || 0 },
  ].filter((item) => item.value > 0); // Only show ratings that exist

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productData.totalSales || 0}
            </div>
            <p className="text-xs text-muted-foreground">All time sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(productData.totalRevenue || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productData.ratings?.average
                ? productData.ratings.average.toFixed(1)
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {productData.ratings?.count || 0} ratings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productData.quantity || 0}
            </div>
            <p className="text-xs text-muted-foreground">Units available</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" onValueChange={setActiveTimeRange}>
            <TabsList className="mb-4">
              <TabsTrigger value="monthly">Monthly (This Year)</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly">
              <div className="h-[300px]">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}`, ""]} />
                      <Legend />
                      <Bar dataKey="sales" name="Units Sold" fill="#8884d8" />
                      <Bar
                        dataKey="revenue"
                        name="Revenue (₹)"
                        fill="#82ca9d"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    No monthly sales data available
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="yearly">
              <div className="h-[300px]">
                {yearlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}`, ""]} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        name="Units Sold"
                        stroke="#8884d8"
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue (₹)"
                        stroke="#82ca9d"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    No yearly sales data available
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Ratings Distribution */}
      {ratingsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ratings Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratingsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {ratingsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} ratings`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
