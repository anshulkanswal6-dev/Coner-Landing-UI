import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Mic, MicOff, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SandboxTab({ project }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEnd = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => { initSession(); }, [project.project_id]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const initSession = async () => {
    try {
      const res = await axios.post(`${API}/projects/${project.project_id}/sandbox/init`, {}, { withCredentials: true });
      setSessionId(res.data.session_id);
      setMessages([{ role: "assistant", content: res.data.welcome_message, id: "welcome" }]);
    } catch { toast.error("Failed to init sandbox"); }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || sending) return;
    const userMsg = { role: "user", content: input, id: `u_${Date.now()}` };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await axios.post(`${API}/projects/${project.project_id}/sandbox/message`, {
        session_id: sessionId, content: input, current_url: window.location.href
      }, { withCredentials: true });
      setMessages(prev => [...prev, {
        role: "assistant", content: res.data.content, id: res.data.message_id, source: res.data.source
      }]);
      // TTS
      if ('speechSynthesis' in window && res.data.content) {
        const utterance = new SpeechSynthesisUtterance(res.data.content.replace(/[#*_`]/g, ''));
        utterance.rate = 1; utterance.pitch = 1;
        window.speechSynthesis.cancel();
      }
    } catch { toast.error("Failed to get response"); }
    finally { setSending(false); }
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return toast.error("Speech recognition not supported in this browser");
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const giveFeedback = async (msgId, feedback) => {
    try {
      await axios.post(`${API}/widget/feedback`, { message_id: msgId, feedback }, {
        withCredentials: true,
        headers: { "x-project-key": project.api_key }
      });
      setMessages(prev => prev.map(m => m.id === msgId ? {...m, feedback} : m));
    } catch { /* silent */ }
  };

  return (
    <div data-testid="sandbox-tab" className="grid lg:grid-cols-5 gap-6">
      {/* Chat Window */}
      <div className="lg:col-span-3">
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg overflow-hidden flex flex-col" style={{ height: "600px" }}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${project.primary_color}20` }}>
              <Bot className="w-4 h-4" style={{ color: project.primary_color }} />
            </div>
            <div>
              <p className="text-sm font-medium">{project.name}</p>
              <p className="text-xs text-zinc-500">Testing Sandbox</p>
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
                      <button
                        data-testid={`feedback-up-${msg.id}`}
                        onClick={() => giveFeedback(msg.id, 1)}
                        className={`p-1 rounded hover:bg-white/10 ${msg.feedback === 1 ? 'text-green-400' : 'text-zinc-500'}`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        data-testid={`feedback-down-${msg.id}`}
                        onClick={() => giveFeedback(msg.id, -1)}
                        className={`p-1 rounded hover:bg-white/10 ${msg.feedback === -1 ? 'text-red-400' : 'text-zinc-500'}`}
                      >
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
            {sending && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-[#7C3AED]" />
                </div>
                <div className="bg-zinc-800 rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex gap-2">
              <Button
                data-testid="sandbox-voice-btn"
                variant="ghost"
                size="sm"
                onClick={toggleVoice}
                className={listening ? "text-red-400 bg-red-400/10" : "text-zinc-500 hover:text-white"}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                data-testid="sandbox-input"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="bg-zinc-800 border-white/10"
              />
              <Button
                data-testid="sandbox-send-btn"
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
          <h3 className="font-heading font-semibold mb-3 text-sm">Testing Tips</h3>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li>Test your bot with typical customer questions</li>
            <li>Check if golden rules are being followed</li>
            <li>Verify knowledge base responses</li>
            <li>Test lead capture in acquisition mode</li>
            <li>Use thumbs up/down to provide feedback</li>
          </ul>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
          <h3 className="font-heading font-semibold mb-3 text-sm">Voice Mode</h3>
          <p className="text-xs text-zinc-400">Click the mic button to speak your message. Speech recognition converts your voice to text automatically.</p>
        </div>
      </div>
    </div>
  );
}
