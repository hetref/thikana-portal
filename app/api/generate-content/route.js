import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const type = formData.get('type');
    const prompt = formData.get('prompt');
    const imageFile = formData.get('image');

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    let promptText = "";
    if (type === "title") {
      promptText = `Generate a creative and engaging title for a social media post based on this image. Keep it concise and catchy, under 20 characters.`;
    } else if (type === "description") {
      promptText = `Generate an engaging description for a social media post ${
        imageFile ? "based on this image" : `with the title: "${prompt}"`
      }. Keep it natural, conversational, and between 100-150 words.`;
    }

    let result;
    if (imageFile) {
      const imageBytes = await imageFile.arrayBuffer();
      const base64Image = Buffer.from(imageBytes).toString('base64');

      const imageParts = {
        inlineData: {
          data: base64Image,
          mimeType: imageFile.type
        }
      };

      result = await model.generateContent([promptText, imageParts]);
    } else {
      result = await model.generateContent(promptText + " " + prompt);
    }

    const response = await result.response;
    const text = response.text();

    return Response.json({ generated: text });
  } catch (error) {
    console.error('Generation error:', error);
    return Response.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}