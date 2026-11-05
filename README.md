# JARVIS AI

A responsive, installable-ready personal AI assistant interface for desktop and Android.

## Current foundation
- Responsive dark JARVIS-inspired dashboard
- Chat UI with browser-local conversation history
- Urdu speech input where the browser supports Web Speech Recognition
- Urdu speech output using voices installed on the device (availability and voice gender depend on the device/browser)
- Optional Gemini API route; no API calls are made until a server-side key is configured
- PWA manifest foundation

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Enable live AI (optional)
Create a Gemini API key in Google AI Studio and add it as `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables. Keep the key server-side; never put it in a NEXT_PUBLIC variable or commit it. Free-tier availability, limits and regional eligibility are controlled by Google and may change.

Optional model override: `GEMINI_MODEL` (default: `gemini-2.5-flash`).

## Voice notes
Voice recognition depends on browser support and microphone permission. Speech synthesis uses voices installed by the operating system/browser. A female Urdu voice is not guaranteed on every device; install a compatible Urdu voice if the device offers one.

## Roadmap
1. Live AI model and robust error handling
2. Cross-device sign-in and cloud-synced memory
3. Voice activation and improved Urdu speech
4. Permission-based tools, web search and computer workflows
5. Android/PWA polish and security review

## Safety
JARVIS must request confirmation before sending messages, deleting files, purchases, or other consequential actions. Never expose API keys in client code.
