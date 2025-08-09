import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

// Helpers
function parseTimeToMinutes(hhmm) {
  const [h, m] = (hhmm || "").split(":");
  const hours = parseInt(h, 10);
  const mins = parseInt(m, 10);
  if (Number.isNaN(hours) || Number.isNaN(mins)) return null;
  return hours * 60 + mins;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function getDayIndexFromISO(dateStr) {
  // dateStr is YYYY-MM-DD
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  // JS: 0=Sun..6=Sat ; Our schema: 0=Mon..6=Sun
  const jsDay = dt.getDay();
  // Convert to Monday=0..Sunday=6
  return (jsDay + 6) % 7;
}

async function verifyAndGetUser(request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const idToken = authHeader.substring(7);
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded; // contains uid, etc.
  } catch (e) {
    return null;
  }
}

export async function POST(request) {
  try {
    const decoded = await verifyAndGetUser(request);
    if (!decoded) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      businessId,
      date, // YYYY-MM-DD
      startTime, // HH:MM
      endTime, // HH:MM
      description = "",
    } = await request.json();

    if (!businessId || !date || !startTime || !endTime) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const businessUserSnap = await adminDb.collection("users").doc(businessId).get();
    if (!businessUserSnap.exists) {
      return NextResponse.json({ message: "Business not found" }, { status: 404 });
    }
    const businessUser = businessUserSnap.data();

    if (!businessUser.acceptAppointments) {
      return NextResponse.json({ message: "Business is not accepting appointments" }, { status: 400 });
    }

    const slotMinutes = typeof businessUser.appointmentSlotMinutes === "number" ? businessUser.appointmentSlotMinutes : 30;
    const dayIndex = getDayIndexFromISO(date);

    const ops = Array.isArray(businessUser.operationalHours) ? businessUser.operationalHours : [];
    if (!ops[dayIndex] || !ops[dayIndex].enabled) {
      return NextResponse.json({ message: "Business is closed on selected date" }, { status: 400 });
    }

    const dayInfo = ops[dayIndex];
    const openMins = parseTimeToMinutes(dayInfo.openTime);
    const closeMins = parseTimeToMinutes(dayInfo.closeTime);
    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);

    if ([openMins, closeMins, startMins, endMins].some((v) => v == null)) {
      return NextResponse.json({ message: "Invalid time format" }, { status: 400 });
    }

    if (startMins < openMins || endMins > closeMins || endMins <= startMins) {
      return NextResponse.json({ message: "Selected time out of business hours" }, { status: 400 });
    }

    const duration = endMins - startMins;
    if (duration < slotMinutes || duration % slotMinutes !== 0) {
      return NextResponse.json({ message: "Appointment length must be multiples of slot duration" }, { status: 400 });
    }

    // Conflict check
    const apptRef = adminDb.collection("businesses").doc(businessId).collection("appointments");
    const sameDaySnap = await apptRef.where("date", "==", date).get();
    const conflict = sameDaySnap.docs.some((doc) => {
      const a = doc.data();
      // Overlap if start < existing end && end > existing start
      return startMins < a.endMinutes && endMins > a.startMinutes && a.status !== "cancelled";
    });
    if (conflict) {
      return NextResponse.json({ message: "Selected time conflicts with another appointment" }, { status: 409 });
    }

    // Get consumer info
    const consumerId = decoded.uid;
    const consumerSnap = await adminDb.collection("users").doc(consumerId).get();
    const consumerData = consumerSnap.exists ? consumerSnap.data() : {};

    const newDoc = apptRef.doc();
    const appointment = {
      id: newDoc.id,
      businessId,
      consumerId,
      consumerName: consumerData.businessName || consumerData.name || consumerData.displayName || "",
      consumerPhone: consumerData.phone || "",
      consumerEmail: consumerData.email || "",
      date,
      startTime: minutesToTime(startMins),
      endTime: minutesToTime(endMins),
      startMinutes: startMins,
      endMinutes: endMins,
      description: String(description || "").slice(0, 1000),
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await newDoc.set(appointment);

    // Optional: also mirror under consumer for "my appointments"
    await adminDb
      .collection("users")
      .doc(consumerId)
      .collection("appointments")
      .doc(newDoc.id)
      .set(appointment);

    return NextResponse.json({ success: true, id: newDoc.id }, { status: 201 });
  } catch (error) {
    console.error("Create appointment error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const decoded = await verifyAndGetUser(request);
    if (!decoded) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json({ message: "businessId is required" }, { status: 400 });
    }

    // Authorize: requester must be business owner or member of business
    const requesterId = decoded.uid;
    const requesterSnap = await adminDb.collection("users").doc(requesterId).get();
    const requester = requesterSnap.exists ? requesterSnap.data() : {};

    const isOwner = requesterId === businessId;
    const isMember = requester.role === "member" && requester.businessId === businessId;
    if (!isOwner && !isMember) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const apptSnap = await adminDb
      .collection("businesses")
      .doc(businessId)
      .collection("appointments")
      .orderBy("date", "desc")
      .get();

    let items = apptSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Stable sort: by date desc (already), then startMinutes desc
    items.sort((a, b) => {
      if (a.date === b.date) {
        return (b.startMinutes || 0) - (a.startMinutes || 0);
      }
      return a.date < b.date ? 1 : -1;
    });
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("List appointment error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const decoded = await verifyAndGetUser(request);
    if (!decoded) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { businessId, appointmentId, status } = await request.json();

    if (!businessId || !appointmentId || !status) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Authorize: requester must be business owner or member of business
    const requesterId = decoded.uid;
    const requesterSnap = await adminDb.collection("users").doc(requesterId).get();
    const requester = requesterSnap.exists ? requesterSnap.data() : {};
    const isOwner = requesterId === businessId;
    const isMember = requester.role === "member" && requester.businessId === businessId;
    if (!isOwner && !isMember) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const apptRef = adminDb
      .collection("businesses")
      .doc(businessId)
      .collection("appointments")
      .doc(appointmentId);

    const apptSnap = await apptRef.get();
    if (!apptSnap.exists) {
      return NextResponse.json({ message: "Appointment not found" }, { status: 404 });
    }

    await apptRef.update({ status, updatedAt: new Date() });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update appointment error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
} 