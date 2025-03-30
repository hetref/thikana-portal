import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const requestBody = await request.json();
    console.log("REQUEST BODY", requestBody);
    const { pan_number, ACCESS_TOKEN } = requestBody;

    if (!pan_number || !ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "PAN number and ACCESS_TOKEN are required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://production.deepvue.tech/v1/verification/pan-msme-check?pan_number=${pan_number}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "x-api-key": process.env.DEEPVUE_CLIENT_SECRET,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        {
          error: "Failed to fetch PAN-MSME data",
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("DATA", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PAN-MSME verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
