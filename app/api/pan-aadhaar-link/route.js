import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Get the request body
    const requestBody = await request.json();

    // Extract credentials and data from request body
    const { ACCESS_TOKEN, pan_number, aadhaar_number } = requestBody;

    if (
      !ACCESS_TOKEN ||
      !process.env.DEEPVUE_CLIENT_SECRET ||
      !pan_number ||
      !aadhaar_number
    ) {
      return NextResponse.json(
        {
          error:
            "ACCESS_TOKEN, CLIENT_SECRET, pan_number, and aadhaar_number are required",
        },
        { status: 400 }
      );
    }

    // Construct the URL with query parameters
    const url = new URL(
      "https://production.deepvue.tech/v1/verification/pan-aadhaar-link-status"
    );
    url.searchParams.append("pan_number", pan_number);
    url.searchParams.append("aadhaar_number", aadhaar_number);

    // Make the API call to deepvue
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "x-api-key": process.env.DEEPVUE_CLIENT_SECRET,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    // Log response to server console
    console.log("PAN-Aadhaar Link Status Response:", data);

    // Return the response to the client
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error checking PAN-Aadhaar link status:", error);
    return NextResponse.json(
      { error: "Failed to check PAN-Aadhaar link status" },
      { status: 500 }
    );
  }
}
