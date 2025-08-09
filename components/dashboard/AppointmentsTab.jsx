"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import { Info, BellRing } from "lucide-react";
import { sendNotificationToUser } from "@/lib/notifications";

export default function AppointmentsTab() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [businessId, setBusinessId] = useState(null);
  const [businessName, setBusinessName] = useState("Your Business");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [consumerDetails, setConsumerDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [confirmReminderOpen, setConfirmReminderOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);

  const fetchAppointments = async (bizId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`/api/appointments?businessId=${encodeURIComponent(bizId)}` , {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error((await res.json()).message || "Failed to load appointments");
      }
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const u = userDoc.data();
          const bizId = u.role === "member" && u.businessId ? u.businessId : user.uid;
          setBusinessId(bizId);
          // Fetch business info for name
          const bizDoc = await getDoc(doc(db, "users", bizId));
          if (bizDoc.exists()) {
            setBusinessName(bizDoc.data().businessName || bizDoc.data().name || "Your Business");
          }
          await fetchAppointments(bizId);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    init();
  }, []);

  const updateStatus = async (appointment, status) => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId, appointmentId: appointment.id, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update status");
      }
      toast.success("Appointment updated");
      // Ask to send reminder after status change
      setReminderTarget({ ...appointment, status });
      setConfirmReminderOpen(true);
      // Refresh list in the background
      fetchAppointments(businessId);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to update status");
    }
  };

  const openDetails = async (appt) => {
    try {
      setSelectedAppt(appt);
      setDetailsOpen(true);
      setDetailsLoading(true);
      if (appt?.consumerId) {
        const snap = await getDoc(doc(db, "users", appt.consumerId));
        setConsumerDetails(snap.exists() ? snap.data() : null);
      } else {
        setConsumerDetails(null);
      }
    } catch (e) {
      console.error(e);
      setConsumerDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const canRemind = (status) => status === "pending" || status === "confirmed";

  const sendReminder = async (appt) => {
    if (!appt?.consumerId) {
      toast.error("No consumer to notify");
      return;
    }
    try {
      setSendingReminder(true);
      const when = `${appt.date} ${appt.startTime} - ${appt.endTime}`;
      const title = `Appointment Reminder - ${businessName}`;
      const consumerName = appt.consumerName || "there";
      const message = `Hi ${consumerName}, this is a friendly reminder for your appointment with ${businessName} on ${when}. Please be on time. If your plans change, update your booking or reply in-app. Thank you!`;
      await sendNotificationToUser(appt.consumerId, {
        title,
        message,
        type: "appointment-reminder",
        sender: businessName,
        whatsapp: true,
        email: true,
      });
      toast.success("Reminder sent");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to send reminder");
    } finally {
      setSendingReminder(false);
      setConfirmReminderOpen(false);
      setReminderTarget(null);
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-200 text-gray-700";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No appointments yet.</div>
        ) : (
          <div className="w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Consumer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id} className="cursor-pointer hover:bg-accent/30" onClick={() => openDetails(it)}>
                    <TableCell>{it.date}</TableCell>
                    <TableCell>
                      {it.startTime} - {it.endTime}
                    </TableCell>
                    <TableCell>{it.consumerName || it.consumerId}</TableCell>
                    <TableCell>
                      <div className="text-sm">{it.consumerPhone || "-"}</div>
                      <div className="text-xs text-muted-foreground">{it.consumerEmail || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(it.status)}>{it.status}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {canRemind(it.status) && (
                          <Button
                            variant="outline"
                            size="icon"
                            title="Send reminder"
                            onClick={() => {
                              setReminderTarget(it);
                              setConfirmReminderOpen(true);
                            }}
                          >
                            <BellRing className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="icon" onClick={() => openDetails(it)} title="View details">
                          <Info className="h-4 w-4" />
                        </Button>
                        <Select onValueChange={(v) => updateStatus(it, v)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Change status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>Full appointment and consumer information</DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="flex justify-center py-6"><Loader /></div>
          ) : selectedAppt ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-medium">{selectedAppt.date}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Start Time</div>
                  <div className="font-medium">{selectedAppt.startTime}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">End Time</div>
                  <div className="font-medium">{selectedAppt.endTime}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>
                    <Badge className={statusColor(selectedAppt.status)}>{selectedAppt.status}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Appointment ID</div>
                  <div className="font-mono text-sm">{selectedAppt.id}</div>
                </div>
              </div>
              {selectedAppt.description ? (
                <div>
                  <div className="text-sm text-muted-foreground">Notes</div>
                  <div className="text-sm">{selectedAppt.description}</div>
                </div>
              ) : null}

              <div className="pt-2 border-t" />

              <div className="space-y-2">
                <div className="font-semibold">Consumer</div>
                {consumerDetails ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Name</div>
                      <div className="font-medium">{consumerDetails.businessName || consumerDetails.name || selectedAppt.consumerName || "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Email</div>
                      <div className="font-medium">{consumerDetails.email || selectedAppt.consumerEmail || "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Phone</div>
                      <div className="font-medium">{consumerDetails.phone || selectedAppt.consumerPhone || "-"}</div>
                    </div>
                    {consumerDetails.bio ? (
                      <div className="col-span-2">
                        <div className="text-muted-foreground">Bio</div>
                        <div className="font-medium whitespace-pre-wrap">{consumerDetails.bio}</div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No additional consumer details available.</div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReminderOpen} onOpenChange={setConfirmReminderOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send appointment reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              {reminderTarget
                ? `Send a reminder to the consumer about the appointment on ${reminderTarget.date} from ${reminderTarget.startTime} to ${reminderTarget.endTime}.`
                : "Send a reminder to the consumer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingReminder}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reminderTarget && sendReminder(reminderTarget)}
              disabled={sendingReminder}
            >
              {sendingReminder ? "Sending..." : "Send reminder"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
} 