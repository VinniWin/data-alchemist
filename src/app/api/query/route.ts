import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { query, dataset } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
You are a natural language query assistant for a structured dataset.

The dataset has 3 entity types:
- "clients"
- "workers"
- "tasks"

Based on the user's query below, analyze and:
1. Detect the correct entity type
2. Filter the correct data items using relevant fields
3. Consider possible misspellings (e.g., "taks" instead of "tasks") and interpret them correctly.
4. Return ONLY valid JSON in this format:

interface QueryAnalysis {
  entityType: "clients" | "workers" | "tasks";
  results: any[];
  totalFound: number;
}

User Query:
"${query}"

Dataset:
${JSON.stringify(dataset)}
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Remove ```json fences if present
    text = text.replace(/```json\s*|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse JSON:", err, "\nRaw AI Output:", text);
      return NextResponse.json(
        { error: "Invalid JSON from Gemini" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Gemini processing error:", err);
    return NextResponse.json(
      { error: "Failed to process query" },
      { status: 500 }
    );
  }
}
