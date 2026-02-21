import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Mic, MicOff, ThumbsUp, ThumbsDown, X } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SandboxTab({ project }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  // Voice Island state
  const [voiceMode, setVoiceMode] = useState(false);
  const [vState, setVState] = useState("idle"); // idle|listening|processing|speaking
  const [muted, setMuted] = useState(false);
  const [lastUser, setLastUser] = useState("");
  const [lastBot, setLastBot] = useState("");
  const messagesEnd = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => { initSession(); }, [project.project_id]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  const initSession = async () => {
    try {
      const res = await fetch(`${API}/projects/${project.project_id}/sandbox/init`, { method: "POST", credentials: "include" });
      const d = await res.json();
      setSessionId(d.session_id);
      setMessages([{ role: "assistant", content: d.welcome_message, id: "welcome" }]);
    } catch { toast.error("Failed to init sandbox"); }
  };

  const doSend = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || !sessionId || sending) return;
    setMessages(prev => [...prev, { role: "user", content: msg, id: `u_${Date.now()}` }]);
    setLastUser(msg);
    setInput("");
    setSending(true);
    setStreamingText("");
    if (voiceMode) setVState("processing");

    try {
      const resp = await fetch(`${API}/projects/${project.project_id}/sandbox/message/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, content: msg, current_url: window.location.href }),
        credentials: "include"
      });
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = "", msgId = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          const t = line.trim();
          if (!t.startsWith("data: ")) continue;
          try {
            const p = JSON.parse(t.slice(6));
            if (p.token) { full += p.token; setStreamingText(full); if (voiceMode) setLastBot(full.slice(-120)); }
            if (p.done) msgId = p.message_id;
          } catch {}
        }
      }
      setStreamingText("");
      setMessages(prev => [...prev, { role: "assistant", content: full, id: msgId, source: "rag" }]);
      setLastBot(full.slice(0, 120));

      if (voiceMode && full && 'speechSynthesis' in window) {
        setVState("speaking");
        const u = new SpeechSynthesisUtterance(full.replace(/[#*_`>\[\]]/g, '').slice(0, 500));
        u.rate = 1.05;
        u.onend = () => { if (!muted) { setVState("idle"); setTimeout(() => startListening(), 600); } else setVState("idle"); };
        u.onerror = () => setVState("idle");
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } else if (voiceMode) { setVState("idle"); }
    } catch {
      setStreamingText("");
      toast.error("Failed to get response");
      if (voiceMode) setVState("idle");
    } finally { setSending(false); }
  }, [input, sessionId, sending, project.project_id, voiceMode, muted]);

  const startListening = useCallback(() => {
    if (muted || sending) return;
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return toast.error("Not supported");
    window.speechSynthesis.cancel();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR(); r.continuous = false; r.interimResults = false;
    r.onstart = () => setVState("listening");
    r.onresult = (e) => { doSend(e.results[0][0].transcript); };
    r.onerror = () => setVState("idle");
    r.onend = () => { setVState(prev => prev === "listening" ? "idle" : prev); };
    recognitionRef.current = r;
    r.start();
  }, [doSend, muted, sending]);

  const stopListening = () => { if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} } };

  const openVoice = () => {
    setVoiceMode(true); setMuted(false); setVState("idle");
    const lu = messages.filter(m => m.role === "user").pop();
    const lb = messages.filter(m => m.role === "assistant").pop();
    setLastUser(lu?.content?.slice(0, 80) || "");
    setLastBot(lb?.content?.slice(0, 120) || "");
  };

  const closeVoice = () => {
    stopListening(); window.speechSynthesis.cancel();
    setVoiceMode(false); setVState("idle"); setMuted(false);
  };

  const toggleMute = () => {
    if (!muted) { stopListening(); setMuted(true); if (vState === "listening") setVState("idle"); }
    else setMuted(false);
  };

  const giveFeedback = async (msgId, feedback) => {
    try {
      await fetch(`${API}/widget/feedback`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-project-key": project.api_key },
        body: JSON.stringify({ message_id: msgId, feedback }), credentials: "include"
      });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback } : m));
    } catch {}
  };

  // Color map for orb and wave
  const orbColor = vState === "listening" ? "#ef4444" : vState === "speaking" ? "#14b8a6" : vState === "processing" ? "#eab308" : (muted ? "#555" : "#7C3AED");
  const waveColor = vState === "listening" ? "239,68,68" : vState === "speaking" ? "20,184,166" : vState === "processing" ? "234,179,8" : "124,58,237";

  return (
    <div data-testid="sandbox-tab" className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg overflow-hidden flex flex-col relative" style={{ height: "600px" }}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${project.primary_color}20` }}>
              <Bot className="w-4 h-4" style={{ color: project.primary_color }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{project.name}</p>
              <p className="text-xs text-zinc-500">Testing Sandbox{sending ? " | Streaming..." : ""}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-[#7C3AED]" />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === "user" ? "bg-[#7C3AED] text-white" : "bg-zinc-800 text-zinc-100"} rounded-xl px-4 py-2.5`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === "assistant" && msg.id !== "welcome" && (
                    <div className="flex items-center gap-1 mt-2 pt-1 border-t border-white/5">
                      <button data-testid={`feedback-up-${msg.id}`} onClick={() => giveFeedback(msg.id, 1)}
                        className={`p-1 rounded hover:bg-white/10 ${msg.feedback === 1 ? 'text-green-400' : 'text-zinc-500'}`}>
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button data-testid={`feedback-down-${msg.id}`} onClick={() => giveFeedback(msg.id, -1)}
                        className={`p-1 rounded hover:bg-white/10 ${msg.feedback === -1 ? 'text-red-400' : 'text-zinc-500'}`}>
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                      {msg.source && <span className="text-[10px] text-zinc-600 ml-auto">{msg.source}</span>}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                )}
              </div>
            ))}
            {streamingText && !voiceMode && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#7C3AED]" />
                </div>
                <div className="max-w-[75%] bg-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5">
                  <p className="text-sm whitespace-pre-wrap">{streamingText}<span className="inline-block w-1.5 h-4 bg-[#7C3AED] ml-0.5 animate-pulse" /></p>
                </div>
              </div>
            )}
            {sending && !streamingText && !voiceMode && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-[#7C3AED]" /></div>
                <div className="bg-zinc-800 rounded-xl px-4 py-3">
                  <div className="flex gap-1">{[0,150,300].map(d=><div key={d} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay:`${d}ms`}} />)}</div>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex gap-2">
              <Button data-testid="sandbox-voice-btn" variant="ghost" size="sm" onClick={openVoice}
                className="text-zinc-500 hover:text-[#7C3AED] hover:bg-[#7C3AED]/10">
                <Mic className="w-4 h-4" />
              </Button>
              <Input data-testid="sandbox-input" placeholder="Type a message..." value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSend()}
                className="bg-zinc-800 border-white/10" />
              <Button data-testid="sandbox-send-btn" onClick={() => doSend()}
                disabled={sending || !input.trim()}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white" size="sm">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ═══ Voice Island Overlay ═══ */}
          {voiceMode && (
            <div className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ background: "rgba(9,9,11,0.88)", backdropFilter: "blur(12px)" }}>

              {/* Close */}
              <button data-testid="voice-close-btn" onClick={closeVoice}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>

              <div className="flex flex-col items-center gap-5 px-6">
                {/* Orb */}
                <div className="relative cursor-pointer" data-testid="voice-orb"
                  onClick={() => {
                    if (vState === "idle") startListening();
                    else if (vState === "listening") stopListening();
                    else if (vState === "speaking") { window.speechSynthesis.cancel(); setVState("idle"); }
                  }}>
                  {/* Rings */}
                  {(vState === "listening" || vState === "speaking") && [14, 28, 42].map((r, i) => (
                    <div key={i} className="absolute rounded-full border-[1.5px]"
                      style={{
                        inset: `-${r}px`, borderColor: `${orbColor}40`,
                        animation: `pulse 2s ease-in-out ${i * 0.35}s infinite`
                      }} />
                  ))}
                  <div className="w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: orbColor,
                      transform: vState === "listening" ? "scale(1.08)" : "scale(1)",
                      boxShadow: `0 0 ${vState === "idle" ? 0 : 30}px ${orbColor}50`
                    }}>
                    <Mic className="w-9 h-9 text-white" />
                  </div>
                </div>

                {/* Label */}
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {vState === "idle" && (muted ? "Muted \u2014 tap orb to speak" : "Tap to speak")}
                  {vState === "listening" && "Listening..."}
                  {vState === "processing" && "Thinking..."}
                  {vState === "speaking" && "Speaking..."}
                </p>

                {/* Last user msg */}
                {lastUser && <p className="text-xs text-center max-w-[240px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>"{lastUser}"</p>}
                {/* Last bot msg */}
                {lastBot && <p className="text-xs text-center max-w-[260px] line-clamp-3" style={{ color: "rgba(255,255,255,0.5)" }}>{lastBot}</p>}

                {/* Mute button */}
                <button data-testid="voice-mute-btn" onClick={toggleMute}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                    muted ? "bg-red-500/15 border-red-500/30" : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}>
                  {muted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-zinc-400" />}
                </button>
              </div>

              {/* Bottom wave */}
              <div className="absolute bottom-0 left-0 right-0 h-14 overflow-hidden pointer-events-none">
                <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 60" preserveAspectRatio="none"
                  style={{ animation: "epW1 3s ease-in-out infinite" }}>
                  <path d="M0,30 C360,55 720,5 1080,30 C1260,42 1380,35 1440,30 L1440,60 L0,60 Z"
                    fill={`rgba(${waveColor},0.18)`} />
                </svg>
                <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 60" preserveAspectRatio="none"
                  style={{ animation: "epW2 4s ease-in-out infinite" }}>
                  <path d="M0,35 C240,10 480,50 720,25 C960,5 1200,45 1440,35 L1440,60 L0,60 Z"
                    fill={`rgba(${waveColor},0.10)`} />
                </svg>
                <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 60" preserveAspectRatio="none"
                  style={{ animation: "epW3 5s ease-in-out infinite" }}>
                  <path d="M0,25 C180,45 540,10 900,38 C1100,48 1320,20 1440,30 L1440,60 L0,60 Z"
                    fill={`rgba(${waveColor},0.05)`} />
                </svg>
              </div>

              <style>{`
                @keyframes epW1{0%,100%{transform:translateX(0)}50%{transform:translateX(-5%)}}
                @keyframes epW2{0%,100%{transform:translateX(0)}50%{transform:translateX(4%)}}
                @keyframes epW3{0%,100%{transform:translateX(0)}50%{transform:translateX(-3%)}}
                @keyframes pulse{0%,100%{transform:scale(.95);opacity:.4}50%{transform:scale(1.06);opacity:.12}}
              `}</style>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
          <h3 className="font-heading font-semibold mb-3 text-sm">Testing Tips</h3>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li>Responses stream in real-time via SSE</li>
            <li>Click the mic icon to enter Voice Island mode</li>
            <li>Check if golden rules are being followed</li>
            <li>Use thumbs up/down to provide feedback</li>
            <li>Test lead capture in acquisition mode</li>
          </ul>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
          <h3 className="font-heading font-semibold mb-3 text-sm">Voice Island</h3>
          <p className="text-xs text-zinc-400 mb-3">Click the mic in the input bar to enter voice conversation. The AI listens, responds, then auto-listens again for continuous conversation.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { color: "#7C3AED", label: "Idle" },
              { color: "#ef4444", label: "Listening" },
              { color: "#eab308", label: "Processing" },
              { color: "#14b8a6", label: "Speaking" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                {s.label}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[11px] text-zinc-600">Mute stops the mic without leaving voice mode. Close button restores normal chat with history preserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
