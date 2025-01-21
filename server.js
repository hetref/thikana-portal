const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
const port = 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Configure Multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define the /analyze-image route
app.post("/analyze-image", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Image is required" });
        }

        const imageBuffer = req.file.buffer;

        // Call the Gemini API to analyze the image
        const response = await axios.post('https://api.gemini.com/analyze', {
            image: imageBuffer.toString('base64'), // Convert buffer to base64
            // Add any other required parameters for the Gemini API
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        const visionAnalysis = response.data.labels || [];

        res.json({ labels: visionAnalysis });
    } catch (error) {
        console.error("Error processing the request:", error);
        res.status(500).json({ error: "Failed to analyze image" });
    }
});

// Define the /generate-description route
app.post("/generate-description", async (req, res) => {
    try {
        const { prompt } = req.body;

        // Call the Gemini API to generate a description
        const response = await axios.post('YOUR_GEMINI_API_ENDPOINT_FOR_DESCRIPTION', {
            prompt: prompt,
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        const generatedDescription = response.data.description; // Adjust based on the actual response structure

        res.json({ description: generatedDescription });
    } catch (error) {
        console.error("Error generating description:", error);
        res.status(500).json({ error: "Failed to generate description" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});