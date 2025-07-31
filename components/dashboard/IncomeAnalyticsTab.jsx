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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Activity,
  BarChart3,
  Download,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
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
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import Loader from "@/components/Loader";

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
  return date ? date.toLocaleString("default", { month: "short" }) : "";
};

// Get year from date string
const getYearFromDate = (dateString) => {
  if (!dateString) return "";
  const date = parseDate(dateString);
  return date ? date.getFullYear() : "";
};

// Function to detect anomalies in income data
const detectAnomalies = (incomes) => {
  if (!incomes || incomes.length < 5) return []; // Need enough data for statistical significance

  // Calculate average daily income
  const dailyIncomes = {};
  incomes.forEach((income) => {
    if (!income.timestamp) return;

    const date = parseDate(income.timestamp);
    if (!date) return;

    const dateStr = date.toISOString().split("T")[0];
    if (!dailyIncomes[dateStr]) {
      dailyIncomes[dateStr] = 0;
    }
    dailyIncomes[dateStr] += income.amount;
  });

  // Convert to array for calculations
  const dailyValues = Object.values(dailyIncomes);

  // Calculate mean and standard deviation
  const mean =
    dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length;
  const variance =
    dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    dailyValues.length;
  const stdDev = Math.sqrt(variance);

  // Define threshold for anomaly (e.g., 2 standard deviations)
  const anomalyThreshold = mean + 2 * stdDev;

  // Identify anomalies
  const anomalies = [];
  Object.entries(dailyIncomes).forEach(([date, amount]) => {
    if (amount > anomalyThreshold) {
      // Find all incomes on this day to get details
      const dayIncomes = incomes.filter((income) => {
        if (!income.timestamp) return false;
        const incomeDate = parseDate(income.timestamp);
        return incomeDate && incomeDate.toISOString().split("T")[0] === date;
      });

      // Get the largest transaction or aggregate if needed
      let reason = "Unusually high income amount";
      if (dayIncomes.length === 1) {
        reason = `Large ${dayIncomes[0].category} transaction`;
      } else if (dayIncomes.length > 1) {
        // Find most common category
        const categoryCounts = {};
        dayIncomes.forEach((inc) => {
          if (!categoryCounts[inc.category]) categoryCounts[inc.category] = 0;
          categoryCounts[inc.category]++;
        });

        const topCategory = Object.entries(categoryCounts).sort(
          (a, b) => b[1] - a[1]
        )[0][0];

        reason = `Multiple ${topCategory} transactions on same day`;
      }

      anomalies.push({
        date,
        amount,
        timestamp: date + " 00:00:00", // Use midnight as default time for daily aggregate
        reason,
        isAnomaly: true,
      });
    }
  });

  return anomalies;
};

// Group incomes by month and year
const groupIncomesByMonth = (incomes) => {
  const grouped = {};

  incomes.forEach((income) => {
    if (!income.timestamp) return;

    const date = parseDate(income.timestamp);
    if (!date) return;

    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    const key = `${month} ${year}`;

    if (!grouped[key]) {
      grouped[key] = {
        month,
        year,
        amount: 0,
        count: 0,
        categories: {},
      };
    }

    grouped[key].amount += income.amount;
    grouped[key].count += 1;

    // Group by category
    if (!grouped[key].categories[income.category]) {
      grouped[key].categories[income.category] = {
        amount: 0,
        count: 0,
      };
    }

    grouped[key].categories[income.category].amount += income.amount;
    grouped[key].categories[income.category].count += 1;
  });

  return Object.values(grouped).sort((a, b) => {
    // Sort by year and month
    if (a.year !== b.year) return a.year - b.year;

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
    return months.indexOf(a.month) - months.indexOf(b.month);
  });
};

