interface Env {
  GEMINI_API_KEY: string;
  BASE_IMAGE_URL: string;
}

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

// Cache the base image
let cachedImageBase64: string | null = null;

async function getBaseImage(url: string): Promise<string> {
  if (cachedImageBase64) {
    return cachedImageBase64;
  }

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  cachedImageBase64 = btoa(binary);
  return cachedImageBase64;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      const { prompt } = await request.json() as { prompt: string };

      if (!prompt || typeof prompt !== 'string') {
        return new Response(JSON.stringify({ error: 'Prompt is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      if (!env.GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Load the base character image
      const baseImageBase64 = await getBaseImage(env.BASE_IMAGE_URL);
      const fullPrompt = `${BASE_PROMPT}\n\n${prompt}`;

      // Call Gemini API directly
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
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
              responseModalities: ['image', 'text'],
            },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', errorText);
        return new Response(JSON.stringify({ error: 'Generation failed', details: errorText }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const data = await geminiResponse.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: {
                mimeType: string;
                data: string;
              };
            }>;
          };
        }>;
      };

      // Extract image from response
      const parts = data.candidates?.[0]?.content?.parts;
      if (!parts) {
        return new Response(JSON.stringify({ error: 'No response from model' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Find the image part
      for (const part of parts) {
        if (part.inlineData) {
          return new Response(
            JSON.stringify({
              image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            }),
            {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            }
          );
        }
      }

      return new Response(JSON.stringify({ error: 'No image generated' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (error) {
      console.error('Generation error:', error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Generation failed' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }
  },
};
