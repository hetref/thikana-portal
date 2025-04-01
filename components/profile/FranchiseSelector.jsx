import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Building2,
  ChevronDown,
  Store,
  HomeIcon,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function FranchiseSelector() {
  const { user } = useAuth();
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [franchiseToDelete, setFranchiseToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Load franchises owned by this business
    const loadFranchises = async () => {
      try {
        setLoading(true);
        const franchisesQuery = query(
          collection(db, "businesses"),
          where("franchiseOwner", "==", user.uid)
        );
        const franchisesSnapshot = await getDocs(franchisesQuery);

        if (franchisesSnapshot.empty) {
          setFranchises([]);
          setLoading(false);
          return;
        }

        const franchisesList = franchisesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setFranchises(franchisesList);
      } catch (error) {
        console.error("Error loading franchises:", error);
        toast.error("Failed to load franchises");
      } finally {
        setLoading(false);
      }
    };

    loadFranchises();
  }, [user?.uid]);

  const handleSwitchFranchise = (franchiseId) => {
    if (franchiseId === "headquarters") {
      // Switch to main business profile
      sessionStorage.removeItem("selectedFranchiseId");
      toast.success("Switched to Headquarters");
    } else {
      // Switch to franchise profile
      sessionStorage.setItem("selectedFranchiseId", franchiseId);
      const franchise = franchises.find((f) => f.id === franchiseId);
      toast.success(`Switched to ${franchise?.businessName || "Franchise"}`);
    }

    // Refresh the page to show updated profile
    window.location.reload();
  };

  const prepareDeleteFranchise = (franchiseId) => {
    setFranchiseToDelete(franchiseId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteFranchise = async () => {
    if (!franchiseToDelete) return;

    try {
      // Delete franchise documents
      await deleteDoc(doc(db, "users", franchiseToDelete));
      await deleteDoc(doc(db, "businesses", franchiseToDelete));

      // Delete the user from Firebase Auth
      const response = await fetch(
        `/api/delete-franchise-user?userId=${franchiseToDelete}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete franchise user");
      }

      // Update the local state
      setFranchises(franchises.filter((f) => f.id !== franchiseToDelete));

      toast.success("Franchise deleted successfully");

      // If the deleted franchise was selected, switch back to headquarters
      const selectedFranchiseId = sessionStorage.getItem("selectedFranchiseId");
      if (selectedFranchiseId === franchiseToDelete) {
        sessionStorage.removeItem("selectedFranchiseId");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error deleting franchise:", error);
      toast.error("Failed to delete franchise");
    } finally {
      setFranchiseToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  // If no franchises, don't show the component
  if (franchises.length === 0) {
    return null;
  }

  // Dropdown menu for switching between franchises
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            {loading ? (
              "Loading..."
            ) : (
              <>
                Headquarters
                <Badge
                  variant="outline"
                  className="ml-2 bg-primary/10 text-primary font-normal text-xs"
                >
                  HQ
                </Badge>
              </>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Switch Business Profile</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Main business (Headquarters) */}
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleSwitchFranchise("headquarters")}
          >
            <HomeIcon className="h-4 w-4" />
            <span>Headquarters</span>
            <Badge className="ml-auto">Current</Badge>
          </DropdownMenuItem>

          {/* Franchises list */}
          {franchises.map((franchise) => (
            <DropdownMenuItem
              key={franchise.id}
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleSwitchFranchise(franchise.id)}
            >
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                <span>{franchise.businessName || "Franchise"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent dropdown menu from closing
                    prepareDeleteFranchise(franchise.id);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog for Deleting Franchise */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Franchise</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this franchise? This action cannot
              be undone and will remove the franchise administrator account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFranchise}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
