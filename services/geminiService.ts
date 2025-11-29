import { GoogleGenAI, Type } from "@google/genai";
import { Obstacle, ObstacleType } from "../types";

export const generateLevelWithGemini = async (promptOverride?: string): Promise<Obstacle[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API Key found for Gemini Level Gen");
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = promptOverride || `
    Generate a challenging but beatable Geometry Dash level layout.
    The level should be about 50 grid units long for this segment.
    Start placing obstacles from x=40 (give player time to prepare).
    Use a mix of BLOCK (safe on top, kill on side), SPIKE (kill on touch), and PLATFORM (floating block).
    Ensure jumps are possible (max jump distance is about 3-4 grid units).
    Do not stack more than 2 blocks vertically.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: [ObstacleType.BLOCK, ObstacleType.SPIKE, ObstacleType.PLATFORM] },
              x: { type: Type.INTEGER },
              y: { type: Type.INTEGER },
            },
            required: ["type", "x", "y"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const obstacles = JSON.parse(text) as Obstacle[];
    // Filter out obstacles that are too close to start (buffer zone)
    const validObstacles = obstacles.filter(o => o.x >= 35).sort((a, b) => a.x - b.x);
    
    return validObstacles;
  } catch (err) {
    console.error("Gemini Level Gen Error:", err);
    throw err;
  }
};