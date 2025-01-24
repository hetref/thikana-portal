"use client";

import { useState, useEffect } from "react";
import { getProduct } from "@/lib/inventory-operations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ProductAnalytics({ userId, productId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const data = await getProduct(userId, productId);
        setAnalytics(data);
      } catch (error) {
        console.error("Error fetching product analytics:", error);
      }
    }
    fetchAnalytics();
  }, [userId, productId]);

  if (!analytics) {
    return <div>Loading analytics...</div>;
  }

  const chartData = [
    { name: "Total Sales", value: analytics.totalSales },
    { name: "Total Revenue", value: analytics.totalRevenue },
    { name: "Purchase Count", value: analytics.purchaseCount },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Analytics: {analytics.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p>Total Sales: {analytics.totalSales}</p>
            <p>Total Revenue: ${analytics.totalRevenue.toFixed(2)}</p>
            <p>Purchase Count: {analytics.purchaseCount}</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
