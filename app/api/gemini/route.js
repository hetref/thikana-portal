import { streamText, Message } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { initialMessage } from "@/data/thikana";
import { generateId } from "@/lib/utils";

const google = createGoogleGenerativeAI({
  apiKey: "AIzaSyDOmYsvQ8Vci4swqN5kFvJh0bJPxl8OXAU",
});

export const runtime = "edge";

const buildGoogleGenAIPrompt = (message) => [
  {
    id: generateId(),
    role: "user",
    content: initialMessage.content,
  },
  {
    id: generateId(),
    role: "user",
    content: message,
  },
];

export async function POST(request) {
  try {
    const { message } = await request.json();

    // For non-streaming response
    const model = google("gemini-1.5-pro");
    const result = await model.generateContent({
      contents: buildGoogleGenAIPrompt(message),
      generationConfig: {
        temperature: 0.7,
      },
    });

    return Response.json({
      response: result.response.text(),
      id: generateId(),
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
