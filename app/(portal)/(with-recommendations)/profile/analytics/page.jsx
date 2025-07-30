"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  getProducts,
  getUserAnalytics,
  getMonthlyAnalytics,
  getYearlyAnalytics,
} from "@/lib/inventory-operations";
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
import { ChevronLeft, FileDown } from "lucide-react";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";

// Text-based PDF report generation
const generatePDF = async (userAnalytics, productsWithRevenue) => {
  let toastId = null;
  try {
    toastId = toast.loading("Generating PDF report...");

    // Create a function to generate tables manually in case autoTable fails
    const createSimpleTable = (doc, headers, rows, startY, options = {}) => {
      const {
        cellWidth = 30,
        rowHeight = 10,
        fontSize = 10,
        headerFillColor = [56, 61, 149],
      } = options;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const tableWidth = pageWidth - 2 * margin;
      const colWidth = tableWidth / headers.length;

      // Set header styles
      doc.setFillColor(...headerFillColor);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(fontSize);

      // Draw header cells
      headers.forEach((header, i) => {
        doc.rect(margin + i * colWidth, startY, colWidth, rowHeight, "FD");
        doc.text(
          header,
          margin + i * colWidth + colWidth / 2,
          startY + rowHeight / 2,
          { align: "center", baseline: "middle" }
        );
      });

      // Reset text color for data
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 255, 255);

      // Draw data rows
      let currentY = startY + rowHeight;
      rows.forEach((row, rowIndex) => {
        // Alternate row background
        if (rowIndex % 2 === 1) {
          doc.setFillColor(240, 246, 255);
        } else {
          doc.setFillColor(255, 255, 255);
        }

        row.forEach((cell, i) => {
          doc.rect(margin + i * colWidth, currentY, colWidth, rowHeight, "FD");
          doc.text(
            String(cell),
            margin + i * colWidth + colWidth / 2,
            currentY + rowHeight / 2,
            { align: "center", baseline: "middle" }
          );
        });

        currentY += rowHeight;
      });

      return currentY; // Return the Y position after the table
    };

    // Dynamically import jsPDF only
    const { jsPDF } = await import("jspdf");

    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Try to load jspdf-autotable and attach it to the document
    try {
      const autoTable = (await import("jspdf-autotable")).default;
      if (typeof autoTable === "function") {
        // Manually attach autoTable to the document
        doc.autoTable = function (...args) {
          return autoTable(this, ...args);
        };
        console.log("autoTable successfully attached to document");
      } else {
        console.warn("autoTable import did not return a function");
      }
    } catch (e) {
      console.error("Error loading jspdf-autotable:", e);
    }

    // Add title and header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 128);
    doc.text("Analytics Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 28, {
      align: "center",
    });

    // Add a decorative line
    doc.setDrawColor(0, 0, 128);
    doc.setLineWidth(0.5);
    doc.line(20, 32, 190, 32);

    // Add company/app name
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Thikana Portal", 20, 38);

    // ===== SUMMARY SECTION =====
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 128);
    doc.text("1. Summary Metrics", 20, 48);
    doc.setTextColor(0, 0, 0);

    // Summary metrics table
    let currentY = 52;
    const summaryData = [
      ["Total Products Bought", userAnalytics?.totalProductsBought || 0],
      ["Total Sales", userAnalytics?.totalSales || 0],
      ["Total Revenue", `₹${(userAnalytics?.totalRevenue || 0).toFixed(2)}`],
      [
        "Average Order Value",
        `₹${(userAnalytics?.averageOrderValue || 0).toFixed(2)}`,
      ],
    ];

    // Try to use autoTable if available, otherwise fall back to manual table
    if (typeof doc.autoTable === "function") {
      doc.autoTable({
        startY: 52,
        head: [["Metric", "Value"]],
        body: summaryData,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [56, 61, 149], textColor: [255, 255, 255] },
        columnStyles: {
          0: { fontStyle: "bold" },
          1: { halign: "right" },
        },
      });
      currentY = doc.lastAutoTable.finalY;
    } else {
      // Fall back to manual table creation
      currentY = createSimpleTable(
        doc,
        ["Metric", "Value"],
        summaryData,
        currentY,
        { cellWidth: 80, rowHeight: 10 }
      );
    }

    // ===== CATEGORY SECTION =====
    // Compile category data from products
    const categoryData = productsWithRevenue.reduce((acc, product) => {
      const category = product.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = {
          sales: 0,
          revenue: 0,
          count: 0,
        };
      }
      acc[category].sales += product.totalSales || 0;
      acc[category].revenue += product.totalRevenue || 0;
      acc[category].count += 1;
      return acc;
    }, {});

    // Format category data for table
    const categoryTableData = Object.entries(categoryData).map(
      ([category, data]) => [
        category,
        data.count,
        data.sales,
        `₹${data.revenue.toFixed(2)}`,
        `${((data.sales / userAnalytics?.totalSales) * 100 || 0).toFixed(1)}%`,
      ]
    );

    // Add category section
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 128);
    doc.text("2. Sales by Category", 20, currentY + 15);
    doc.setTextColor(0, 0, 0);

    // Try to use autoTable if available, otherwise fall back to manual table
    if (typeof doc.autoTable === "function") {
      doc.autoTable({
        startY: currentY + 20,
        head: [["Category", "Products Count", "Sales", "Revenue", "Sales %"]],
        body: categoryTableData,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [56, 61, 149], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 40 },
          3: { halign: "right" },
          4: { halign: "right" },
        },
      });
      currentY = doc.lastAutoTable.finalY;
    } else {
      // Fall back to manual table creation
      currentY = createSimpleTable(
        doc,
        ["Category", "Products Count", "Sales", "Revenue", "Sales %"],
        categoryTableData,
        currentY + 20
      );
    }

    // ===== TOP PRODUCTS SECTION =====
    // Sort products by revenue
    const topProducts = [...productsWithRevenue]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Format top products for table
    const topProductsTableData = topProducts.map((product) => [
      product.name || "Unnamed Product",
      product.category || "Uncategorized",
      product.totalSales || 0,
      `₹${(product.totalRevenue || 0).toFixed(2)}`,
    ]);

    // Add top products section
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 128);
    doc.text("3. Top Products by Revenue", 20, currentY + 15);
    doc.setTextColor(0, 0, 0);

    // Try to use autoTable if available, otherwise fall back to manual table
    if (typeof doc.autoTable === "function") {
      doc.autoTable({
        startY: currentY + 20,
        head: [["Product Name", "Category", "Sales", "Revenue"]],
        body: topProductsTableData,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [56, 61, 149], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 50 },
          3: { halign: "right" },
        },
      });
      currentY = doc.lastAutoTable.finalY;
    } else {
      // Fall back to manual table creation
      currentY = createSimpleTable(
        doc,
        ["Product Name", "Category", "Sales", "Revenue"],
        topProductsTableData,
        currentY + 20
      );
    }

    // ===== TIME SERIES DATA =====
    // Add time data if available
    if (monthlyAnalytics.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 128);
      doc.text("4. Monthly Sales and Revenue", 20, 20);
      doc.setTextColor(0, 0, 0);

      const monthlyTableData = monthlyAnalytics.map((data) => [
        data.month,
        data.sales || 0,
        `₹${(data.revenue || 0).toFixed(2)}`,
      ]);

      // Try to use autoTable if available, otherwise fall back to manual table
      if (typeof doc.autoTable === "function") {
        doc.autoTable({
          startY: 25,
          head: [["Month", "Sales", "Revenue"]],
          body: monthlyTableData,
          theme: "grid",
          styles: { fontSize: 10, cellPadding: 4 },
          headStyles: { fillColor: [56, 61, 149], textColor: [255, 255, 255] },
          columnStyles: {
            2: { halign: "right" },
          },
        });
        currentY = doc.lastAutoTable.finalY;
      } else {
        // Fall back to manual table creation
        currentY = createSimpleTable(
          doc,
          ["Month", "Sales", "Revenue"],
          monthlyTableData,
          25
        );
      }
    }

    if (yearlyAnalytics.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 128);
      doc.text("5. Yearly Sales and Revenue", 20, currentY + 15);
      doc.setTextColor(0, 0, 0);

      const yearlyTableData = yearlyAnalytics.map((data) => [
        data.year,
        data.sales || 0,
        `₹${(data.revenue || 0).toFixed(2)}`,
      ]);

      // Try to use autoTable if available, otherwise fall back to manual table
      if (typeof doc.autoTable === "function") {
        doc.autoTable({
          startY: currentY + 20,
          head: [["Year", "Sales", "Revenue"]],
          body: yearlyTableData,
          theme: "grid",
          styles: { fontSize: 10, cellPadding: 4 },
          headStyles: { fillColor: [56, 61, 149], textColor: [255, 255, 255] },
          columnStyles: {
            2: { halign: "right" },
          },
        });
        currentY = doc.lastAutoTable.finalY;
      } else {
        // Fall back to manual table creation
        currentY = createSimpleTable(
          doc,
          ["Year", "Sales", "Revenue"],
          yearlyTableData,
          currentY + 20
        );
      }
    }

    // ===== ALL PRODUCTS TABLE =====
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 128);
    doc.text("6. Complete Product Analytics", 20, 20);
    doc.setTextColor(0, 0, 0);

    // Format all products for table
    const allProductsTableData = productsWithRevenue.map((product, index) => [
      index + 1,
      product.name || "Unnamed Product",
      product.category || "Uncategorized",
      product.purchaseCount || 0,
      product.totalSales || 0,
      `₹${(product.totalRevenue || 0).toFixed(2)}`,
    ]);

    // All products table
    // Try to use autoTable if available, otherwise fall back to manual table
    if (typeof doc.autoTable === "function") {
      doc.autoTable({
        startY: 25,
        head: [
          [
            "#",
            "Product Name",
            "Category",
            "Purchase Count",
            "Sales",
            "Revenue",
          ],
        ],
        body: allProductsTableData,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [56, 61, 149], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 40 },
          5: { halign: "right" },
        },
        alternateRowStyles: { fillColor: [240, 246, 255] },
      });
      currentY = doc.lastAutoTable.finalY;
    } else {
      // Fall back to manual table creation
      currentY = createSimpleTable(
        doc,
        ["#", "Product Name", "Category", "Purchase Count", "Sales", "Revenue"],
        allProductsTableData,
        25,
        { cellWidth: 10, rowHeight: 10 }
      );
    }

    // Add footer with page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${i} of ${pageCount} - Thikana Portal Analytics`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    // Save the PDF
    doc.save("analytics-report.pdf");
    toast.dismiss(toastId);
    toast.success("Report downloaded successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error);
    if (toastId) toast.dismiss(toastId);

    // Try to create a minimal report despite errors
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("Analytics Report", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 30, {
        align: "center",
      });

      doc.setFontSize(14);
      doc.text("Summary Metrics", 20, 50);

      doc.setFontSize(10);
      doc.text(
        "Total Products Bought: " + (userAnalytics?.totalProductsBought || 0),
        20,
        60
      );
      doc.text("Total Sales: " + (userAnalytics?.totalSales || 0), 20, 70);
      doc.text(
        "Total Revenue: ₹" + (userAnalytics?.totalRevenue || 0).toFixed(2),
        20,
        80
      );
      doc.text(
        "Average Order Value: ₹" +
          (userAnalytics?.averageOrderValue || 0).toFixed(2),
        20,
        90
      );

      doc.save("analytics-basic-report.pdf");
      toast.success("Basic report generated due to errors");
    } catch (fallbackError) {
      console.error("Even fallback report failed:", fallbackError);
      toast.error(
        `Failed to generate report: ${error.message || "Unknown error"}`
      );
    }
  }
};

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

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  // Add refs for capturing chart images
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);
  const lineChartRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const userId = auth.currentUser?.uid;
        if (!userId) {
          toast.error("User not authenticated");
          return;
        }

        // Set up listeners for all data streams
        const unsubscribeProducts = getProducts(userId, (productsData) => {
          setProducts(productsData);
        });

        const unsubscribeUserAnalytics = getUserAnalytics(
          userId,
          (analyticsData) => {
            if (analyticsData) {
              setUserAnalytics(analyticsData);
            }
          }
        );

        const unsubscribeMonthlyAnalytics = getMonthlyAnalytics(
          userId,
          (monthlyData) => {
            console.log("Monthly Analytics Raw:", monthlyData);
            if (monthlyData) {
              // Transform the data for the chart
              const transformedData = Object.entries(monthlyData)
                .map(([month, data]) => ({
                  month,
                  sales: data.sales || 0,
                  revenue: data.revenue || 0,
                }))
                .sort((a, b) => a.month.localeCompare(b.month));

              console.log("Transformed Monthly Data:", transformedData);
              setMonthlyAnalytics(transformedData);
            } else {
              setMonthlyAnalytics([]);
            }
          }
        );

        const unsubscribeYearlyAnalytics = getYearlyAnalytics(
          userId,
          (yearlyData) => {
            console.log("Yearly Analytics Raw:", yearlyData);
            if (yearlyData) {
              // Transform the data for the chart
              const transformedData = Object.entries(yearlyData)
                .map(([year, data]) => ({
                  year,
                  sales: data.sales || 0,
                  revenue: data.revenue || 0,
                }))
                .sort((a, b) => a.year.localeCompare(b.year));

              console.log("Transformed Yearly Data:", transformedData);
              setYearlyAnalytics(transformedData);
            } else {
              setYearlyAnalytics([]);
            }
          }
        );

        setLoading(false);

        return () => {
          unsubscribeProducts();
          unsubscribeUserAnalytics();
          unsubscribeMonthlyAnalytics();
          unsubscribeYearlyAnalytics();
        };
      } catch (error) {
        console.error("Error fetching analytics:", error);
        toast.error("Failed to fetch analytics data");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total revenue for each product
  const productsWithRevenue = filteredProducts.map((product) => {
    console.log("Product before calculation:", product);
    const totalRevenue = (product.price || 0) * (product.totalSales || 0);
    console.log("Calculated totalRevenue:", totalRevenue);
    return {
      ...product,
      totalRevenue,
    };
  });

  console.log("Products with revenue:", productsWithRevenue);

  const categoryData = productsWithRevenue.reduce((acc, product) => {
    acc[product.category] =
      (acc[product.category] || 0) + (product.totalSales || 0);
    return acc;
  }, {});

  const pieChartData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  const currentData = useMemo(() => {
    // If no data is available, use sample data for development/testing
    const sampleMonthlyData = [
      { month: "2025-01", sales: 2, revenue: 240 },
      { month: "2025-02", sales: 3, revenue: 360 },
      { month: "2025-03", sales: 3, revenue: 360 },
    ];

    const sampleYearlyData = [
      { year: "2023", sales: 10, revenue: 1200 },
      { year: "2024", sales: 15, revenue: 1800 },
      { year: "2025", sales: 5, revenue: 600 },
    ];

    // Check if we have real data
    const hasMonthlyData = monthlyAnalytics && monthlyAnalytics.length > 0;
    const hasYearlyData = yearlyAnalytics && yearlyAnalytics.length > 0;

    // Return appropriate data based on timeFrame
    if (timeFrame === "monthly") {
      return hasMonthlyData ? monthlyAnalytics : sampleMonthlyData;
    } else {
      return hasYearlyData ? yearlyAnalytics : sampleYearlyData;
    }
  }, [timeFrame, monthlyAnalytics, yearlyAnalytics]);

  // Add debug display for charts data
  useEffect(() => {
    console.log("Current chart data:", currentData);
  }, [currentData]);

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
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link href="/profile/inventory">
          <Button variant="outline">
            <ChevronLeft /> Inventory
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Admin Analytics Dashboard</h1>
        <Button
          onClick={() => generatePDF(userAnalytics, productsWithRevenue)}
          className="bg-black hover:bg-black/80 text-white"
        >
          <FileDown className="w-4 h-4 mr-1" /> Download Report
        </Button>
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
            <div ref={pieChartRef}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => {
                      return percent > 0.03
                        ? `${name.substring(0, 10)}${name.length > 10 ? "..." : ""} ${(percent * 100).toFixed(0)}%`
                        : "";
                    }}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} sales`} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ paddingLeft: "30px" }}
                    formatter={(value) =>
                      value.length > 12 ? `${value.substring(0, 12)}...` : value
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={barChartRef}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={productsWithRevenue
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
            </div>
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
          <div ref={lineChartRef}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={timeFrame === "monthly" ? "month" : "year"}
                  tickFormatter={(value) =>
                    timeFrame === "monthly" ? value.split("-")[1] : value
                  }
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => [
                    `${name === "revenue" ? "₹" + value : value}`,
                    name.charAt(0).toUpperCase() + name.slice(1),
                  ]}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sales"
                  stroke="#8884d8"
                  name="Sales"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#82ca9d"
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
                <TableHead>SR No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Purchase Count</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsWithRevenue.map((product, index) => (
                <TableRow key={product.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.purchaseCount || 0}</TableCell>
                  <TableCell>{product.totalSales || 0}</TableCell>
                  <TableCell>
                    ₹{(product.totalRevenue || 0).toFixed(2)}
                  </TableCell>
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
