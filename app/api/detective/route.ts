import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const DETECTIVE_PROMPT = `You are Claude, a hard-boiled code detective with a noir sensibility. A mysterious code snippet has landed on your desk. Your job:

1. Identify the programming language (be confident but honest if uncertain)
2. Explain what the code actually does (be clear and accurate)
3. Provide noir-style commentary on the coding style (be witty, slightly sarcastic, but educational)
4. List specific "evidence" of code smells, anti-patterns, or clever techniques
5. Deliver a verdict

Your response MUST be valid JSON with this exact structure:
{
  "intro": "A noir-style one-liner introduction (e.g., 'The case came in on a Tuesday. Looked simple. It never is.')",
  "language": "The programming language name",
  "languageConfidence": "Brief explanation of how you identified it",
  "whatItDoes": "Clear technical explanation of what the code does",
  "styleAnalysis": "Noir-style commentary on the coding style - be clever and witty but also educational. Use detective/noir metaphors.",
  "verdict": "A punchy final verdict (e.g., 'GUILTY of crimes against clean code' or 'CASE CLOSED: Actually pretty solid')",
  "evidence": ["Array", "of", "specific", "observations", "about", "the", "code"]
}

Be entertaining but accurate. If the code is good, acknowledge it. If it's bad, roast it with style. Think Raymond Chandler meets code review.`;

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
      }
    });

    const prompt = `${DETECTIVE_PROMPT}

CODE TO INVESTIGATE:
\`\`\`
${code}
\`\`\`

Respond with ONLY the JSON object, no markdown formatting, no code blocks.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    let detectiveReport;
    try {
      // Remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      detectiveReport = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Response text:", text);

      // Return a fallback response
      return NextResponse.json({
        intro: "The case file got a little smudged. Let me tell you what I found.",
        language: "Unknown",
        languageConfidence: "The evidence was inconclusive",
        whatItDoes: "This code appears to be doing something, but the details are murky. Could be anything from a simple function to a complex algorithm.",
        styleAnalysis: "Like a case with missing pages, this one's hard to read. The code's there, but making sense of it? That's the real mystery. Sometimes the fog is too thick, even for a seasoned detective like me.",
        verdict: "CASE INCONCLUSIVE - More investigation needed",
        evidence: [
          "Syntax suggests programming, that much is clear",
          "The structure indicates intentional design",
          "More context needed for a full analysis"
        ]
      });
    }

    // Validate the response structure
    const requiredFields = ['intro', 'language', 'languageConfidence', 'whatItDoes', 'styleAnalysis', 'verdict', 'evidence'];
    const missingFields = requiredFields.filter(field => !(field in detectiveReport));

    if (missingFields.length > 0) {
      console.error("Missing fields:", missingFields);
      throw new Error("Invalid response structure from model");
    }

    return NextResponse.json(detectiveReport);
  } catch (error) {
    console.error("Detective API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Investigation failed" },
      { status: 500 }
    );
  }
}
