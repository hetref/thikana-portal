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
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ProductAnalytics({ userId, productId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const productRef = doc(db, `users/${userId}/products`, productId);
    const unsubscribe = onSnapshot(
      productRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setAnalytics({ id: docSnap.id, ...docSnap.data() });
        } else {
          setAnalytics(null);
        }
      },
      (error) => {
        console.error("Error fetching product analytics:", error);
        setAnalytics(null);
      }
    );

    return () => {
      unsubscribe();
    };
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
        <CardTitle className="text-xl font-bold">
          Product Analytics: {analytics.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold">
              Total Sales: {analytics.totalSales}
            </p>
            <p className="text-lg font-semibold">
              Total Revenue: ₹{analytics.totalRevenue.toFixed(2)}
            </p>
            <p className="text-lg font-semibold">
              Purchase Count: {analytics.purchaseCount}
            </p>
          </div>
          {/* <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer> */}
        </div>
      </CardContent>
    </Card>
  );
}
