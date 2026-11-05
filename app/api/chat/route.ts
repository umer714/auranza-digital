import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = body?.messages as ChatMessage[] | undefined;
    const webSearch = body?.webSearch === true;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: "JARVIS ka AI brain abhi connect nahi hua. Is feature ko chalane ke liye Vercel Environment Variables mein GEMINI_API_KEY add karna hoga. Key ko chat mein kabhi share na karein."
      }, { status: 503 });
    }

    const contents = messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 6000) }]
    }));

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const requestBody: Record<string, unknown> = {
      systemInstruction: {
        parts: [{
          text: "You are JARVIS, a helpful, calm personal AI assistant. Reply naturally in the language the user uses, especially Urdu or Roman Urdu when appropriate. Be accurate, concise, and transparent about limitations. Never claim to have performed an action unless a tool actually performed it. Ask for confirmation before consequential external actions. If Google Search results are provided, synthesize them carefully and distinguish verified facts from uncertainty."
        }]
      },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1100 }
    };

    if (webSearch) requestBody.tools = [{ google_search: {} }];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(45000)
      }
    );

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || "AI provider request failed.";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const candidate = data?.candidates?.[0];
    const reply = candidate?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") ||
      "Mujhe is waqt jawab generate karne mein mushkil ho rahi hai.";

    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: { web?: { uri?: string; title?: string } }) => chunk.web)
      .filter((web: { uri?: string } | undefined) => Boolean(web?.uri))
      .slice(0, 5)
      .map((web: { uri: string; title?: string }) => ({ title: web.title || web.uri, uri: web.uri }));

    return NextResponse.json({ reply, sources, searched: webSearch });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "JARVIS ko jawab lane mein zyada waqt laga. Dobara try karein."
      : "Request process nahi ho saki. Dobara koshish karein.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
