import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function POST(request) {
  try {
    // Check if a valid token already exists in Firestore
    const tokenDocRef = doc(db, "info", "at");
    const tokenDoc = await getDoc(tokenDocRef);

    const now = new Date();

    // If token exists and is not expired, return it
    if (tokenDoc.exists()) {
      const tokenData = tokenDoc.data();
      const expiryTime = tokenData.expiryTime.toDate();

      if (now < expiryTime) {
        console.log("Using existing Deepvue token");
        return NextResponse.json({
          access_token: tokenData.access_token,
          token_type: "bearer",
          expiry: "24hrs",
        });
      }

      console.log("Deepvue token expired, requesting new one");
    }

    // Environment variables should be set in your .env file
    const CLIENT_ID = process.env.DEEPVUE_CLIENT_ID;
    const CLIENT_SECRET = process.env.DEEPVUE_CLIENT_SECRET;

    // Create form data
    const formData = new FormData();
    formData.append("client_id", CLIENT_ID);
    formData.append("client_secret", CLIENT_SECRET);

    // Make the API call to deepvue authorize endpoint
    const response = await fetch(
      "https://production.deepvue.tech/v1/authorize",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    // Log response to server console
    console.log("Deepvue Authorization Response:", data);

    // Calculate expiry time (24 hours from now)
    const creationTime = now;
    const expiryTime = new Date(creationTime);
    expiryTime.setHours(expiryTime.getHours() + 24);

    // Store token in Firestore
    await setDoc(tokenDocRef, {
      access_token: data.access_token,
      creationTime: creationTime,
      expiryTime: expiryTime,
    });

    // Return the response to the client
    return NextResponse.json({
      access_token: data.access_token,
      token_type: "bearer",
      expiry: "24hrs",
    });
  } catch (error) {
    console.error("Error authorizing with Deepvue API:", error);
    return NextResponse.json({ error: "Failed to authorize" }, { status: 500 });
  }
}
