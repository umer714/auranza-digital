import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: "Main abhi JARVIS ka interface mode mein hoon. Live AI brain connect karne ke liye project ke environment variables mein GEMINI_API_KEY add karna hoga. API key ke baghair koi paid service call nahi hogi."
      });
    }
    const contents = messages.slice(-12).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content).slice(0, 6000) }]
    }));
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You are JARVIS, a helpful, calm personal AI assistant. Reply naturally in the language the user uses, especially Urdu or Roman Urdu when appropriate. Be accurate, concise, and transparent about limitations. Never claim to have performed an action unless a tool actually performed it. Ask for confirmation before consequential external actions." }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 900 }
        })
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || "AI provider request failed." }, { status: response.status });
    }
    const reply = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "Mujhe is waqt jawab generate karne mein mushkil ho rahi hai.";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "Request process nahi ho saki. Dobara koshish karein." }, { status: 500 });
  }
}
