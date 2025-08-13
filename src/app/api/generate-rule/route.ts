import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { dataset, prompt } = await req.json();

    if (!prompt || !dataset) {
      return NextResponse.json(
        { error: "Missing dataset or prompt" },
        { status: 400 }
      );
    }

    const validationRules = `
    RULE VALIDATION REQUIREMENTS:
    1. Rule type must be one of: coRun, loadLimit, phaseWindow, slotRestriction.
    2. "name" is required and must be descriptive.
    3. "priority" is between 1 and 10.
    4. Parameters must be valid:
       - coRun: parameters.tasks is an array of >= 2 task IDs from dataset.tasks.
       - loadLimit: parameters.workerGroup is in dataset.workers, maxSlotsPerPhase > 0.
       - phaseWindow: parameters.taskId in dataset.tasks, allowedPhases is non-empty int array.
       - slotRestriction: parameters must be a valid JSON object.
    5. No duplicate task IDs or phases in parameters.
    6. Confidence must be between 0 and 1, and reasoning must explain the logic.
    Return only a single JSON object in this format:
    {
      "type": "...",
      "name": "...",
      "description": "...",
      "parameters": { ... },
      "confidence": 0.85,
      "reasoning": "..."
    }
    `;
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
              Dataset: ${JSON.stringify(dataset)}
              User Prompt: "${prompt}"
              Follow the VALIDATION REQUIREMENTS strictly.
              ${validationRules}
            `,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });
  
    const rawText = response.candidates?.[0].content?.parts?.[0].text || "{}";

    let suggestion;
    try {
      suggestion = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "Invalid AI JSON output" },
        { status: 500 }
      );
    }
   
    return NextResponse.json({ suggestion });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
