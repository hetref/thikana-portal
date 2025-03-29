import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini API with configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
  apiVersion: "v1", // Update to v1 instead of v1beta
});

export async function POST(req) {
  try {
    // Add better error handling for JSON parsing
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { description } = body;

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Initialize the model with safety settings
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    });

    // Create a prompt for tag generation
    const prompt = `Generate relevant business tags from this description: "${description}"

Rules for tag generation:
1. Use hyphens (-) instead of spaces
2. All tags must be lowercase
3. Keep tags concise and relevant
4. Include both specific and general terms
5. Maximum 10 tags
6. Each tag should be 2-4 words maximum
7. Include business type and specialties
8. Avoid duplicate concepts
9. Use common search terms
10. Format: comma-separated list

Example format:
indian-cuisine, authentic-food, restaurant, spicy-dishes, north-indian, south-indian, vegetarian, non-vegetarian, family-restaurant, dine-in

Generate tags following these rules.`;

    try {
      // Generate content with structured output
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const response = await result.response;
      const text = response.text();

      // Clean up the response
      const tags = text
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && !tag.includes("\n"));

      return NextResponse.json({ tags });
    } catch (generationError) {
      console.error("Content generation error:", generationError);
      return NextResponse.json(
        { error: "Failed to generate tags", details: generationError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating tags:", error);
    return NextResponse.json(
      { error: "Failed to generate tags" },
      { status: 500 }
    );
  }
}
