import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const callId = searchParams.get("call_id");

    if (!callId) {
      return NextResponse.json(
        { error: "Missing call_id parameter" },
        { status: 400 }
      );
    }

    const apiKey = process.env.VAPI_PRIVATE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "VAPI Private API key not configured" },
        { status: 500 }
      );
    }

    console.log(`Testing call details availability for: ${callId}`);

    // Test with multiple different timings
    const delays = [0, 2000, 5000, 10000]; // 0s, 2s, 5s, 10s
    const results = [];

    for (let i = 0; i < delays.length; i++) {
      const delay = delays[i];

      if (delay > 0) {
        console.log(`Waiting ${delay}ms before attempt ${i + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        const timestamp = new Date().toISOString();

        if (response.ok) {
          const result = await response.json();
          results.push({
            attempt: i + 1,
            delay: delay,
            timestamp,
            status: "success",
            callStatus: result.status,
            duration: result.duration,
            hasTranscript: result.transcript && result.transcript.length > 0,
            transcriptLength: result.transcript ? result.transcript.length : 0,
          });

          // If successful, we can stop testing
          console.log(`Success on attempt ${i + 1} after ${delay}ms delay`);
          break;
        } else {
          const error = await response
            .json()
            .catch(() => ({ message: response.statusText }));
          results.push({
            attempt: i + 1,
            delay: delay,
            timestamp,
            status: "failed",
            statusCode: response.status,
            error: error.message || response.statusText,
          });

          console.log(`Attempt ${i + 1} failed:`, error);
        }
      } catch (error) {
        results.push({
          attempt: i + 1,
          delay: delay,
          timestamp: new Date().toISOString(),
          status: "error",
          error: error.message,
        });

        console.log(`Attempt ${i + 1} error:`, error.message);
      }
    }

    return NextResponse.json({
      callId,
      totalAttempts: results.length,
      results,
      summary: {
        successful: results.some((r) => r.status === "success"),
        firstSuccessDelay:
          results.find((r) => r.status === "success")?.delay || null,
        allFailed: results.every((r) => r.status !== "success"),
      },
    });
  } catch (error) {
    console.error("Error testing call details:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
