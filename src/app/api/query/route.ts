import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    const prompt = `
You are an AI that converts a natural language query into a strict JSON filter format.

ENTITY TYPES AND SCHEMAS (exact field names to use):
{
  "clients": {
    "clientId": "string",
    "ClientName": "string",
    "PriorityLevel": "number",
    "RequestedTaskIDs": "string[]",
    "GroupTag": "string",
    "AttributesJSON": "object"
  },
  "workers": {
    "workerId": "string",
    "WorkerName": "string",
    "skills": "string[]",
    "AvailableSlots": "number",
    "MaxLoadPerPhase": "number",
    "WorkerGroup": "string",
    "QualificationLevel": "number"
  },
  "tasks": {
    "taskId": "string",
    "TaskName": "string",
    "Category": "string",
    "Duration": "number",
    "RequiredSkills": "string[]",
    "PreferredPhases": "string[]",
    "MaxConcurrent": "number"
  }
}

OUTPUT JSON FORMAT (exactly this):
[{
  "entityType": "clients" | "workers" | "tasks",
  "filters": [
    {
      "field": "<exact_field_name_from_schema>",
      "operator": ">" | "<" | "=" | "includes",
      "value": "<string_or_number>"
    }
  ]
}]

RULES:
1. Only output valid JSON, no explanations or markdown.
2. Field names MUST match exactly from the schema above (case-sensitive).
3. Operators: 
   - "=" for exact match
   - "includes" for partial match or array contains
   - ">" / "<" for numeric comparison
4. Values: If number is expected, return as number. Strings without quotes inside numbers.
5. Never invent fields or entity types not in schema.
6. If the query is ambiguous, pick the most likely entity type.

USER QUERY:
"${query}"
`;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    let text = result.candidates?.[0].content?.parts?.[0].text || "{}";
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
