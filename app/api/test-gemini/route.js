import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
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

    // Try different model versions
    let model;
    let modelName = "";

    try {
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      modelName = "gemini-1.5-flash";
    } catch (error) {
      try {
        model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        modelName = "gemini-1.5-pro";
      } catch (fallbackError) {
        return NextResponse.json(
          {
            error: "No available Gemini models found",
            details: "Both gemini-1.5-flash and gemini-1.5-pro are unavailable",
          },
          { status: 503 }
        );
      }
    }

    // Simple test prompt
    const testPrompt = "Say 'Hello from Gemini AI' in one sentence.";

    console.log(`Testing Gemini API with model: ${modelName}`);

    // Generate simple content
    const result = await model.generateContent(testPrompt);
    const response = await result.response;
    const generatedText = response.text();

    if (!generatedText || generatedText.trim() === "") {
      throw new Error("Generated text is empty");
    }

    console.log("Gemini API test successful");

    return NextResponse.json({
      success: true,
      message: "Gemini API is working correctly",
      model: modelName,
      testResponse: generatedText,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error testing Gemini API:", error);

    return NextResponse.json(
      {
        error: "Gemini API test failed",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
