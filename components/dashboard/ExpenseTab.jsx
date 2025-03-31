"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2 } from "lucide-react";
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
  Timestamp,
  orderBy,
} from "firebase/firestore";
import toast from "react-hot-toast";

// Predefined expense categories
const expenseCategories = [
  "Utilities",
  "Rent",
  "Supplies",
  "Marketing",
  "Salaries",
  "Miscellaneous",
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

export default function ExpenseTab() {
  const [loading, setLoading] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [date, setDate] = useState(getCurrentDateTime().split(" ")[0]); // Default to current date
  const [time, setTime] = useState(getCurrentDateTime().split(" ")[1]); // Default to current time

  // Fetch expenses
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const transactionsRef = collection(
        db,
        "transactions",
        user.uid,
        "user_transactions"
      );
      const q = query(transactionsRef, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);

      const expensesData = [];
      querySnapshot.forEach((doc) => {
        expensesData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setExpenses(expensesData);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You must be logged in to add expenses");
        return;
      }

      if (!expenseName || !amount || !category || !date || !time) {
        toast.error("Please fill in all fields");
        return;
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      // Create reference to user's transactions subcollection
      const transactionsRef = collection(
        db,
        "transactions",
        user.uid,
        "user_transactions"
      );

      // Combine date and time into timestamp string
      const timestamp = `${date} ${time}`;

      // Add expense document with string timestamp
      await addDoc(transactionsRef, {
        name: expenseName,
        amount: numericAmount,
        category,
        timestamp,
        type: "expense", // To differentiate from income if needed later
      });

      // Reset form
      setExpenseName("");
      setAmount("");
      setCategory("");
      setDate(getCurrentDateTime().split(" ")[0]);
      setTime(getCurrentDateTime().split(" ")[1]);

      // Refresh expenses list
      fetchExpenses();

      toast.success("Expense added successfully");
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await deleteDoc(
        doc(db, "transactions", user.uid, "user_transactions", id)
      );

      toast.success("Expense deleted successfully");

      // Refresh expenses list
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="expense-name" className="text-sm font-medium">
                  Expense Name
                </label>
                <Input
                  id="expense-name"
                  placeholder="Enter expense name"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="expense-amount" className="text-sm font-medium">
                  Amount
                </label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="expense-category"
                  className="text-sm font-medium"
                >
                  Category
                </label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="expense-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="expense-date" className="text-sm font-medium">
                  Date
                </label>
                <Input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="expense-time" className="text-sm font-medium">
                  Time
                </label>
                <Input
                  id="expense-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Expense
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingExpenses ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No expenses recorded yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {expense.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.category}</Badge>
                    </TableCell>
                    <TableCell>{formatDateString(expense.timestamp)}</TableCell>
                    <TableCell className="text-right">
                      ₹{expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
