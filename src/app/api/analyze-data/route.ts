import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { dataset, validation } = await req.json();

    const prompt = `
      You are a data quality assistant.
      Analyze the dataset and validation results.
      Return ONLY valid JSON matching this TypeScript type:

      interface AIAnalysis {
        suggestions: string[];
        corrections: {
          entity: "clients" | "workers" | "tasks";
          rowIndex: number;
          field: string;
          currentValue: any;
          suggestedValue: any;
          confidence: number;
          reasoning: string;
        }[];
      }

      Dataset:
      ${JSON.stringify(dataset)}

      Validation:
      ${JSON.stringify(validation)}
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    let text = result.candidates?.[0].content?.parts?.[0].text || "{}";

    // Remove Markdown code fences if present
    text = text.replace(/```json\s*|```/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch (parseErr) {
      console.error("Failed to parse AI JSON:", parseErr, "\nRaw text:", text);
      return NextResponse.json(
        { error: "Invalid JSON returned from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json(
      { error: "Gemini analysis failed" },
      { status: 500 }
    );
  }
}
