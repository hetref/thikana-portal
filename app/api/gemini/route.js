import { GoogleGenerativeAI } from "@google/generative-ai";
import { initialMessage } from "@/data/thikana";
import { generateId } from "@/lib/utils";

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI("AIzaSyCPohxaGkH2ujVa1f_yP5hPtr9zWSFh8q0");

export const runtime = "edge";

export async function POST(request) {
  try {
    const { message } = await request.json();

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Create a chat session
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: initialMessage.content }],
        },
        {
          role: "model",
          parts: [
            { text: "I understand. I'll help answer questions about Thikana." },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    // Send user message and get response
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return Response.json({
      response: responseText,
      id: generateId(),
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return Response.json(
      {
        error: "Failed to process request",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
