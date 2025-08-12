import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
  try {
    const { businessName, callType, language = "en" } = await request.json();

    // Validate required parameters
    if (!businessName || !callType) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          details: "businessName and callType are required",
        },
        { status: 400 }
      );
    }

    // Validate the API key is available
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "Missing GEMINI_API_KEY environment variable",
        },
        { status: 500 }
      );
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Try Gemini 2.5 Flash first, then fallbacks
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    } catch (error) {
      console.log("Falling back to gemini-1.5-flash model");
      try {
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      } catch (e) {
        console.log("Falling back to gemini-1.5-pro model");
        model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      }
    }

    // Create the prompt based on language
    const languageName = language === "hi" ? "Hindi" : "English";
    const promptInstructions =
      language === "hi"
        ? "Please write the script in Hindi with clear, polite, and professional language."
        : "Please write the script in English with clear, polite, and professional language.";

    const prompt = `
Create a professional phone call script for ${businessName} for ${callType} calls in ${languageName}.

Business Name: ${businessName}
Call Type: ${callType}
Language: ${languageName}

${promptInstructions}

Requirements:
1. The script should be conversational and natural
2. Include proper greeting and introduction
3. Handle common customer responses and objections
4. Include appropriate call flow with [brackets] for different scenarios
5. Be professional and represent the business well
6. Include placeholders like [Business Name], [Customer Name], etc.
7. End with a polite closing
8. Make it suitable for AI voice assistant use

Script format should include:
- Opening/Greeting
- Purpose of call
- Main conversation flow
- Handling objections
- Information gathering (if needed)
- Closing

Generate a complete, ready-to-use script that an AI assistant can follow naturally.
`;

    console.log("Generating script with Gemini AI for:", {
      businessName,
      callType,
      language,
    });

    // Generate the script
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedScript = response.text();

    if (!generatedScript || generatedScript.trim() === "") {
      throw new Error("Failed to generate script content");
    }

    console.log("Successfully generated script using Gemini AI");

    return NextResponse.json({
      success: true,
      script: generatedScript,
      metadata: {
        businessName,
        callType,
        language,
        generatedAt: new Date().toISOString(),
        model: "gemini-2.5-flash",
      },
    });
  } catch (error) {
    console.error("Error generating script with Gemini:", error);

    // Handle specific Gemini API errors
    if (error.message?.includes("API key")) {
      return NextResponse.json(
        { error: "Invalid or missing Gemini API key" },
        { status: 401 }
      );
    }

    // Handle model not found errors
    if (
      error.message?.includes("not found") ||
      error.message?.includes("404")
    ) {
      return NextResponse.json(
        {
          error: "Gemini model not available",
          details:
            "The requested AI model is not available. Please try again later.",
        },
        { status: 503 }
      );
    }

    // Handle rate limiting or quota errors
    if (
      error.message?.includes("quota") ||
      error.message?.includes("rate limit")
    ) {
      return NextResponse.json(
        {
          error: "API quota exceeded",
          details:
            "You have exceeded your Gemini API quota. Please try again later.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate script",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
