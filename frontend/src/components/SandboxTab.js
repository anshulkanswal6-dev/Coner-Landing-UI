import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Mic, MicOff, ThumbsUp, ThumbsDown, Volume2, X } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SandboxTab({ project }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState("idle"); // idle, listening, processing, speaking
  const messagesEnd = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => { initSession(); }, [project.project_id]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  const initSession = async () => {
    try {
      const res = await axios.post(`${API}/projects/${project.project_id}/sandbox/init`, {}, { withCredentials: true });
      setSessionId(res.data.session_id);
      setMessages([{ role: "assistant", content: res.data.welcome_message, id: "welcome" }]);
    } catch { toast.error("Failed to init sandbox"); }
  };

  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || !sessionId || sending) return;
    const userMsg = { role: "user", content: msg, id: `u_${Date.now()}` };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setStreamingText("");

    try {
      const resp = await fetch(`${API}/projects/${project.project_id}/sandbox/message/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, content: msg, current_url: window.location.href }),
        credentials: "include"
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let msgId = null;

      const read = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const d = JSON.parse(trimmed.slice(6));
                if (d.token) {
                  fullText += d.token;
                  setStreamingText(fullText);
                }
                if (d.done) { msgId = d.message_id; }
              } catch {}
            }
          }
        }
      };

      await read();

      setStreamingText("");
      setMessages(prev => [...prev, {
        role: "assistant", content: fullText, id: msgId, source: "rag"
      }]);

      // TTS for voice mode
      if (voiceMode && fullText && 'speechSynthesis' in window) {
        setVoiceState("speaking");
        const utterance = new SpeechSynthesisUtterance(fullText.replace(/[#*_`]/g, ''));
        utterance.rate = 1;
        utterance.onend = () => setVoiceState("idle");
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } else if (voiceMode) {
        setVoiceState("idle");
      }
    } catch {
      setStreamingText("");
      toast.error("Failed to get response");
      if (voiceMode) setVoiceState("idle");
    } finally {
      setSending(false);
    }
  }, [input, sessionId, sending, project.project_id, voiceMode]);

  const startVoiceListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return toast.error("Speech recognition not supported");
    }
    window.speechSynthesis.cancel();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setVoiceState("listening");
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setVoiceState("processing");
      sendMessage(text);
    };
    recognition.onerror = () => setVoiceState("idle");
    recognition.onend = () => {
      if (voiceState === "listening") setVoiceState("idle");
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [sendMessage, voiceState]);

  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return toast.error("Not supported");
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => { setInput(e.results[0][0].transcript); recognitionRef.current = null; };
    recognition.onerror = () => { recognitionRef.current = null; };
    recognition.onend = () => { recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const giveFeedback = async (msgId, feedback) => {
    try {
      await axios.post(`${API}/widget/feedback`, { message_id: msgId, feedback }, {
        withCredentials: true, headers: { "x-project-key": project.api_key }
      });
      setMessages(prev => prev.map(m => m.id === msgId ? {...m, feedback} : m));
    } catch {}
  };

  const closeVoiceMode = () => {
    setVoiceMode(false);
    setVoiceState("idle");
    window.speechSynthesis.cancel();
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
  };

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
              <p className="text-xs text-zinc-500">Testing Sandbox {sending ? "| Streaming..." : ""}</p>
            </div>
            <Button data-testid="sandbox-voice-mode-btn" variant="ghost" size="sm"
              onClick={() => { setVoiceMode(true); setVoiceState("idle"); }}
              className="text-zinc-400 hover:text-[#7C3AED]">
              <Volume2 className="w-4 h-4" />
            </Button>
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
                      <button data-testid={`feedback-up-${msg.id}`}
                        onClick={() => giveFeedback(msg.id, 1)}
                        className={`p-1 rounded hover:bg-white/10 ${msg.feedback === 1 ? 'text-green-400' : 'text-zinc-500'}`}>
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button data-testid={`feedback-down-${msg.id}`}
                        onClick={() => giveFeedback(msg.id, -1)}
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

            {/* Streaming bubble */}
            {streamingText && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-[#7C3AED]" />
                </div>
                <div className="max-w-[75%] bg-zinc-800 text-zinc-100 rounded-xl px-4 py-2.5">
                  <p className="text-sm whitespace-pre-wrap">{streamingText}<span className="inline-block w-1.5 h-4 bg-[#7C3AED] ml-0.5 animate-pulse" /></p>
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {sending && !streamingText && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-[#7C3AED]" />
                </div>
                <div className="bg-zinc-800 rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay: `${d}ms`}} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex gap-2">
              <Button data-testid="sandbox-mic-btn" variant="ghost" size="sm" onClick={toggleMic}
                className={recognitionRef.current ? "text-red-400 bg-red-400/10" : "text-zinc-500 hover:text-white"}>
                {recognitionRef.current ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input data-testid="sandbox-input" placeholder="Type a message..." value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="bg-zinc-800 border-white/10" />
              <Button data-testid="sandbox-send-btn" onClick={() => sendMessage()}
                disabled={sending || !input.trim()}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white" size="sm">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Voice Island Overlay */}
          {voiceMode && (
            <div className="absolute inset-0 bg-zinc-900/95 backdrop-blur-md flex flex-col items-center justify-center gap-6 z-10 animate-fade-in-up">
              <button data-testid="voice-close-btn" onClick={closeVoiceMode}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>

              {/* Pulsing Circle */}
              <div className="relative cursor-pointer" onClick={() => {
                if (voiceState === "idle") startVoiceListening();
                else if (voiceState === "listening" && recognitionRef.current) recognitionRef.current.stop();
              }}>
                <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                  voiceState === "listening" ? "bg-red-500 scale-110" :
                  voiceState === "speaking" ? "bg-[#2dd4bf]" :
                  voiceState === "processing" ? "bg-yellow-500" :
                  "bg-[#7C3AED]"
                }`}>
                  {/* Rings */}
                  <div className={`absolute inset-[-12px] rounded-full border-2 opacity-30 ${
                    voiceState !== "idle" ? "animate-ping" : ""
                  }`} style={{ borderColor: voiceState === "listening" ? "#ef4444" : voiceState === "speaking" ? "#2dd4bf" : "#7C3AED" }} />
                  <div className={`absolute inset-[-24px] rounded-full border-2 opacity-15 ${
                    voiceState !== "idle" ? "animate-pulse" : ""
                  }`} style={{ borderColor: voiceState === "listening" ? "#ef4444" : voiceState === "speaking" ? "#2dd4bf" : "#7C3AED" }} />
                  <Mic className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Waveform */}
              {(voiceState === "listening" || voiceState === "speaking") && (
                <div className="flex items-center gap-1 h-10">
                  {[12, 24, 36, 24, 12].map((h, i) => (
                    <div key={i} className="w-1 rounded-full animate-pulse"
                      style={{
                        height: `${h}px`,
                        backgroundColor: voiceState === "listening" ? "#ef4444" : "#2dd4bf",
                        animationDelay: `${i * 100}ms`,
                        animationDuration: "0.6s"
                      }} />
                  ))}
                </div>
              )}

              <p className="text-sm font-medium text-zinc-300">
                {voiceState === "idle" && "Tap to speak"}
                {voiceState === "listening" && "Listening..."}
                {voiceState === "processing" && "Processing..."}
                {voiceState === "speaking" && "Speaking..."}
              </p>

              <Button variant="ghost" size="sm" onClick={closeVoiceMode} className="text-zinc-500 hover:text-white text-xs">
                Back to chat
              </Button>
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
            <li>Test voice mode with the speaker icon</li>
            <li>Check if golden rules are being followed</li>
            <li>Use thumbs up/down to provide feedback</li>
            <li>Test lead capture in acquisition mode</li>
          </ul>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
          <h3 className="font-heading font-semibold mb-3 text-sm">Voice Conversation Mode</h3>
          <p className="text-xs text-zinc-400 mb-2">Click the speaker icon in the header to enter voice island mode. Tap the circle to speak, and the AI will respond via text-to-speech.</p>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-[#7C3AED]" /> <span className="text-zinc-500">Idle</span>
            <div className="w-3 h-3 rounded-full bg-red-500" /> <span className="text-zinc-500">Listening</span>
            <div className="w-3 h-3 rounded-full bg-[#2dd4bf]" /> <span className="text-zinc-500">Speaking</span>
          </div>
        </div>
      </div>
    </div>
  );
}