export default function IncomeAnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [anomalyData, setAnomalyData] = useState([]);
  const [showDemoData, setShowDemoData] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    const fetchIncomes = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch income transaction data
        const incomesRef = collection(
          db,
          "transactions",
          user.uid,
          "user_income"
        );
        const q = query(incomesRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        const incomesData = [];
        querySnapshot.forEach((doc) => {
          incomesData.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        setIncomes(incomesData);

        // Also fetch analytics data from API
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(
          `${apiUrl}/analysis/full-analysis-income/${user.uid}`
        );

        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);

          // Process real analytics data if available
          if (data && !data.error) {
            try {
              // Process category data for pie chart
              const categories = data.recommendations?.category_analysis || {};
              const categoryChartData = Object.entries(categories).map(
                ([name, details]) => ({
                  name,
                  value: details.total_income || 0,
                })
              );

              // Process monthly data from income patterns
              const incomePatterns =
                data.recommendations?.income_patterns?.by_month || {};
              const monthlyChartData = Object.entries(incomePatterns).map(
                ([month, details]) => ({
                  name: month,
                  amount: details.total_income || 0,
                })
              );

              // Process anomaly data
              const anomalies = data.income_analysis?.anomalies || [];
              const formattedAnomalies = anomalies.map((anomaly) => {
                const date = anomaly.timestamp
                  ? new Date(anomaly.timestamp).toISOString().split("T")[0]
                  : "";
                return {
                  date,
                  amount: anomaly.amount || 0,
                  isAnomaly: true,
                  reason: anomaly.reason || "Unusual income pattern",
                };
              });

              // Format regular income for anomaly chart
              const dailyIncomePatterns =
                data.recommendations?.income_patterns?.by_day || {};
              const dailyIncome = Object.entries(dailyIncomePatterns).map(
                ([day, details]) => ({
                  date: day,
                  amount: details.average_income || 0,
                  isAnomaly: false,
                })
              );

              // Combine anomalies with regular income
              const allAnomalyData = [
                ...dailyIncome,
                ...formattedAnomalies,
              ].sort((a, b) => new Date(a.date) - new Date(b.date));

              // Process real data if we have enough
              if (categoryChartData.length > 0 || monthlyChartData.length > 0) {
                setCategoryData(categoryChartData);
                setMonthlyData(monthlyChartData);
                setAnomalyData(allAnomalyData);
                setShowDemoData(false);
              }
            } catch (err) {
              console.error("Error processing API data:", err);
            }
          }
        } else {
          console.error("Failed to fetch analytics data:", response.statusText);
        }

        // Process data for charts if we have real data but no API data
        if (incomesData.length > 0 && showDemoData) {
          // Group by month
          const monthlyIncomes = groupIncomesByMonth(incomesData);

          // Format for chart
          const monthlyChartData = monthlyIncomes.map((data) => ({
            name: data.month,
            amount: data.amount,
          }));

          // Process category data
          const categoriesMap = {};
          incomesData.forEach((income) => {
            if (!categoriesMap[income.category]) {
              categoriesMap[income.category] = 0;
            }
            categoriesMap[income.category] += income.amount;
          });

          const categoryChartData = Object.entries(categoriesMap).map(
            ([name, value]) => ({
              name,
              value,
            })
          );

          // Process yearly data
          const yearlyMap = {};
          incomesData.forEach((income) => {
            if (!income.timestamp) return;
            const year = getYearFromDate(income.timestamp);
            if (!year) return;

            if (!yearlyMap[year]) {
              yearlyMap[year] = 0;
            }
            yearlyMap[year] += income.amount;
          });

          const yearlyChartData = Object.entries(yearlyMap)
            .map(([year, amount]) => ({
              name: year,
              amount,
            }))
            .sort((a, b) => a.name - b.name);

          // Process anomaly data
          const anomalies = detectAnomalies(incomesData);

          // Create chart data for anomalies
          const anomalyChartData = [];

          // Add regular transactions (use daily aggregates)
          const dailyIncome = {};
          incomesData.forEach((income) => {
            if (!income.timestamp) return;
            const date = parseDate(income.timestamp);
            if (!date) return;

            const dateStr = date.toISOString().split("T")[0];
            if (!dailyIncome[dateStr]) {
              dailyIncome[dateStr] = 0;
            }
            dailyIncome[dateStr] += income.amount;
          });

          // Convert to chart data format
          Object.entries(dailyIncome).forEach(([date, amount]) => {
            anomalyChartData.push({
              date,
              amount,
              isAnomaly: false,
            });
          });

          // Add anomalies
          anomalies.forEach((anomaly) => {
            // Replace existing entry with anomaly flagged entry
            const existingIndex = anomalyChartData.findIndex(
              (item) => item.date === anomaly.date
            );
            if (existingIndex >= 0) {
              anomalyChartData[existingIndex] = {
                date: anomaly.date,
                amount: anomaly.amount,
                isAnomaly: true,
                reason: anomaly.reason,
              };
            }
          });

          // Sort by date
          anomalyChartData.sort((a, b) => new Date(a.date) - new Date(b.date));

          setMonthlyData(monthlyChartData);
          setCategoryData(categoryChartData);
          setYearlyData(yearlyChartData);
          setAnomalyData(anomalyChartData);
          setShowDemoData(false);
        }
      } catch (error) {
        console.error("Error fetching income data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIncomes();
  }, []);

  // Demo data
  const demoMonthlyIncomes = [
    { name: "Jan", amount: 5500 },
    { name: "Feb", amount: 4800 },
    { name: "Mar", amount: 6200 },
    { name: "Apr", amount: 5900 },
    { name: "May", amount: 7300 },
    { name: "Jun", amount: 6100 },
  ];

  const demoCategoryData = [
    { name: "Sales", value: 15000 },
    { name: "Services", value: 22000 },
    { name: "Investments", value: 8000 },
    { name: "Subscriptions", value: 12000 },
    { name: "Refunds", value: 3000 },
    { name: "Other", value: 2500 },
  ];

  const demoYearlyData = [
    { name: "2021", amount: 48000 },
    { name: "2022", amount: 62000 },
    { name: "2023", amount: 75000 },
    { name: "2024", amount: 42000 }, // Partial year
  ];

  const demoAnomalyData = [
    { date: "2023-06-01", amount: 1200, isAnomaly: false },
    { date: "2023-06-08", amount: 1350, isAnomaly: false },
    { date: "2023-06-15", amount: 1450, isAnomaly: false },
    {
      date: "2023-06-22",
      amount: 3800,
      isAnomaly: true,
      reason: "Unusually high Services income",
    },
    { date: "2023-06-29", amount: 1300, isAnomaly: false },
    { date: "2023-07-06", amount: 1250, isAnomaly: false },
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
      doc.text("Income Analytics Report", 14, 15);

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
            `Total Income: ₹${overview.total_income?.toFixed(2) || 0}`,
            14,
            38
          );
          doc.text(
            `Average Income: ₹${overview.average_income?.toFixed(2) || 0}`,
            14,
            45
          );
          doc.text(`Income Count: ${overview.income_count || 0}`, 14, 52);
          doc.text(
            `Unique Categories: ${overview.unique_categories || 0}`,
            14,
            59
          );
        }

        // Add anomaly detection
        doc.setFontSize(14);
        doc.text("Anomaly Detection", 14, 70);

        if (analyticsData.income_analysis?.anomalies?.length > 0) {
          const anomalies = analyticsData.income_analysis.anomalies;

          const anomalyTableData = anomalies.map((anomaly) => [
            new Date(anomaly.timestamp).toLocaleDateString(),
            `₹${anomaly.amount.toFixed(2)}`,
            anomaly.reason || "Unusual income",
          ]);

          autoTable(doc, {
            startY: 75,
            head: [["Date", "Amount", "Reason"]],
            body: anomalyTableData,
          });
        } else {
          doc.setFontSize(10);
          doc.text("No income anomalies detected", 14, 75);
        }

        // Add category breakdown
        const currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 85;
        doc.setFontSize(14);
        doc.text("Income Categories", 14, currentY);

        if (analyticsData.recommendations?.category_analysis) {
          const categories = analyticsData.recommendations.category_analysis;

          const categoryTableData = Object.entries(categories).map(
            ([name, details]) => [
              name,
              `₹${details.total_income?.toFixed(2) || 0}`,
              `${details.percentage_of_total?.toFixed(1) || 0}%`,
              details.status || "-",
            ]
          );

          autoTable(doc, {
            startY: currentY + 5,
            head: [["Category", "Amount", "% of Total", "Status"]],
            body: categoryTableData,
          });
        }

        // Add income patterns
        const patternsY = doc.lastAutoTable
          ? doc.lastAutoTable.finalY + 10
          : currentY + 30;
        doc.setFontSize(14);
        doc.text("Income Patterns", 14, patternsY);

        if (analyticsData.recommendations?.income_patterns?.by_month) {
          const monthlyPatterns =
            analyticsData.recommendations.income_patterns.by_month;

          const monthlyTableData = Object.entries(monthlyPatterns).map(
            ([month, details]) => [
              month,
              `₹${details.total_income?.toFixed(2) || 0}`,
              `₹${details.average_income?.toFixed(2) || 0}`,
              details.income_count || 0,
            ]
          );

          autoTable(doc, {
            startY: patternsY + 5,
            head: [["Month", "Total Income", "Average Income", "Count"]],
            body: monthlyTableData,
          });
        }

        // Add recommendations
        const recY = doc.lastAutoTable
          ? doc.lastAutoTable.finalY + 10
          : patternsY + 40;
        doc.setFontSize(14);
        doc.text("Growth Opportunities", 14, recY);

        if (
          analyticsData.recommendations?.recommendations?.growth_opportunities
            ?.length > 0
        ) {
          const opportunities =
            analyticsData.recommendations.recommendations.growth_opportunities;

          const growthTableData = opportunities.map((opp) => [
            opp.category,
            `₹${opp.current_monthly?.toFixed(2) || 0}`,
            `₹${opp.growth_target?.toFixed(2) || 0}`,
            opp.strategy || "-",
            opp.impact || "medium",
          ]);

          autoTable(doc, {
            startY: recY + 5,
            head: [["Category", "Current", "Target", "Strategy", "Impact"]],
            body: growthTableData,
          });
        } else {
          doc.setFontSize(10);
          doc.text("No specific growth opportunities available", 14, recY + 5);
        }

        // Add predictions
        const predY = doc.lastAutoTable
          ? doc.lastAutoTable.finalY + 10
          : recY + 40;
        doc.setFontSize(14);
        doc.text("Future Predictions", 14, predY);

        if (analyticsData.future_predictions?.predictions?.categories) {
          const predictions =
            analyticsData.future_predictions.predictions.categories;

          const predictionTableData = Object.entries(predictions).map(
            ([category, data]) => [
              category,
              `₹${data.predicted_amount?.toFixed(2) || 0}`,
              `₹${data.range?.min?.toFixed(2) || 0} - ₹${data.range?.max?.toFixed(2) || 0}`,
              data.confidence || "medium",
            ]
          );

          autoTable(doc, {
            startY: predY + 5,
            head: [["Category", "Predicted Amount", "Range", "Confidence"]],
            body: predictionTableData,
          });
        }
      } else {
        // Use demo data
        // Category data
        doc.setFontSize(14);
        doc.text("Income Categories", 14, 30);

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
        doc.text("Monthly Income", 14, monthlyY);

        const monthlyData = demoMonthlyIncomes.map((month) => [
          month.name,
          `₹${month.amount.toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: monthlyY + 5,
          head: [["Month", "Amount"]],
          body: monthlyData,
        });

        // Yearly data
        const yearlyY = doc.lastAutoTable
          ? doc.lastAutoTable.finalY + 10
          : monthlyY + 50;
        doc.setFontSize(14);
        doc.text("Yearly Income", 14, yearlyY);

        const yearlyData = demoYearlyData.map((year) => [
          year.name,
          `₹${year.amount.toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: yearlyY + 5,
          head: [["Year", "Amount"]],
          body: yearlyData,
        });

        // Anomaly data
        const anomalyY = doc.lastAutoTable
          ? doc.lastAutoTable.finalY + 10
          : yearlyY + 50;
        doc.setFontSize(14);
        doc.text("Income Anomalies", 14, anomalyY);

        const anomalyData = demoAnomalyData
          .filter((a) => a.isAnomaly)
          .map((anomaly) => [
            anomaly.date,
            `₹${anomaly.amount.toFixed(2)}`,
            "Unusually high income",
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
      doc.save("income-analytics-report.pdf");
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
        <Loader/>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Income Analytics</h2>
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
              <Loader/>
            ) : (
              <Download className="h-4 w-4" />
            )}
            {generatingPdf ? "Generating..." : "Download Report"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Income Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Income</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={showDemoData ? demoMonthlyIncomes : monthlyData}
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
                  stroke="#4CAF50"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Income by Category</CardTitle>
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

      {/* Yearly Income */}
      <Card>
        <CardHeader>
          <CardTitle>Yearly Income</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={showDemoData ? demoYearlyData : yearlyData}
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
              <Bar dataKey="amount" fill="#4CAF50" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
              <CardTitle>Income Anomaly Detection</CardTitle>
              <CardDescription>
                Unusual income patterns that may require attention
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
                            fill={entry.isAnomaly ? "#4caf50" : "#2196f3"}
                          />
                        )
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {!showDemoData &&
              analyticsData &&
              analyticsData.income_analysis &&
              analyticsData.income_analysis.anomalies &&
              analyticsData.income_analysis.anomalies.length > 0 ? (
                <div className="mt-6 border rounded-lg p-4 bg-green-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">
                        Income Anomaly Detected
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        {analyticsData.income_analysis.anomalies.map(
                          (anomaly, i, arr) => (
                            <span key={i}>
                              Unusually high income of ₹
                              {anomaly.amount.toFixed(2)} detected on{" "}
                              {new Date(anomaly.timestamp).toLocaleDateString()}
                              .{anomaly.reason && ` ${anomaly.reason}.`}
                              {i < arr.length - 1 ? " " : ""}
                            </span>
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : showDemoData ? (
                <div className="mt-6 border rounded-lg p-4 bg-green-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">
                        Income Anomaly Detected
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Unusually high income of ₹3,800 detected on June 22,
                        2023. This is 2.5x higher than your average daily
                        income. This could represent a significant business
                        opportunity.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">
                        No Unusual Income Patterns
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Your income patterns appear to be consistent. No unusual
                        transactions detected.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!showDemoData &&
                analyticsData &&
                analyticsData.income_analysis &&
                analyticsData.income_analysis.statistics && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h4 className="font-medium">Income Statistics</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Average Income: ₹
                      {analyticsData.income_analysis.statistics.average_income.toFixed(
                        2
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      Standard Deviation: ₹
                      {analyticsData.income_analysis.statistics.standard_deviation.toFixed(
                        2
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      Anomaly Threshold: ₹
                      {analyticsData.income_analysis.statistics.anomaly_threshold.toFixed(
                        2
                      )}
                    </p>
                    {analyticsData.income_analysis.summary && (
                      <>
                        <p className="text-sm text-gray-500">
                          Total Income Records:{" "}
                          {
                            analyticsData.income_analysis.summary
                              .total_income_records
                          }
                        </p>
                        <p className="text-sm text-gray-500">
                          Anomaly Percentage:{" "}
                          {analyticsData.income_analysis.summary.anomaly_percentage.toFixed(
                            2
                          )}
                          %
                        </p>
                      </>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Insights</CardTitle>
              <CardDescription>
                Key trends and patterns in your business income
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {!showDemoData &&
                analyticsData &&
                analyticsData.income_insights &&
                analyticsData.income_insights.category_analysis ? (
                  Object.entries(
                    analyticsData.income_insights.category_analysis
                  ).map(([category, details], index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <BarChart3 className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">{category} Income</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Accounts for{" "}
                            {details.percentage_of_total.toFixed(1)}% of your
                            total income. Average transaction: ₹
                            {details.average_transaction.toFixed(2)}.
                            {details.trend !== "stable" &&
                              ` Trend: ${details.trend}.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Highest Income Source</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Services account for 35% of your total income. This
                            is 12% higher than the average for businesses in
                            your category.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Income Growth</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Your subscription income increased by 18% compared
                            to last month, indicating strong customer retention.
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
                            Sales income tends to peak in May. Consider planning
                            your marketing campaigns accordingly for the
                            upcoming season.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!showDemoData &&
                  analyticsData &&
                  analyticsData.income_insights &&
                  analyticsData.income_insights.income_patterns &&
                  analyticsData.income_insights.income_patterns
                    .peak_income_times && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-purple-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Peak Income Times</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Your peak income typically occurs on{" "}
                            {
                              analyticsData.income_insights.income_patterns
                                .peak_income_times.day_of_week
                            }
                            s around{" "}
                            {
                              analyticsData.income_insights.income_patterns
                                .peak_income_times.hour_of_day
                            }
                            :00.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {!showDemoData &&
                  analyticsData &&
                  analyticsData.income_insights &&
                  analyticsData.income_insights.behavioral_insights &&
                  analyticsData.income_insights.behavioral_insights
                    .income_velocity && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Income Velocity</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Your average daily income is ₹
                            {analyticsData.income_insights.behavioral_insights.income_velocity.average_daily_spend.toFixed(
                              2
                            )}
                            . Overall trend:{" "}
                            {
                              analyticsData.income_insights.behavioral_insights
                                .income_velocity.trend
                            }
                            .
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Predictions</CardTitle>
              <CardDescription>
                AI-powered forecasts for your future income
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { month: "Jul", actual: 6500, predicted: 6500 },
                      { month: "Aug", actual: 7200, predicted: 7200 },
                      { month: "Sep", actual: null, predicted: 7800 },
                      { month: "Oct", actual: null, predicted: 8200 },
                      { month: "Nov", actual: null, predicted: 8600 },
                      { month: "Dec", actual: null, predicted: 9000 },
                    ]}
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
                      stroke="#4CAF50"
                      strokeWidth={2}
                      dot={{ r: 6 }}
                      activeDot={{ r: 8 }}
                      name="Actual Income"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#2196F3"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={{ r: 6 }}
                      name="Predicted Income"
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
                    analyticsData.future_predictions ? (
                      <p className="text-sm text-blue-700 mt-1">
                        Based on your historical patterns, we predict your
                        future total income to be approximately ₹
                        {analyticsData.future_predictions.predictions.total_predicted.toFixed(
                          2
                        )}
                        .
                        {analyticsData.future_predictions.insights &&
                          analyticsData.future_predictions.insights
                            .categories &&
                          Object.entries(
                            analyticsData.future_predictions.insights.categories
                          ).map(([category, data], index) => (
                            <span key={index}>
                              {" "}
                              {category} income typically peaks on{" "}
                              {data.peak_income_day}s with an average of ₹
                              {data.average_income.toFixed(2)}.
                            </span>
                          ))}
                      </p>
                    ) : (
                      <p className="text-sm text-blue-700 mt-1">
                        Based on historical patterns, we predict your income
                        will increase by approximately 38% over the next 4
                        months, reaching a peak in December. This growth is
                        primarily driven by Services and Subscription revenue
                        streams.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {!showDemoData &&
                analyticsData &&
                analyticsData.future_predictions &&
                analyticsData.future_predictions.growth_tips && (
                  <div className="mt-4 space-y-4">
                    <h4 className="font-medium">Growth Tips</h4>
                    {Object.entries(
                      analyticsData.future_predictions.growth_tips
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

              {!showDemoData &&
                analyticsData &&
                analyticsData.future_predictions &&
                analyticsData.future_predictions.predictions &&
                analyticsData.future_predictions.predictions.categories && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h4 className="font-medium">Category Predictions</h4>
                    {Object.entries(
                      analyticsData.future_predictions.predictions.categories
                    ).map(([category, prediction], index) => (
                      <div key={index} className="mt-2">
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">{category}:</span> ₹
                          {prediction.predicted_amount.toFixed(2)}
                          (Range: ₹{prediction.range.min.toFixed(2)} - ₹
                          {prediction.range.max.toFixed(2)})
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {prediction.confidence} confidence
                          </span>
                        </p>
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
              <CardTitle>Income Optimization Recommendations</CardTitle>
              <CardDescription>
                AI-generated recommendations to optimize your business income
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {!showDemoData &&
                analyticsData &&
                analyticsData.recommendations ? (
                  <>
                    {analyticsData.recommendations.overview && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium">Income Overview</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Total Income: ₹
                          {analyticsData.recommendations.overview.total_income.toFixed(
                            2
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          Average Income: ₹
                          {analyticsData.recommendations.overview.average_income.toFixed(
                            2
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          Income Count:{" "}
                          {analyticsData.recommendations.overview.income_count}
                        </p>
                        <p className="text-sm text-gray-500">
                          Unique Categories:{" "}
                          {
                            analyticsData.recommendations.overview
                              .unique_categories
                          }
                        </p>
                      </div>
                    )}

                    {analyticsData.recommendations.recommendations &&
                      analyticsData.recommendations.recommendations
                        .income_diversification &&
                      analyticsData.recommendations.recommendations
                        .income_diversification.length > 0 && (
                        <div className="border rounded-lg p-4 bg-green-50">
                          <div className="flex items-start gap-3">
                            <Activity className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-green-800">
                                Income Diversification
                              </h4>
                              {analyticsData.recommendations.recommendations.income_diversification.map(
                                (rec, idx) => (
                                  <div key={idx} className="mt-2">
                                    <p className="text-sm text-green-700">
                                      <span className="font-medium">
                                        Insight:
                                      </span>{" "}
                                      {rec.insight}
                                    </p>
                                    <p className="text-sm text-green-700">
                                      <span className="font-medium">
                                        Recommendation:
                                      </span>{" "}
                                      {rec.recommendation}
                                    </p>
                                    <p className="text-sm text-green-700">
                                      <span className="font-medium">
                                        Current Primary Sources:
                                      </span>{" "}
                                      {rec.current_primary_sources.join(", ")}
                                    </p>
                                    <p className="text-sm text-green-700">
                                      <span className="font-medium">
                                        Priority:
                                      </span>{" "}
                                      {rec.priority}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    {analyticsData.recommendations.recommendations &&
                      analyticsData.recommendations.recommendations
                        .growth_opportunities &&
                      analyticsData.recommendations.recommendations
                        .growth_opportunities.length > 0 && (
                        <div className="border rounded-lg p-4 bg-green-50">
                          <div className="flex items-start gap-3">
                            <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-green-800">
                                Growth Opportunities
                              </h4>
                              {analyticsData.recommendations.recommendations.growth_opportunities.map(
                                (opp, idx) => (
                                  <div key={idx} className="mt-2">
                                    <p className="text-sm text-green-700">
                                      <span className="font-medium">
                                        {opp.category}:
                                      </span>{" "}
                                      {opp.strategy}
                                    </p>
                                    <p className="text-sm text-green-700">
                                      Current: ₹{opp.current_monthly.toFixed(2)}{" "}
                                      → Target: ₹{opp.growth_target.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-green-700">
                                      <span className="font-medium">
                                        Impact:
                                      </span>{" "}
                                      {opp.impact}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    {analyticsData.recommendations.recommendations &&
                      analyticsData.recommendations.recommendations
                        .category_specific_tips &&
                      analyticsData.recommendations.recommendations
                        .category_specific_tips.length > 0 && (
                        <div className="border rounded-lg p-4 bg-blue-50">
                          <h4 className="font-medium text-blue-800 mb-3">
                            Category Specific Tips
                          </h4>
                          {analyticsData.recommendations.recommendations.category_specific_tips.map(
                            (tipGroup, idx) => (
                              <div key={idx} className="mt-2">
                                <h5 className="font-medium text-blue-700">
                                  {tipGroup.category}
                                </h5>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                  {tipGroup.tips.map((tip, tipIdx) => (
                                    <li
                                      key={tipIdx}
                                      className="text-sm text-blue-700"
                                    >
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                                <p className="text-xs text-blue-600 mt-1">
                                  Estimated impact: {tipGroup.estimated_impact}
                                </p>
                              </div>
                            )
                          )}
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
                            Subscription Model Optimization
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            Your subscription retention rate is 72%. Consider
                            implementing a loyalty program to increase this to
                            85%. Potential increase in annual revenue: ₹24,000.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-green-50">
                      <div className="flex items-start gap-3">
                        <Activity className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800">
                            Service Pricing Strategy
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            Your service pricing is 15% below market average.
                            Consider a tiered pricing model to increase average
                            revenue per customer. Potential increase in monthly
                            revenue: ₹18,000.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-green-50">
                      <div className="flex items-start gap-3">
                        <Activity className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800">
                            Cross-Selling Opportunities
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            Only 25% of your customers purchase multiple
                            services. Implement bundled packages to increase
                            this to 40%. Potential increase in annual revenue:
                            ₹36,000.
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
