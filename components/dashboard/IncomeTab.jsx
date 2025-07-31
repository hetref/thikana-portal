"use client";
import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Upload,
  Download,
  ArrowRight,
  AlertCircle,
  Info,
  Edit2,
  Save,
  X,
  Check,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Loader from "@/components/Loader";

// Predefined income categories
const incomeCategories = [
  "Sales",
  "Services",
  "Investments",
  "Subscriptions",
  "Refunds",
  "Rent",
  "Other",
];

// Get current date and time in YYYY-MM-DD HH:MM:SS format
const getCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Format date string (YYYY-MM-DD HH:MM:SS) to readable format
const formatDateString = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString.replace(" ", "T"));
  return date.toLocaleDateString();
};

// Get payment method icon/name
const getPaymentMethodDisplay = (method) => {
  if (!method || method === "none") return "-";
  const methodMap = {
    card: "💳 Card",
    netbanking: "🏦 Net Banking",
    wallet: "📱 Wallet",
    upi: "📲 UPI",
    emi: "📅 EMI",
  };
  return methodMap[method] || method;
};

// Generate CSV template
const generateCsvTemplate = () => {
  const headers = [
    "name",
    "amount",
    "category",
    "description",
    "payment_method",
    "payment_id",
    "date",
    "time",
    "status",
  ];
  const sampleData = [
    "Monthly Subscription,1200,Subscriptions,Premium Plan Subscription,upi,pay_123456,2023-08-15,14:30:00,completed",
    "Product Sale,500,Sales,Widget Sale,card,,2023-08-16,10:15:00,pending",
    "Investment Return,2500,Investments,Stock Dividends,,,2023-08-17,09:00:00,completed",
    "Rent Payment,10000,Rent,Monthly rent from store,,rent_123,2023-08-20,09:30:00,completed",
  ];

  return [headers.join(",")].concat(sampleData).join("\n");
};

