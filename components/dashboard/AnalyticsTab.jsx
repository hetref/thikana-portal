"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Activity,
  BarChart3,
  Download,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

// Colors for pie chart
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

// Format date string (YYYY-MM-DD HH:MM:SS) to Date object
const parseDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString.replace(" ", "T"));
};

// Get month name from date string
const getMonthFromDate = (dateString) => {
  if (!dateString) return "";
  const date = parseDate(dateString);
  return date.toLocaleString("default", { month: "short" });
};

export default function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [anomalyData, setAnomalyData] = useState([]);
  const [showDemoData, setShowDemoData] = useState(true);
  const [predictedData, setPredictedData] = useState([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    // Fetch analytics data from API
    const fetchAnalyticsData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        // Get API URL with fallback for local development
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        const response = await fetch(
          `${apiUrl}/analysis/full-analysis/${user.uid}`
        );

        if (!response.ok) {
          console.error(`API request failed with status ${response.status}`);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setAnalyticsData(data);

        // Process data for charts if we have valid data
        if (data && !data.error) {
          try {
            // Process category data for pie chart
            const categories = data.recommendations?.category_analysis || {};
            const categoryChartData = Object.entries(categories).map(
              ([name, details]) => ({
                name,
                value: details.total_spent || 0,
              })
            );

            // Process monthly data
            const spendingPatterns =
              data.recommendations?.spending_patterns?.by_day || {};
            const monthlyExpenseData = Object.entries(spendingPatterns).map(
              ([day, details]) => ({
                name: day,
                amount: details.total_spent || 0,
              })
            );

            // Process anomaly data
            const anomalies = data.transaction_analysis?.anomalies || [];
            const formattedAnomalies = anomalies.map((anomaly) => ({
              date: anomaly.timestamp
                ? anomaly.timestamp.split("T")[0]
                : "Unknown",
              amount: anomaly.amount || 0,
              isAnomaly: true,
              reason: anomaly.reason || "Unusual spending pattern",
            }));

            // Add regular transactions to anomaly chart
            if (data.transaction_analysis?.summary?.total_transactions > 0) {
              // We don't have raw transaction list in the API response,
              // so we'll use the aggregated data
              const dailySpending = Object.entries(spendingPatterns).map(
                ([day, details]) => ({
                  date: day,
                  amount: details.average_transaction || 0,
                  isAnomaly: false,
                })
              );

              // Combine with anomalies
              const allTransactions = [
                ...dailySpending,
                ...formattedAnomalies,
              ].sort((a, b) => new Date(a.date) - new Date(b.date));

              setAnomalyData(allTransactions);
            } else {
              setAnomalyData(formattedAnomalies);
            }

            // Process prediction data
            const predictions =
              data.future_predictions?.predictions?.categories || {};
            const predictionsData = [
              // Use current month as starting point
              {
                month: new Date().toLocaleString("default", { month: "short" }),
                actual: data.recommendations?.overview?.total_spending || 0,
                predicted: data.recommendations?.overview?.total_spending || 0,
              },
            ];

            // Add next few months predictions
            const months = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];
            const currentMonthIndex = new Date().getMonth();

            let predictedTotal =
              data.future_predictions?.predictions?.total_predicted || 0;
            if (predictedTotal === 0) {
              // If no prediction, use the last month's value with slight increase
              predictedTotal =
                (data.recommendations?.overview?.total_spending || 0) * 1.1;
            }

            // Generate 5 months of predictions
            for (let i = 1; i <= 5; i++) {
              const monthIndex = (currentMonthIndex + i) % 12;
              const variationPercent = 0.05 * (Math.random() * 2 - 1); // -5% to +5% random variation

              predictionsData.push({
                month: months[monthIndex],
                actual: null,
                predicted: predictedTotal * (1 + variationPercent * i),
              });
            }

            setCategoryData(
              categoryChartData.length > 0 ? categoryChartData : []
            );
            setMonthlyData(
              monthlyExpenseData.length > 0 ? monthlyExpenseData : []
            );
            setPredictedData(predictionsData);

            // Only turn off demo data if we actually have some real data
            if (categoryChartData.length > 0 || monthlyExpenseData.length > 0) {
              setShowDemoData(false);
            }
          } catch (err) {
            console.error("Error processing API data:", err);
            // Keep using demo data if there's an error processing the API response
          }
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // Demo data for fallback
  const demoMonthlyExpenses = [
    { name: "Jan", amount: 4500 },
    { name: "Feb", amount: 3800 },
    { name: "Mar", amount: 5200 },
    { name: "Apr", amount: 4900 },
    { name: "May", amount: 6300 },
    { name: "Jun", amount: 5100 },
  ];

  const demoCategoryData = [
    { name: "Utilities", value: 3500 },
    { name: "Rent", value: 12000 },
    { name: "Supplies", value: 4200 },
    { name: "Marketing", value: 2800 },
    { name: "Salaries", value: 18000 },
    { name: "Other", value: 1500 },
  ];

  const demoAnomalyData = [
    { date: "2023-06-01", amount: 350, isAnomaly: false },
    { date: "2023-06-08", amount: 420, isAnomaly: false },
    { date: "2023-06-15", amount: 380, isAnomaly: false },
    { date: "2023-06-22", amount: 950, isAnomaly: true },
    { date: "2023-06-29", amount: 410, isAnomaly: false },
    { date: "2023-07-06", amount: 380, isAnomaly: false },
  ];

  const demoPredictedData = [
    { month: "Jul", actual: 5200, predicted: 5200 },
    { month: "Aug", actual: 5800, predicted: 5800 },
    { month: "Sep", actual: null, predicted: 6200 },
    { month: "Oct", actual: null, predicted: 6700 },
    { month: "Nov", actual: null, predicted: 7100 },
    { month: "Dec", actual: null, predicted: 6500 },
  ];

  // Generate and download PDF report
  const generatePdfReport = async () => {
    setGeneratingPdf(true);
    try {
      // Create a new jsPDF instance
      const { jsPDF } = await import("jspdf");
      const { autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.text("Expense Analytics Report", 14, 15);

      // Add date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

      if (!showDemoData && analyticsData) {
        // Add overview section
        doc.setFontSize(14);
        doc.text("Overview", 14, 30);

        if (analyticsData.recommendations?.overview) {
          const overview = analyticsData.recommendations.overview;
          doc.setFontSize(10);
          doc.text(
            `Total Spending: ₹${overview.total_spending?.toFixed(2) || 0}`,
            14,
            38
          );
          doc.text(
            `Average Transaction: ₹${overview.average_transaction?.toFixed(2) || 0}`,
            14,
            45
          );
        }

        // Add anomaly detection
        doc.setFontSize(14);
        doc.text("Anomaly Detection", 14, 60);

        if (analyticsData.transaction_analysis?.anomalies?.length > 0) {
          const anomalies = analyticsData.transaction_analysis.anomalies;

          const anomalyTableData = anomalies.map((anomaly) => [
            new Date(anomaly.timestamp).toLocaleDateString(),
            `₹${anomaly.amount.toFixed(2)}`,
            anomaly.reason || "Unusual spending",
          ]);

          autoTable(doc, {
            startY: 65,
            head: [["Date", "Amount", "Reason"]],
            body: anomalyTableData,
          });
        } else {
          doc.setFontSize(10);
          doc.text("No anomalies detected", 14, 65);
        }

        // Add category breakdown
        const currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 80;
        doc.setFontSize(14);
        doc.text("Expense Categories", 14, currentY);

        if (analyticsData.recommendations?.category_analysis) {
          const categories = analyticsData.recommendations.category_analysis;

          const categoryTableData = Object.entries(categories).map(
            ([name, details]) => [
              name,
              `₹${details.total_spent?.toFixed(2) || 0}`,
              `${details.percentage_of_total?.toFixed(1) || 0}%`,
            ]
          );

          autoTable(doc, {
            startY: currentY + 5,
            head: [["Category", "Amount", "% of Total"]],
            body: categoryTableData,
          });
        }

        // Add recommendations
        const recY = doc.lastAutoTable
          ? doc.lastAutoTable.finalY + 10
          : currentY + 30;
        doc.setFontSize(14);
        doc.text("Recommendations", 14, recY);

        if (analyticsData.recommendations?.budget_suggestions?.length > 0) {
          const suggestions = analyticsData.recommendations.budget_suggestions;

          const suggestionsTableData = suggestions.map((suggestion) => [
            suggestion.category,
            `₹${suggestion.current_monthly?.toFixed(2) || 0}`,
            `₹${suggestion.suggested_monthly?.toFixed(2) || 0}`,
            `₹${suggestion.potential_savings?.toFixed(2) || 0}`,
          ]);

          autoTable(doc, {
            startY: recY + 5,
            head: [
              ["Category", "Current Monthly", "Suggested", "Potential Savings"],
            ],
            body: suggestionsTableData,
          });
        } else {
          doc.setFontSize(10);
          doc.text("No specific recommendations available", 14, recY + 5);
        }
      } else {
        // Use demo data
        // Category data
        doc.setFontSize(14);
        doc.text("Expense Categories", 14, 30);

        const categoryData = demoCategoryData.map((cat) => [
          cat.name,
          `₹${cat.value.toFixed(2)}`,
          `${((cat.value / demoCategoryData.reduce((sum, c) => sum + c.value, 0)) * 100).toFixed(1)}%`,
        ]);

        autoTable(doc, {
          startY: 35,
          head: [["Category", "Amount", "% of Total"]],
          body: categoryData,
        });

        // Monthly data
        const monthlyY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 80;
        doc.setFontSize(14);
        doc.text("Monthly Expenses", 14, monthlyY);

        const monthlyData = demoMonthlyExpenses.map((month) => [
          month.name,
          `₹${month.amount.toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: monthlyY + 5,
          head: [["Month", "Amount"]],
          body: monthlyData,
        });

        // Anomaly data
        const anomalyY = doc.lastAutoTable
          ? doc.lastAutoTable.finalY + 10
          : monthlyY + 50;
        doc.setFontSize(14);
        doc.text("Expense Anomalies", 14, anomalyY);

        const anomalyData = demoAnomalyData
          .filter((a) => a.isAnomaly)
          .map((anomaly) => [
            anomaly.date,
            `₹${anomaly.amount.toFixed(2)}`,
            "Unusual spending pattern",
          ]);

        if (anomalyData.length > 0) {
          autoTable(doc, {
            startY: anomalyY + 5,
            head: [["Date", "Amount", "Reason"]],
            body: anomalyData,
          });
        } else {
          doc.setFontSize(10);
          doc.text("No anomalies detected", 14, anomalyY + 5);
        }
      }

      // Footer
      doc.setFontSize(10);
      doc.text("Generated by Thikana Portal", 14, 280);

      // Save the PDF
      doc.save("expense-analytics-report.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Expense Analytics</h2>
        <div className="flex items-center gap-4">
          {showDemoData && (
            <Badge variant="secondary" className="px-3 py-1">
              Demo Data
            </Badge>
          )}
          <Button
            onClick={generatePdfReport}
            disabled={generatingPdf}
            className="flex items-center gap-2"
          >
            {generatingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {generatingPdf ? "Generating..." : "Download Report"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Expenses Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={showDemoData ? demoMonthlyExpenses : monthlyData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value}`, "Amount"]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Expense by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={showDemoData ? demoCategoryData : categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(showDemoData ? demoCategoryData : categoryData).map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value}`, "Amount"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="anomalies">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Anomaly Detection
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Predictions
          </TabsTrigger>
          <TabsTrigger
            value="recommendations"
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Recommendations
          </TabsTrigger>
        </TabsList>

        {/* Anomaly Detection */}
        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Anomaly Detection</CardTitle>
              <CardDescription>
                Unusual spending patterns that may require attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={showDemoData ? demoAnomalyData : anomalyData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value}`, "Amount"]} />
                    <Legend />
                    <Bar dataKey="amount">
                      {(showDemoData ? demoAnomalyData : anomalyData).map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isAnomaly ? "#ff4d4f" : "#8884d8"}
                          />
                        )
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {!showDemoData &&
              analyticsData &&
              analyticsData.transaction_analysis &&
              analyticsData.transaction_analysis.anomalies &&
              analyticsData.transaction_analysis.anomalies.length > 0 ? (
                <div className="mt-6 border rounded-lg p-4 bg-amber-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">
                        Anomaly Detected
                      </h4>
                      <p className="text-sm text-amber-700 mt-1">
                        {analyticsData.transaction_analysis.anomalies.map(
                          (anomaly, i) => (
                            <span key={i}>
                              Unusually high expense of ₹
                              {anomaly.amount.toFixed(2)} detected on{" "}
                              {new Date(anomaly.timestamp).toLocaleDateString()}
                              .{anomaly.reason && ` Reason: ${anomaly.reason}.`}
                              {i <
                              analyticsData.transaction_analysis.anomalies
                                .length -
                                1
                                ? " "
                                : ""}
                            </span>
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : showDemoData ? (
                <div className="mt-6 border rounded-lg p-4 bg-amber-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">
                        Anomaly Detected
                      </h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Unusually high expense of ₹950 detected on June 22,
                        2023. This is 2.3x higher than your average spending
                        pattern.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 border rounded-lg p-4 bg-green-50">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">
                        No Anomalies Detected
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Your spending patterns appear to be consistent. No
                        unusual transactions detected.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!showDemoData &&
                analyticsData &&
                analyticsData.transaction_analysis &&
                analyticsData.transaction_analysis.statistics && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h4 className="font-medium">Transaction Statistics</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Average Transaction: ₹
                      {analyticsData.transaction_analysis.statistics.average_transaction.toFixed(
                        2
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      Standard Deviation: ₹
                      {analyticsData.transaction_analysis.statistics.standard_deviation.toFixed(
                        2
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      Total Transactions:{" "}
                      {analyticsData.transaction_analysis.summary &&
                        analyticsData.transaction_analysis.summary
                          .total_transactions}
                    </p>
                    <p className="text-sm text-gray-500">
                      Anomaly Percentage:{" "}
                      {analyticsData.transaction_analysis.summary &&
                        analyticsData.transaction_analysis.summary
                          .anomaly_percentage}
                      %
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Insights</CardTitle>
              <CardDescription>
                Key trends and patterns in your business expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {!showDemoData &&
                analyticsData &&
                analyticsData.spending_insights ? (
                  <>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Peak Spending Times</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Your peak spending typically occurs on{" "}
                            {analyticsData.spending_insights
                              .spending_patterns &&
                              analyticsData.spending_insights.spending_patterns
                                .peak_spending_times &&
                              analyticsData.spending_insights.spending_patterns
                                .peak_spending_times.day_of_week}
                            s around{" "}
                            {analyticsData.spending_insights
                              .spending_patterns &&
                              analyticsData.spending_insights.spending_patterns
                                .peak_spending_times &&
                              analyticsData.spending_insights.spending_patterns
                                .peak_spending_times.hour_of_day}
                            :00.
                          </p>
                        </div>
                      </div>
                    </div>

                    {analyticsData.spending_insights.category_analysis &&
                      Object.entries(
                        analyticsData.spending_insights.category_analysis
                      ).map(([category, data], index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <BarChart3 className="h-5 w-5 text-purple-500 mt-0.5" />
                            <div>
                              <h4 className="font-medium">
                                {category} Spending
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                Accounts for{" "}
                                {data.percentage_of_total.toFixed(1)}% of your
                                total expenses. Average transaction: ₹
                                {data.average_transaction.toFixed(2)}.
                                {data.trend !== "stable" &&
                                  ` Trend: ${data.trend}.`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                    {analyticsData.spending_insights.behavioral_insights &&
                      analyticsData.spending_insights.behavioral_insights
                        .spending_velocity && (
                        <div className="border rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                              <h4 className="font-medium">Spending Velocity</h4>
                              <p className="text-sm text-gray-500 mt-1">
                                Your average daily spend is ₹
                                {analyticsData.spending_insights.behavioral_insights.spending_velocity.average_daily_spend.toFixed(
                                  2
                                )}
                                . Overall trend:{" "}
                                {
                                  analyticsData.spending_insights
                                    .behavioral_insights.spending_velocity.trend
                                }
                                .
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                  </>
                ) : (
                  <>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">
                            Highest Expense Category
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Salaries account for 42% of your total expenses.
                            This is 15% higher than the average for businesses
                            in your category.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <TrendingDown className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Expense Reduction</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Your utility expenses decreased by 12% compared to
                            last month, indicating improved efficiency.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <BarChart3 className="h-5 w-5 text-purple-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Seasonal Pattern</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Marketing expenses tend to increase in May. Consider
                            planning your budget accordingly for the upcoming
                            season.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Predictions</CardTitle>
              <CardDescription>
                AI-powered forecasts for your future expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={showDemoData ? demoPredictedData : predictedData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value}`, "Amount"]} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 6 }}
                      activeDot={{ r: 8 }}
                      name="Actual Expense"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#82ca9d"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={{ r: 6 }}
                      name="Predicted Expense"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 border rounded-lg p-4 bg-blue-50">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">
                      Prediction Summary
                    </h4>
                    {!showDemoData &&
                    analyticsData &&
                    analyticsData.future_predictions &&
                    analyticsData.future_predictions.insights ? (
                      <p className="text-sm text-blue-700 mt-1">
                        Based on your historical spending patterns, we expect
                        your future expenses to follow similar trends.
                        {analyticsData.future_predictions.insights.categories &&
                          Object.entries(
                            analyticsData.future_predictions.insights.categories
                          ).map(([category, data], index) => (
                            <span key={index}>
                              {index === 0 ? " " : " "}
                              {category} spending typically peaks on{" "}
                              {data.peak_spending_day}s with an average of ₹
                              {data.average_spend.toFixed(2)}.
                            </span>
                          ))}
                      </p>
                    ) : (
                      <p className="text-sm text-blue-700 mt-1">
                        Based on historical patterns, we predict your expenses
                        will increase by approximately 25% over the next 4
                        months, reaching a peak in November before declining in
                        December.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {!showDemoData &&
                analyticsData &&
                analyticsData.future_predictions &&
                analyticsData.future_predictions.saving_tips && (
                  <div className="mt-4 space-y-4">
                    <h4 className="font-medium">Saving Tips</h4>
                    {Object.entries(
                      analyticsData.future_predictions.saving_tips
                    ).map(([category, tip], index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 bg-green-50"
                      >
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <span className="font-medium text-green-800">
                              {category}:
                            </span>
                            <span className="text-sm text-green-700 ml-1">
                              {tip}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Optimization Recommendations</CardTitle>
              <CardDescription>
                AI-generated recommendations to optimize your business expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {!showDemoData &&
                analyticsData &&
                analyticsData.recommendations ? (
                  <>
                    {analyticsData.recommendations.budget_suggestions &&
                    analyticsData.recommendations.budget_suggestions.length >
                      0 ? (
                      analyticsData.recommendations.budget_suggestions.map(
                        (suggestion, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-4 bg-green-50"
                          >
                            <div className="flex items-start gap-3">
                              <Activity className="h-5 w-5 text-green-600 mt-0.5" />
                              <div>
                                <h4 className="font-medium text-green-800">
                                  {suggestion.category} Budget Optimization
                                </h4>
                                <p className="text-sm text-green-700 mt-1">
                                  Current monthly: ₹
                                  {suggestion.current_monthly.toFixed(2)}.
                                  Suggested monthly: ₹
                                  {suggestion.suggested_monthly.toFixed(2)}.
                                  Potential savings: ₹
                                  {suggestion.potential_savings.toFixed(2)}.
                                  Priority: {suggestion.priority}.
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium">Not Enough Data</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              We need more transaction data to provide
                              personalized cost optimization recommendations.
                              Continue recording your transactions for better
                              insights.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {analyticsData.recommendations.timing_optimization &&
                      analyticsData.recommendations.timing_optimization.length >
                        0 && (
                        <div className="border rounded-lg p-4 bg-blue-50">
                          <h4 className="font-medium text-blue-800 mb-3">
                            Timing Optimization
                          </h4>
                          <div className="space-y-3">
                            {analyticsData.recommendations.timing_optimization.map(
                              (tip, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm text-blue-700">
                                      <span className="font-medium">
                                        {tip.category}:
                                      </span>{" "}
                                      Best day is {tip.best_day} around{" "}
                                      {tip.best_hour}.
                                      {tip.average_savings_potential > 0 &&
                                        ` Potential savings: ₹${tip.average_savings_potential.toFixed(
                                          2
                                        )}.`}
                                    </p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {analyticsData.recommendations.category_specific_tips &&
                      analyticsData.recommendations.category_specific_tips
                        .length > 0 && (
                        <div className="border rounded-lg p-4 bg-amber-50">
                          <h4 className="font-medium text-amber-800 mb-3">
                            Category Specific Tips
                          </h4>
                          <div className="space-y-3">
                            {analyticsData.recommendations.category_specific_tips.map(
                              (tipGroup, index) => (
                                <div key={index}>
                                  <h5 className="font-medium text-amber-700">
                                    {tipGroup.category}
                                  </h5>
                                  <ul className="list-disc pl-5 mt-1 space-y-1">
                                    {tipGroup.tips.map((tip, tipIndex) => (
                                      <li
                                        key={tipIndex}
                                        className="text-sm text-amber-700"
                                      >
                                        {tip}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </>
                ) : (
                  <>
                    <div className="border rounded-lg p-4 bg-green-50">
                      <div className="flex items-start gap-3">
                        <Activity className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800">
                            Supply Chain Optimization
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            Your supplies expenses have increased by 18% in the
                            last quarter. Consider negotiating with suppliers or
                            finding alternative vendors to reduce costs.
                            Potential savings: ₹12,000/year.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-green-50">
                      <div className="flex items-start gap-3">
                        <Activity className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800">
                            Energy Efficiency
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            Your utility bills are 22% higher than similar
                            businesses. Consider energy-efficient equipment or
                            practices to reduce these costs. Potential savings:
                            ₹8,500/year.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-green-50">
                      <div className="flex items-start gap-3">
                        <Activity className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800">
                            Marketing Efficiency
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            Your marketing expenses show uneven returns.
                            Consider reallocating budget from print ads to
                            digital marketing for better ROI. Potential increase
                            in efficiency: 35%.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
