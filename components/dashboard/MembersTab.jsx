"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Plus,
  Search,
  Trash,
  Edit,
  UserPlus,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";

export default function MembersTab() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });
  const [addingMember, setAddingMember] = useState(false);
  const [updatingMember, setUpdatingMember] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const membersRef = collection(db, `businesses/${user.uid}/members`);
      const membersSnapshot = await getDocs(membersRef);

      const membersData = [];
      for (const memberDoc of membersSnapshot.docs) {
        const memberData = memberDoc.data();
        // Get user details from users collection
        const userRef = doc(db, "users", memberDoc.id);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          membersData.push({
            id: memberDoc.id,
            ...memberData,
            ...userDoc.data(),
          });
        }
      }

      setMembers(membersData);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      setAddingMember(true);
      const user = auth.currentUser;
      if (!user) return;

      // Check if email is valid
      if (!newMember.email || !newMember.email.includes("@")) {
        return toast.error("Please enter a valid email address");
      }

      // Check if name is provided
      if (!newMember.name.trim()) {
        return toast.error("Please enter a name");
      }

      // Create new member through API
      const response = await fetch("/api/create-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newMember.email,
          name: newMember.name,
          phone: newMember.phone || "",
          role: newMember.role || "Staff",
          businessId: user.uid,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create member");
      }

      const { memberId } = await response.json();

      toast.success("Member added successfully");
      setIsAddDialogOpen(false);
      setNewMember({
        name: "",
        email: "",
        phone: "",
        role: "",
      });
      fetchMembers();
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error(error.message || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    try {
      setUpdatingMember(true);
      const user = auth.currentUser;
      if (!user || !selectedMember) return;

      // Update in members subcollection
      const memberRef = doc(
        db,
        `businesses/${user.uid}/members`,
        selectedMember.id
      );
      await updateDoc(memberRef, {
        name: selectedMember.name,
        phone: selectedMember.phone || "",
        role: selectedMember.role || "Staff",
        updatedAt: serverTimestamp(),
      });

      // Update in users collection
      const userRef = doc(db, "users", selectedMember.id);
      await updateDoc(userRef, {
        name: selectedMember.name,
        phone: selectedMember.phone || "",
        updatedAt: serverTimestamp(),
      });

      toast.success("Member updated successfully");
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
    } finally {
      setUpdatingMember(false);
    }
  };

  const handleDeleteMember = async () => {
    try {
      setDeletingMember(true);
      const user = auth.currentUser;
      if (!user || !selectedMember) return;

      // Delete through API to handle both auth and Firestore
      const response = await fetch("/api/delete-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: selectedMember.id,
          businessId: user.uid,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete member");
      }

      toast.success("Member deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Failed to delete member");
    } finally {
      setDeletingMember(false);
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery)
  );

  const handleEditClick = (member) => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (member) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage your team members and their access.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search members..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader/>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No members found. Add your first team member.</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No members match your search.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={member.photoURL}
                              alt={member.name}
                            />
                            <AvatarFallback>
                              {member.name
                                ? member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {member.role || "Staff"}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.phone || "-"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditClick(member)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(member)}
                              className="text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Create a new team member with access to your business account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={newMember.phone}
                  onChange={(e) =>
                    setNewMember({ ...newMember, phone: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  placeholder="Staff"
                  value={newMember.role}
                  onChange={(e) =>
                    setNewMember({ ...newMember, role: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addingMember}>
                {addingMember && (
                  <Loader/>
                )}
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update the team member's information.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <form onSubmit={handleUpdateMember}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    placeholder="John Doe"
                    value={selectedMember.name}
                    onChange={(e) =>
                      setSelectedMember({
                        ...selectedMember,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    disabled
                    value={selectedMember.email}
                  />
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    placeholder="+91 98765 43210"
                    value={selectedMember.phone}
                    onChange={(e) =>
                      setSelectedMember({
                        ...selectedMember,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Input
                    id="edit-role"
                    placeholder="Staff"
                    value={selectedMember.role}
                    onChange={(e) =>
                      setSelectedMember({
                        ...selectedMember,
                        role: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updatingMember}>
                  {updatingMember && (
                    <Loader/>
                  )}
                  Update Member
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Member Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this team member? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="py-4">
              <div className="flex items-center gap-4 p-4 rounded-md border mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={selectedMember.photoURL}
                    alt={selectedMember.name}
                  />
                  <AvatarFallback>
                    {selectedMember.name
                      ? selectedMember.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedMember.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember.email}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteMember}
                  disabled={deletingMember}
                >
                  {deletingMember && (
                    <Loader/>
                  )}
                  Delete Member
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
