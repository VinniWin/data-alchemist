import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { dataset, validation } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
        ruleRecommendations: {
          type: string;
          description: string;
          parameters: Record<string, any>;
          confidence: number;
          reasoning: string;
        }[];
      }

      Dataset:
      ${JSON.stringify(dataset)}

      Validation:
      ${JSON.stringify(validation)}
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();

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