export default function IncomeTab() {
  const [loading, setLoading] = useState(false);
  const [incomeName, setIncomeName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [status, setStatus] = useState("completed");
  const [incomes, setIncomes] = useState([]);
  const [loadingIncomes, setLoadingIncomes] = useState(true);
  const [date, setDate] = useState(getCurrentDateTime().split(" ")[0]); // Default to current date
  const [time, setTime] = useState(getCurrentDateTime().split(" ")[1]); // Default to current time

  // For bulk upload
  const fileInputRef = useRef(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorRows, setErrorRows] = useState([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // For CSV editing
  const [editableData, setEditableData] = useState([]);
  const [showEditTable, setShowEditTable] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [savingData, setSavingData] = useState(false);

  // Fetch incomes
  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    setLoadingIncomes(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

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
        const data = doc.data();
        incomesData.push({
          id: doc.id,
          ...data,
          amount: data.amount !== undefined ? data.amount : 0,
        });
      });

      setIncomes(incomesData);
    } catch (error) {
      console.error("Error fetching incomes:", error);
      toast.error("Failed to load incomes");
    } finally {
      setLoadingIncomes(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You must be logged in to add income");
        return;
      }

      if (!incomeName || !amount || !category || !date || !time) {
        toast.error("Please fill in all required fields");
        return;
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      // Create reference to user's income subcollection
      const incomesRef = collection(
        db,
        "transactions",
        user.uid,
        "user_income"
      );

      // Combine date and time into timestamp string
      const timestamp = `${date} ${time}`;

      // Add income document with string timestamp
      await addDoc(incomesRef, {
        name: incomeName,
        amount: numericAmount,
        category,
        timestamp,
        type: "income",
        description: description || null,
        paymentMethod: paymentMethod || null,
        paymentId: paymentId || null,
        status: status || "completed",
      });

      // Reset form
      setIncomeName("");
      setDescription("");
      setAmount("");
      setCategory("");
      setPaymentMethod("");
      setPaymentId("");
      setStatus("completed");
      setDate(getCurrentDateTime().split(" ")[0]);
      setTime(getCurrentDateTime().split(" ")[1]);

      // Refresh incomes list
      fetchIncomes();

      toast.success("Income added successfully");
    } catch (error) {
      console.error("Error adding income:", error);
      toast.error("Failed to add income");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await deleteDoc(doc(db, "transactions", user.uid, "user_income", id));

      toast.success("Income deleted successfully");

      // Refresh incomes list
      fetchIncomes();
    } catch (error) {
      console.error("Error deleting income:", error);
      toast.error("Failed to delete income");
    }
  };

  // Handle CSV template download
  const handleDownloadTemplate = () => {
    const csvContent = generateCsvTemplate();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "income_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV file selection - modified to reset edit mode
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Please upload a valid CSV file");
        return;
      }
      setCsvFile(file);
      setShowEditTable(false); // Reset edit table when new file is selected
      parseCSV(file);
    }
  };

  // Modified parseCSV function
  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      // Handle different line endings (CRLF, LF)
      const rows = text.split(/\r?\n/);

      if (rows.length <= 1) {
        toast.error("CSV file appears to be empty or invalid");
        return;
      }

      // Parse headers (trim whitespace)
      const headers = rows[0].split(",").map((h) => h.trim());

      // Check if headers match expected format
      const requiredHeaders = ["name", "amount", "category"];
      const missingHeaders = requiredHeaders.filter(
        (h) => !headers.includes(h)
      );

      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(", ")}`);
        return;
      }

      // Parse data rows (limited preview)
      const preview = [];
      const errors = [];

      for (let i = 1; i < rows.length; i++) {
        if (rows[i].trim() === "") continue;

        // More robust CSV parsing logic
        const parsedRow = parseCSVRow(rows[i], headers);
        if (parsedRow) {
          // Basic validation
          const validationErrors = validateRow(parsedRow);

          if (validationErrors.length > 0) {
            errors.push({ row: i, data: parsedRow, errors: validationErrors });
          }

          preview.push(parsedRow);
        }
      }

      if (preview.length === 0) {
        toast.error("No data rows found in CSV file. Please check the format.");
        return;
      }

      setCsvPreview(preview);
      setEditableData(
        preview.map((row, index) => ({ ...row, id: `row-${index}` }))
      );
      setErrorRows(errors);

      if (errors.length > 0) {
        toast.error(
          `Found ${errors.length} rows with errors. Please check the preview.`
        );
      } else if (preview.length > 0) {
        setShowPreviewDialog(true);
        toast.success(
          `Found ${preview.length} valid income entries ready to upload`
        );
      }
    };
    reader.readAsText(file);
  };

  // Helper function to parse a CSV row more robustly
  const parseCSVRow = (row, headers) => {
    // Simple CSV parser that handles basic quoted values
    const values = [];
    let inQuotes = false;
    let currentValue = "";

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"' && (i === 0 || row[i - 1] !== "\\")) {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    // Add the last value
    values.push(currentValue.trim());

    // If there aren't enough values for the headers, return null
    if (values.length < headers.length) {
      return null;
    }

    // Map to object
    const rowObj = {};
    headers.forEach((header, index) => {
      if (index < values.length) {
        // Clean up quoted values
        let value = values[index];
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        rowObj[header] = value;
      } else {
        rowObj[header] = "";
      }
    });

    return rowObj;
  };

  // Validate a row of data
  const validateRow = (row) => {
    const validationErrors = [];

    // Required fields
    if (!row.name || row.name.trim() === "")
      validationErrors.push("Missing name");

    // Amount validation
    if (!row.amount || row.amount.trim() === "") {
      validationErrors.push("Missing amount");
    } else {
      const amount = parseFloat(row.amount);
      if (isNaN(amount) || amount <= 0)
        validationErrors.push("Invalid amount (must be a positive number)");
    }

    // Category validation
    if (!row.category || row.category.trim() === "") {
      validationErrors.push("Missing category");
    } else if (!incomeCategories.includes(row.category)) {
      validationErrors.push(
        `Invalid category '${row.category}' (must be one of: ${incomeCategories.join(", ")})`
      );
    }

    // Date validation if provided
    if (row.date && row.date.trim() !== "") {
      const datePattern =
        /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$|^\d{2}-\d{2}-\d{4}$/;
      if (!datePattern.test(row.date.trim())) {
        validationErrors.push(
          "Invalid date format (use YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY)"
        );
      }
    }

    return validationErrors;
  };

  // Function to handle cell value change
  const handleCellChange = (rowId, field, value) => {
    setEditableData((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  // Function to toggle row editing
  const toggleEditRow = (rowId) => {
    setEditingRow(editingRow === rowId ? null : rowId);
  };

  // Function to delete a row
  const handleDeleteRow = (rowId) => {
    setEditableData((prev) => prev.filter((row) => row.id !== rowId));
    toast.success("Row removed from import");
  };

  // Function to add a new empty row
  const handleAddRow = () => {
    const newRow = {
      id: `row-${Date.now()}`,
      name: "",
      amount: "",
      category: "",
      description: "",
      payment_method: "",
      payment_id: "",
      date: "",
      time: "",
      status: "completed",
    };

    setEditableData((prev) => [...prev, newRow]);
    setEditingRow(newRow.id);
  };

  // New function to save all edited data
  const handleSaveAllData = async () => {
    // Validate all rows
    const rowsWithErrors = [];

    editableData.forEach((row, index) => {
      const errors = validateRow(row);
      if (errors.length > 0) {
        rowsWithErrors.push({ index, errors });
      }
    });

    if (rowsWithErrors.length > 0) {
      toast.error(
        `Found ${rowsWithErrors.length} rows with errors. Please fix them before saving.`
      );
      return;
    }

    // Save to database
    setSavingData(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You must be logged in to add income");
        setSavingData(false);
        return;
      }

      const batch = writeBatch(db);
      const incomesRef = collection(
        db,
        "transactions",
        user.uid,
        "user_income"
      );

      editableData.forEach((rowData) => {
        // Format date properly
        let timestamp = getCurrentDateTime();
        if (rowData.date) {
          // Handle different date formats
          let formattedDate = rowData.date;

          // Convert DD/MM/YYYY to YYYY-MM-DD
          if (rowData.date.includes("/")) {
            const parts = rowData.date.split("/");
            if (parts.length === 3) {
              formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          }
          // Convert DD-MM-YYYY to YYYY-MM-DD
          else if (rowData.date.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const parts = rowData.date.split("-");
            formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }

          const time = rowData.time || "00:00:00";
          timestamp = `${formattedDate} ${time}`;
        }

        // Create income document
        const incomeDoc = {
          name: rowData.name,
          amount: parseFloat(rowData.amount),
          category: rowData.category,
          timestamp: timestamp,
          type: "income",
          description: rowData.description || null,
          paymentMethod: rowData.payment_method || null,
          paymentId: rowData.payment_id || null,
          status: rowData.status || "completed",
        };

        // Add to batch
        const docRef = doc(incomesRef);
        batch.set(docRef, incomeDoc);
      });

      // Commit the batch
      await batch.commit();
      toast.success(`Successfully added ${editableData.length} income entries`);

      // Reset and reload
      fileInputRef.current.value = "";
      setCsvFile(null);
      setCsvPreview([]);
      setEditableData([]);
      setShowEditTable(false);
      fetchIncomes();
    } catch (error) {
      console.error("Error saving edited data:", error);
      toast.error(`Failed to save data: ${error.message}`);
    } finally {
      setSavingData(false);
    }
  };

  // Function to show editable table
  const handleShowEditTable = () => {
    setShowPreviewDialog(false);
    setShowEditTable(true);
  };

  // Modified handleUploadCSV to use edit table workflow
  const handleUploadCSV = async () => {
    if (!csvFile) {
      toast.error("Please select a CSV file first");
      return;
    }

    if (errorRows.length > 0) {
      toast.error("Please fix errors in your CSV file before proceeding");
      return;
    }

    // Show edit table instead of direct upload
    setShowPreviewDialog(false);
    setShowEditTable(true);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="add-single">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add-single">Add Single Income</TabsTrigger>
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="add-single">
          <Card>
            <CardHeader>
              <CardTitle>Add New Income</CardTitle>
              <CardDescription>
                Add a new income entry with details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="income-name"
                      className="text-sm font-medium"
                    >
                      Income Name *
                    </label>
                    <Input
                      id="income-name"
                      placeholder="Enter income name"
                      value={incomeName}
                      onChange={(e) => setIncomeName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="income-amount"
                      className="text-sm font-medium"
                    >
                      Amount *
                    </label>
                    <Input
                      id="income-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="income-category"
                      className="text-sm font-medium"
                    >
                      Category *
                    </label>
                    <Select
                      value={category}
                      onValueChange={setCategory}
                      required
                    >
                      <SelectTrigger id="income-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {incomeCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label
                      htmlFor="income-description"
                      className="text-sm font-medium"
                    >
                      Description
                    </label>
                    <Input
                      id="income-description"
                      placeholder="Enter description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="payment-method"
                      className="text-sm font-medium"
                    >
                      Payment Method
                    </label>
                    <Select
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                    >
                      <SelectTrigger id="payment-method">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="netbanking">Net Banking</SelectItem>
                        <SelectItem value="wallet">Wallet</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="emi">EMI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="payment-id" className="text-sm font-medium">
                      Payment ID
                    </label>
                    <Input
                      id="payment-id"
                      placeholder="Enter payment ID"
                      value={paymentId}
                      onChange={(e) => setPaymentId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="income-date"
                      className="text-sm font-medium"
                    >
                      Date *
                    </label>
                    <Input
                      id="income-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="income-time"
                      className="text-sm font-medium"
                    >
                      Time *
                    </label>
                    <Input
                      id="income-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="income-status"
                      className="text-sm font-medium"
                    >
                      Status
                    </label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger id="income-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={loading}>
                  {loading && <Loader/>}
                  Add Income
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-upload">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Incomes</CardTitle>
              <CardDescription>
                Upload multiple income entries using a CSV file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>CSV Format Instructions</AlertTitle>
                  <AlertDescription>
                    Your CSV file should include the following columns: name,
                    amount, category (required), and optionally: description,
                    payment_method, payment_id, date, time, status.
                    <br />
                    <br />
                    <strong>Valid Categories:</strong>{" "}
                    {incomeCategories.join(", ")}
                    <br />
                    <strong>Valid Statuses:</strong> completed, pending, failed,
                    refunded
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col md:flex-row gap-4">
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>

                  <div className="flex-1">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </div>
                </div>

                {csvPreview.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">
                        Preview ({csvPreview.length} rows)
                      </h4>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowPreviewDialog(true)}
                      >
                        View Full Preview
                      </Button>
                    </div>

                    {errorRows.length > 0 && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Validation Errors</AlertTitle>
                        <AlertDescription>
                          Found {errorRows.length} rows with errors. Please fix
                          these before uploading.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                <Button
                  onClick={handleUploadCSV}
                  disabled={!csvFile || isUploading || errorRows.length > 0}
                  className="w-full"
                >
                  {isUploading ? (
                    <Loader/>
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload and Process
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CSV Preview Dialog - modified to add Edit button */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>CSV Preview</DialogTitle>
            <DialogDescription>
              Review your data before editing and uploading
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvPreview.map((row, index) => {
                  const hasError = errorRows.some((e) => e.data === row);
                  const errorInfo = errorRows.find((e) => e.data === row);

                  return (
                    <TableRow
                      key={index}
                      className={hasError ? "bg-red-50" : ""}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.name || "-"}</TableCell>
                      <TableCell>{row.amount || "-"}</TableCell>
                      <TableCell>{row.category || "-"}</TableCell>
                      <TableCell>{row.description || "-"}</TableCell>
                      <TableCell>{row.date || "-"}</TableCell>
                      <TableCell>
                        {hasError ? (
                          <Badge variant="destructive">
                            Error: {errorInfo.errors.join(", ")}
                          </Badge>
                        ) : (
                          <Badge
                            variant={
                              row.status === "completed"
                                ? "success"
                                : row.status === "pending"
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {row.status || "completed"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowPreviewDialog(false)}
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handleShowEditTable}
              disabled={errorRows.length > 0}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Before Upload
            </Button>
            <Button
              onClick={handleUploadCSV}
              disabled={errorRows.length > 0 || isUploading}
            >
              {errorRows.length > 0
                ? "Fix Errors First"
                : "Proceed with Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editable Table */}
      {showEditTable && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Edit Income Entries</span>
              <Button variant="outline" size="sm" onClick={handleAddRow}>
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </CardTitle>
            <CardDescription>
              Review and edit your income entries before saving
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Actions</TableHead>
                    <TableHead>Name*</TableHead>
                    <TableHead>Amount*</TableHead>
                    <TableHead>Category*</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editableData.map((row) => (
                    <TableRow
                      key={row.id}
                      className={editingRow === row.id ? "bg-muted/50" : ""}
                    >
                      <TableCell className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleEditRow(row.id)}
                        >
                          {editingRow === row.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Edit className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Input
                            value={row.name || ""}
                            onChange={(e) =>
                              handleCellChange(row.id, "name", e.target.value)
                            }
                            className="w-full"
                          />
                        ) : (
                          row.name || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={row.amount || ""}
                            onChange={(e) =>
                              handleCellChange(row.id, "amount", e.target.value)
                            }
                            className="w-full"
                          />
                        ) : (
                          row.amount || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Select
                            value={row.category || ""}
                            onValueChange={(value) =>
                              handleCellChange(row.id, "category", value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {incomeCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">{row.category || "-"}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Input
                            value={row.description || ""}
                            onChange={(e) =>
                              handleCellChange(
                                row.id,
                                "description",
                                e.target.value
                              )
                            }
                            className="w-full"
                          />
                        ) : (
                          row.description || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Select
                            value={row.payment_method || "none"}
                            onValueChange={(value) =>
                              handleCellChange(row.id, "payment_method", value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="netbanking">
                                Net Banking
                              </SelectItem>
                              <SelectItem value="wallet">Wallet</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="emi">EMI</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          getPaymentMethodDisplay(row.payment_method)
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Input
                            type="date"
                            value={row.date || ""}
                            onChange={(e) =>
                              handleCellChange(row.id, "date", e.target.value)
                            }
                            className="w-full"
                          />
                        ) : (
                          row.date || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Select
                            value={row.status || "completed"}
                            onValueChange={(value) =>
                              handleCellChange(row.id, "status", value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="completed">
                                Completed
                              </SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                              <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={
                              row.status === "completed"
                                ? "success"
                                : row.status === "pending"
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {row.status || "completed"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditTable(false);
                setEditableData([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAllData}
              disabled={savingData || editableData.length === 0}
            >
              {savingData ? (
                <>
                  <Loader/>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Entries
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Income</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingIncomes ? (
            <div className="flex justify-center py-8">
              <Loader/>
            </div>
          ) : incomes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No income recorded yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Income</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomes.map((income) => (
                    <TableRow key={income.id}>
                      <TableCell className="font-medium">
                        {income.name}
                      </TableCell>
                      <TableCell>{income.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{income.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {formatDateString(income.timestamp)}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodDisplay(income.paymentMethod)}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {income.paymentId || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            income.status === "completed"
                              ? "success"
                              : income.status === "pending"
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {income.status || "completed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ₹
                        {income.amount !== undefined && income.amount !== null
                          ? income.amount.toFixed(2)
                          : "0.00"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(income.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
