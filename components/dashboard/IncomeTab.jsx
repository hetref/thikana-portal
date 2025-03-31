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
  orderBy,
} from "firebase/firestore";
import toast from "react-hot-toast";

// Predefined income categories
const incomeCategories = [
  "Sales",
  "Services",
  "Investments",
  "Subscriptions",
  "Refunds",
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

export default function IncomeTab() {
  const [loading, setLoading] = useState(false);
  const [incomeName, setIncomeName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [incomes, setIncomes] = useState([]);
  const [loadingIncomes, setLoadingIncomes] = useState(true);
  const [date, setDate] = useState(getCurrentDateTime().split(" ")[0]); // Default to current date
  const [time, setTime] = useState(getCurrentDateTime().split(" ")[1]); // Default to current time

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
        incomesData.push({
          id: doc.id,
          ...doc.data(),
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
        toast.error("Please fill in all fields");
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
      });

      // Reset form
      setIncomeName("");
      setAmount("");
      setCategory("");
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Income</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="income-name" className="text-sm font-medium">
                  Income Name
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
                <label htmlFor="income-amount" className="text-sm font-medium">
                  Amount
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
              <div>
                <label
                  htmlFor="income-category"
                  className="text-sm font-medium"
                >
                  Category
                </label>
                <Select value={category} onValueChange={setCategory} required>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="income-date" className="text-sm font-medium">
                  Date
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
                <label htmlFor="income-time" className="text-sm font-medium">
                  Time
                </label>
                <Input
                  id="income-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Income
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Income</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingIncomes ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : incomes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No income recorded yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Income</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="font-medium">{income.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{income.category}</Badge>
                    </TableCell>
                    <TableCell>{formatDateString(income.timestamp)}</TableCell>
                    <TableCell className="text-right">
                      ₹{income.amount.toFixed(2)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
