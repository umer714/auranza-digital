"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void;
};
declare global { interface Window { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike } }

const starter: Message[] = [{ role: "assistant", content: "Assalam-o-alaikum! Main JARVIS hoon — tumhara personal AI assistant. Mujhse Urdu, Roman Urdu ya English mein baat kar sakte ho. Aaj kis kaam mein madad karun?" }];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starter);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("jarvis-chat-v1");
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem("jarvis-chat-v1", JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function speak(text: string) {
    if (!voiceOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ur-PK";
    utterance.rate = 0.94;
    const voices = window.speechSynthesis.getVoices();
    const urdu = voices.find(v => /ur[-_]PK/i.test(v.lang)) || voices.find(v => /^ur/i.test(v.lang));
    const female = voices.find(v => /female|zira|sara|google.*urdu/i.test(v.name));
    if (urdu) utterance.voice = urdu;
    else if (female) utterance.voice = female;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  async function send(text = input) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next); setInput(""); setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Response nahi mil saka.");
      const answer = String(data.reply || "Mujhe jawab nahi mila.");
      setMessages([...next, { role: "assistant", content: answer }]);
      speak(answer);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Connection error.");
    } finally { setBusy(false); }
  }

  function toggleMic() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { setNotice("Is browser mein voice input supported nahi. Android Chrome ya desktop Chrome try karein."); return; }
    const recognition = new Speech();
    recognition.lang = "ur-PK"; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = event => {
      const transcript = event.results[event.resultIndex]?.[0]?.transcript || "";
      if (transcript) { setInput(transcript); void send(transcript); }
    };
    recognition.onerror = () => { setListening(false); setNotice("Mic access check karein, phir dobara try karein."); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); setNotice(""); } catch { setNotice("Microphone start nahi ho saka."); }
  }

  function newChat() { window.speechSynthesis?.cancel(); setMessages(starter); setNotice(""); }
  return (
    <main className="shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">J</div><div><b>JARVIS</b><span>PERSONAL INTELLIGENCE</span></div></div>
        <button className="new-chat" onClick={newChat}><span>＋</span> New conversation</button>
        <div className="side-label">WORKSPACE</div>
        <div className="side-item active"><span>◈</span> AI Assistant <i /></div>
        <div className="side-item muted"><span>◷</span> Conversation memory</div>
        <div className="side-item muted"><span>⌘</span> Tools <em>SOON</em></div>
        <div className="side-bottom"><div className="status-dot" /><div><b>JARVIS CORE</b><span>Interface online</span></div><span className="version">V 0.1</span></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="breadcrumb">WORKSPACE <span>/</span> <b>ASSISTANT</b></div><div className="top-right"><span className="secure">◈ PRIVATE SESSION</span><div className="avatar">U</div></div></header>
        <div className="content">
          <div className="welcome">
            <div className="eyebrow"><span className="pulse" /> YOUR PERSONAL AI</div>
            <h1>At your service<span>.</span></h1>
            <p>Ek nayi soch, ek naya assistant. Bolo — main sun raha hoon.</p>
          </div>
          <div className="core-wrap">
            <div className={`core ${listening ? "is-listening" : ""} ${speaking ? "is-speaking" : ""}`}><div className="core-ring ring-a" /><div className="core-ring ring-b" /><div className="core-orb"><div className="orb-glow" /><span>J</span></div></div>
            <div className="core-caption">{listening ? "LISTENING TO YOU" : speaking ? "JARVIS IS SPEAKING" : busy ? "PROCESSING" : "SYSTEM READY"}</div>
          </div>
          <div className="chat-card">
            <div className="chat-head"><div><span className="chat-indicator" /> <b>Conversation</b><small> · End-to-end session UI</small></div><button onClick={newChat}>Clear chat ↗</button></div>
            <div className="messages">
              {messages.map((m, i) => <div className={`message-row ${m.role}`} key={i}><div className="message-avatar">{m.role === "assistant" ? "J" : "U"}</div><div className="message-body"><div className="message-name">{m.role === "assistant" ? "JARVIS" : "YOU"} <span>{m.role === "assistant" ? "AI ASSISTANT" : "MESSAGE"}</span></div><p>{m.content}</p>{m.role === "assistant" && i > 0 && <button className="replay" onClick={() => speak(m.content)}>▶ Listen</button>}</div></div>)}
              {busy && <div className="typing"><span /><span /><span /> <small>JARVIS is thinking</small></div>}
              <div ref={bottomRef} />
            </div>
            {notice && <div className="notice">{notice}</div>}
            <form className="composer" onSubmit={e => { e.preventDefault(); void send(); }}>
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Message JARVIS in Urdu, Roman Urdu or English..." aria-label="Message JARVIS" />
              <button type="button" className={`mic-btn ${listening ? "recording" : ""}`} onClick={toggleMic} aria-label="Voice input"> {listening ? "■" : "♩"} </button>
              <button type="submit" className="send-btn" disabled={!input.trim() || busy}>↑</button>
            </form>
            <div className="composer-foot"><span>↵ ENTER TO SEND</span><button onClick={() => setVoiceOn(!voiceOn)}>{voiceOn ? "◖ Voice replies on" : "◖ Voice replies off"}</button><span>AI CAN MAKE MISTAKES</span></div>
          </div>
          <div className="quick-actions"><button onClick={() => void send("Aaj ke liye ek productive plan bana do.")}>✳ <span>Plan my day</span></button><button onClick={() => void send("Mujhe ek naya skill seekhne ka roadmap do.")}>⌁ <span>Learn something</span></button><button onClick={() => void send("Meri madad karo: ek task list banao.")}>☷ <span>Organise tasks</span></button></div>
          <footer>JARVIS AI <span>•</span> BUILT TO ASSIST, DESIGNED TO EVOLVE</footer>
        </div>
      </section>
    </main>
  );
}
