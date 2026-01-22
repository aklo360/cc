import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const BASE_PROMPT = `Generate this EXACT character from the reference image in a new scene.

CRITICAL SHAPE RULES - THE TOP OF THE BODY IS COMPLETELY FLAT:

THE CHARACTER'S BODY FROM TOP TO BOTTOM:
1. TOP EDGE: Completely flat horizontal line. NO bumps. NO antenna. NO protrusions. FLAT.
2. BODY: A rectangular block, wider than it is tall, with heavily rounded edges.
3. LEFT SIDE: one rectangular arm
4. RIGHT SIDE: one rectangular arm
5. BOTTOM: 4 short rectangular legs (2 on left side, 2 on right side, with a gap in the middle).

WHAT THE CHARACTER DOES NOT HAVE:
- NO antenna or protrusions on TOP of the body
- NO mouth
- NO tail
- NO extra limbs of any kind
- The only things sticking out are: the 4 LEGS at the BOTTOM, and the two ARMS on the LEFT and RIGHT

FACE: Two vertical rectangular EMPTY HOLES on the front (these are carved indentations, not real eyes - no pupils, no eyeballs, just empty cavities). No other facial features.

THIS IS AN INANIMATE CERAMIC FIGURINE - like a toy or statue. It has no expressions, no emotions, no moving parts.

COLOR: Warm peachy-coral orange (#da7756)
MATERIAL: Smooth matte ceramic
STYLE: 3D render, soft studio lighting, warm tones, Blender aesthetic, square 1:1

COPY THE EXACT SHAPE FROM THE REFERENCE IMAGE. Place this unchanged character in:`;

// Cache the base image in memory
let cachedImageBase64: string | null = null;

async function getBaseImage(): Promise<string> {
  if (cachedImageBase64) {
    return cachedImageBase64;
  }

  const imagePath = path.join(process.cwd(), "public", "claudecode.jpg");
  const imageBuffer = await readFile(imagePath);
  cachedImageBase64 = imageBuffer.toString("base64");
  return cachedImageBase64;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
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

    // Load the base character image
    const baseImageBase64 = await getBaseImage();

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini's image generation model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
    });

    const fullPrompt = `${BASE_PROMPT}\n\n${prompt}`;

    // Multimodal request: image + text
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: baseImageBase64,
              },
            },
            {
              text: fullPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["image", "text"],
      } as never,
    });

    const response = result.response;

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    // Find the image part
    for (const part of parts) {
      if (part.inlineData) {
        return NextResponse.json({
          image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        });
      }
    }

    return NextResponse.json(
      { error: "No image generated" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
