import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Get the request body
    const requestBody = await request.json();
    console.log("REQBODY", requestBody);

    // Get tokens from request body instead of environment variables
    const { ACCESS_TOKEN, mobile_number } = requestBody;

    if (!ACCESS_TOKEN || !process.env.DEEPVUE_CLIENT_SECRET) {
      return NextResponse.json(
        {
          error:
            "ACCESS_TOKEN and CLIENT_SECRET are required in the request body",
        },
        { status: 400 }
      );
    }

    const url = new URL(
      "https://production.deepvue.tech/v1/mobile-intelligence/mobile-to-pan"
    );
    url.searchParams.append("mobile_number", mobile_number);

    // Make the API call to deepvue
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "x-api-key": process.env.DEEPVUE_CLIENT_SECRET,
        "Content-Type": "application/json",
      },
    });

    const responseData = await response.json();

    // Log response to server console
    console.log("Deepvue API Response:", responseData);

    // Return the response to the client
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    console.error("Error calling Deepvue API:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
