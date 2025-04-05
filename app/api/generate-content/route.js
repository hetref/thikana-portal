import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const type = formData.get('type');
    const prompt = formData.get('prompt');
    const imageFile = formData.get('image');

    if (!type) {
      return new Response('Type is required', { status: 400 });
    }

    if (type === 'title' && !imageFile) {
      return new Response('Image is required for title generation', { status: 400 });
    }

    if (type === 'description' && !prompt) {
      return new Response('Title is required for description generation', { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    let promptText = "";
    if (type === "title") {
      promptText = `You are a creative social media content writer. Generate a creative, engaging, and relevant title for a social media post based on this image. The title should be:
      1. Concise (under 50 characters)
      2. Catchy and attention-grabbing
      3. Relevant to the image content
      4. Suitable for social media
      5. No hashtags or emojis
      
      Respond with ONLY the title text, nothing else.`;
    } else if (type === "description") {
      promptText = `You are a creative social media content writer. Generate an engaging description for a social media post with the title "${prompt}" ${
        imageFile ? "and based on this image" : ""
      }. The description should be:
      1. Natural and conversational in tone
      2. Between 100-150 words
      3. Include relevant hashtags at the end
      4. Engaging and encourage interaction
      5. Highlight key aspects of ${imageFile ? "the image and " : ""}the title
      
      Respond with ONLY the description text, nothing else.`;
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
      result = await model.generateContent(promptText);
    }

    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('No content generated');
    }

    return Response.json({ generated: text.trim() });
  } catch (error) {
    console.error('Generation error:', error);
    return new Response(error.message || 'Failed to generate content', { 
      status: 500 
    });
  }
}