import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, ThumbsUp, ThumbsDown, RotateCcw, Database, HardDrive } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── CSS keyframes injected once ── */
const VOICE_STYLES = `
@keyframes sbViIn {
  0%   { transform: translateX(calc(-50% + var(--sb-dx,-42%))) scale(.17); border-radius:50%; opacity:.35; }
  52%  { transform: translateX(-50%) scale(.17); border-radius:24px; opacity:1; }
  100% { transform: translateX(-50%) scale(1);   border-radius:28px; opacity:1; }
}
@keyframes sbViOut {
  0%   { transform: translateX(-50%) scale(1);   border-radius:28px; opacity:1; }
  48%  { transform: translateX(-50%) scale(.17); border-radius:24px; opacity:1; }
  100% { transform: translateX(calc(-50% + var(--sb-dx,-42%))) scale(.17); border-radius:50%; opacity:0; }
}
@keyframes sbOrbPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }
@keyframes sbSpin     { to{transform:rotate(360deg)} }
@keyframes sbBar      { from{height:3px} to{height:16px} }
@keyframes sbW1       { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-4%)} }
@keyframes sbW2       { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3.5%)} }
@keyframes sbW3       { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-2.5%)} }
`;

const BARS = [0,1,2,3,4,5,6];

/* Listening delays (ms) */
const L_DELAYS = [0, 60, 120, 180, 120, 60, 0];
/* Speaking delays (ms) */
const S_DELAYS = [0, 150, 300, 420, 300, 150, 0];

function fmtMd(t) {
  if (!t) return "";
  return t
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

/* ── Smart Sentence Splitter ── */
function splitSentences(text) {
  if (!text) return [];
  /* Replace common abbreviations temporarily */
  let t = text
    .replace(/\bDr\./gi, 'Dr<DOT>')
    .replace(/\bMr\./gi, 'Mr<DOT>')
    .replace(/\bMrs\./gi, 'Mrs<DOT>')
    .replace(/\bMs\./gi, 'Ms<DOT>')
    .replace(/\bProf\./gi, 'Prof<DOT>')
    .replace(/\bInc\./gi, 'Inc<DOT>')
    .replace(/\bLtd\./gi, 'Ltd<DOT>')
    .replace(/\bCorp\./gi, 'Corp<DOT>')
    .replace(/\bSr\./gi, 'Sr<DOT>')
    .replace(/\bJr\./gi, 'Jr<DOT>')
    .replace(/\b([A-Z])\./g, '$1<DOT>');
  
  /* Split on sentence boundaries */
  const raw = t.split(/([.!?]+\s+)/);
  const sentences = [];
  let curr = '';
  
  for (let i = 0; i < raw.length; i++) {
    curr += raw[i];
    if (/[.!?]/.test(raw[i]) && curr.trim().length > 0) {
      sentences.push(curr.trim().replace(/<DOT>/g, '.'));
      curr = '';
    }
  }
  if (curr.trim()) sentences.push(curr.trim().replace(/<DOT>/g, '.'));
  
  /* If no clean sentences, chunk by ~150 chars */
  if (sentences.length === 0 || sentences.join('').length < text.length * 0.5) {
    const chunks = [];
    let chunk = '';
    const words = text.split(/\s+/);
    for (const word of words) {
      chunk += word + ' ';
      if (chunk.length >= 150) {
        chunks.push(chunk.trim());
        chunk = '';
      }
    }
    if (chunk.trim()) chunks.push(chunk.trim());
    return chunks;
  }
  
  return sentences.filter(s => s.length > 0);
}

/* ── Intelligent Voice Selection ── */
function selectBestVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  
  /* Tier 1: Microsoft premium voices */
  const msNames = ['aria', 'guy', 'jenny'];
  for (const name of msNames) {
    const v = voices.find(x => x.name.toLowerCase().includes(name));
    if (v) return v;
  }
  
  /* Tier 2: Google natural */
  const goog = voices.find(x => 
    x.name.toLowerCase().includes('google') && 
    (x.name.toLowerCase().includes('natural') || x.name.toLowerCase().includes('neural'))
  );
  if (goog) return goog;
  
  /* Tier 3: Any Natural/Neural */
  const nat = voices.find(x => 
    x.name.toLowerCase().includes('natural') || x.name.toLowerCase().includes('neural')
  );
  if (nat) return nat;
  
  /* Tier 4: Default */
  return voices[0] || null;
}

export default function SandboxTab({ project }) {
  const [sessionId, setSessionId]     = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [streamingText, setStreamingText] = useState("");
  
  /* Memory mode: "session" (default) or "persistent" */
  const [memoryMode, setMemoryMode]   = useState("session");

  /* Voice island state */
  const [voiceMode, setVoiceMode]     = useState(false);   // island visible?
  const [islandPhase, setIslandPhase] = useState("");      // entering|open|leaving|""
  const [vState, setVStateR]          = useState("idle");  // idle|listening|processing|speaking
  const [muted, setMuted]             = useState(false);
  const [liveText, setLiveText]       = useState("");      // interim STT transcript
  const [botTxt, setBotTxt]           = useState("");      // AI text shown in island

  /* Refs needed inside async callbacks */
  const voiceModeRef  = useRef(false);
  const vStateRef     = useRef("idle");
  const mutedRef      = useRef(false);
  const sendingRef    = useRef(false);
  const sessionRef    = useRef(null);

  const recognitionRef  = useRef(null);
  const utteranceRef    = useRef(null);
  const silenceTimer    = useRef(null);
  const lastFinalTxt    = useRef("");
  const lastFinalTime   = useRef(0);

  const sandboxRef   = useRef(null);   // outer container
  const micBtnRef    = useRef(null);   // mic button in input bar
  const islandRef    = useRef(null);   // voice island div
  const messagesEnd  = useRef(null);
  
  /* Voice selection */
  const selectedVoice = useRef(null);
  const voiceReady    = useRef(false);
  
  /* TTS queue */
  const ttsQueue      = useRef([]);
  const ttsActive     = useRef(false);
  
  /* Web Audio API for real mic visualization */
  const audioCtxRef   = useRef(null);
  const analyserRef   = useRef(null);
  const micStreamRef  = useRef(null);
  const animFrameRef  = useRef(null);
  
  /* SSE cleanup */
  const sseReaderRef  = useRef(null);

  /* Keep refs in sync with state */
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { vStateRef.current = vState; }, [vState]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { sendingRef.current = sending; }, [sending]);
  useEffect(() => { sessionRef.current = sessionId; }, [sessionId]);

  /* Scroll to bottom on new messages */
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  /* Auto-save messages to storage */
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      saveToStorage(sessionId, messages);
    }
  }, [messages, sessionId, saveToStorage]);

  /* Init session */
  useEffect(() => { initSession(); }, [project.project_id]);

  /* Style injection (once) */
  useEffect(() => {
    if (document.getElementById("sb-voice-styles")) return;
    const s = document.createElement("style");
    s.id = "sb-voice-styles";
    s.textContent = VOICE_STYLES;
    document.head.appendChild(s);
  }, []);
  
  /* Voice initialization */
  useEffect(() => {
    const initVoice = () => {
      selectedVoice.current = selectBestVoice();
      voiceReady.current = true;
    };
    
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.getVoices().length > 0) initVoice();
      else window.speechSynthesis.onvoiceschanged = initVoice;
    }
  }, []);

  /* Island phase transitions */
  useEffect(() => {
    if (islandPhase === "entering") {
      const t = setTimeout(() => {
        setIslandPhase("open");
        setVStateR("idle");
        vStateRef.current = "idle";
        /* Auto-start listening after island opens */
        if (!mutedRef.current) {
          setTimeout(() => {
            if (voiceModeRef.current && vStateRef.current === "idle") startListeningInner();
          }, 350);
        }
      }, 380);
      return () => clearTimeout(t);
    }
    if (islandPhase === "leaving") {
      const t = setTimeout(() => {
        setIslandPhase("");
        setVoiceMode(false);
        voiceModeRef.current = false;
      }, 320);
      return () => clearTimeout(t);
    }
  }, [islandPhase]);

  /* ── Storage helpers (mode-aware) ── */
  const getStorage = useCallback(() => {
    return memoryMode === 'persistent' ? localStorage : sessionStorage;
  }, [memoryMode]);

  const STORAGE_KEY = `sb_data_${project.project_id}`;

  const saveToStorage = useCallback((sid, msgs) => {
    try {
      getStorage().setItem(STORAGE_KEY, JSON.stringify({ sid, msgs: msgs.slice(-50) }));
    } catch {}
  }, [getStorage, STORAGE_KEY]);

  const loadFromStorage = useCallback(() => {
    try {
      return JSON.parse(getStorage().getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }, [getStorage, STORAGE_KEY]);

  const clearStorage = useCallback(() => {
    try {
      getStorage().removeItem(STORAGE_KEY);
    } catch {}
  }, [getStorage, STORAGE_KEY]);

  const initSession = async () => {
    /* Try to load from storage first */
    const saved = loadFromStorage();
    
    try {
      const res = await fetch(`${API}/projects/${project.project_id}/sandbox/init`, { method: "POST", credentials: "include" });
      const d = await res.json();
      setSessionId(d.session_id);
      sessionRef.current = d.session_id;
      
      /* Restore saved messages if available */
      if (saved && saved.msgs && saved.msgs.length > 0) {
        setMessages(saved.msgs);
      } else {
        setMessages([{ role: "assistant", content: d.welcome_message, id: "welcome" }]);
      }
      
      saveToStorage(d.session_id, saved?.msgs || [{ role: "assistant", content: d.welcome_message, id: "welcome" }]);
    } catch { toast.error("Failed to init sandbox"); }
  };

  /* ── Clear Chat (new conversation) ── */
  const clearChat = useCallback(() => {
    /* Close voice mode if active */
    if (voiceModeRef.current) {
      closeVoice();
    }
    
    /* Clear messages */
    setMessages([]);
    setStreamingText("");
    
    /* Clear storage */
    clearStorage();
    
    /* Reinitialize with new session */
    initSession();
    
    toast.success("Started new chat");
  }, [clearStorage, initSession]);

  /* ── Switch memory mode ── */
  const switchMemoryMode = useCallback((newMode) => {
    if (newMode === memoryMode) return;
    
    /* Clear current storage */
    clearStorage();
    
    /* Switch mode */
    setMemoryMode(newMode);
    
    /* Clear messages and start fresh */
    setMessages([]);
    setStreamingText("");
    
    /* Reinitialize */
    setTimeout(() => initSession(), 100);
    
    toast.success(`Switched to ${newMode === 'session' ? 'Session' : 'Persistent'} Memory`);
  }, [memoryMode, clearStorage, initSession]);

  /* ── Web Audio API for real mic visualization ── */
  const setupMicVisualization = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        micStreamRef.current = stream;
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        const src = audioCtxRef.current.createMediaStreamSource(stream);
        src.connect(analyserRef.current);
        animateMicBars();
      })
      .catch(() => { /* Fallback to CSS animation if mic denied */ });
  }, []);

  const animateMicBars = useCallback(() => {
    if (!analyserRef.current || vStateRef.current !== 'listening' || !voiceModeRef.current) return;
    
    const dataArr = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArr);
    
    /* Calculate RMS */
    let sum = 0;
    for (let i = 0; i < dataArr.length; i++) sum += dataArr[i] * dataArr[i];
    const rms = Math.sqrt(sum / dataArr.length);
    const amp = Math.min(rms / 128, 1); // Normalize 0-1
    
    /* Update 7 bars — center highest */
    const bars = document.querySelectorAll('.sb-bar');
    if (bars.length === 7) {
      const heights = [amp * 0.5, amp * 0.75, amp * 0.95, amp, amp * 0.95, amp * 0.75, amp * 0.5];
      bars.forEach((bar, i) => {
        const h = 3 + heights[i] * 13; // 3px min, 16px max
        bar.style.height = h + 'px';
        bar.style.animation = 'none'; // Disable CSS animation
      });
    }
    
    animFrameRef.current = requestAnimationFrame(animateMicBars);
  }, []);

  const stopMicVisualization = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  /* ── Set voice state ── */
  const setVState = useCallback((s) => {
    vStateRef.current = s;
    setVStateR(s);
  }, []);

  /* ── Stop TTS (with queue cleanup) ── */
  const stopTTS = useCallback(() => {
    ttsActive.current = false;
    ttsQueue.current = [];
    if (utteranceRef.current) {
      utteranceRef.current.onend  = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  /* ── Stop listening ── */
  const stopListening = useCallback(() => {
    clearTimeout(silenceTimer.current);
    stopMicVisualization();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, [stopMicVisualization]);

  /* ── Send text (streaming) ── */
  const sendText = useCallback(async (txt) => {
    if (!txt || !sessionRef.current || sendingRef.current) return;
    /* 1.5s dedup */
    const now = Date.now();
    if (txt === lastFinalTxt.current && now - lastFinalTime.current < 1500) return;
    lastFinalTxt.current  = txt;
    lastFinalTime.current = now;

    setMessages(prev => [...prev, { role: "user", content: txt, id: `u_${Date.now()}` }]);
    setInput("");
    setSending(true); sendingRef.current = true;
    setStreamingText("");
    setLiveText("");

    if (voiceModeRef.current) {
      setVState("processing");
      setBotTxt("");
    }

    try {
      const resp = await fetch(`${API}/projects/${project.project_id}/sandbox/message/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionRef.current, content: txt, current_url: window.location.href }),
        credentials: "include"
      });
      const reader  = resp.body.getReader();
      sseReaderRef.current = reader; // Track for cleanup
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
            if (p.token) {
              full += p.token;
              if (voiceModeRef.current) setBotTxt(full.slice(-160));
              else setStreamingText(full);
            }
            if (p.done) msgId = p.message_id;
          } catch {}
        }
      }

      sseReaderRef.current = null;
      setStreamingText("");
      setMessages(prev => [...prev, { role: "assistant", content: full, id: msgId, source: "rag" }]);

      if (voiceModeRef.current && full) {
        speakTTSChunked(full);
      } else if (voiceModeRef.current) {
        setVState("idle");
      }

    } catch {
      sseReaderRef.current = null;
      setStreamingText("");
      toast.error("Failed to get response");
      if (voiceModeRef.current) setVState("idle");
    } finally {
      setSending(false); sendingRef.current = false;
    }
  }, [project.project_id, setVState]);

  /* ── TTS (sentence-chunked with queue) ── */
  const speakTTSChunked = useCallback((text) => {
    if (!('speechSynthesis' in window) || !voiceReady.current) {
      setVState("idle");
      return;
    }
    
    stopTTS();
    setBotTxt("");
    
    const clean = text.replace(/[#*_`>\[\]]/g, '');
    const sentences = splitSentences(clean);
    if (sentences.length === 0) {
      setVState("idle");
      return;
    }
    
    ttsQueue.current = sentences.slice();
    ttsActive.current = true;
    setVState("speaking");
    
    speakNextSentence();
  }, [setVState, stopTTS]);

  const speakNextSentence = useCallback(() => {
    if (!ttsActive.current || ttsQueue.current.length === 0) {
      ttsActive.current = false;
      utteranceRef.current = null;
      if (!voiceModeRef.current) return;
      setVState("idle");
      // SANDBOX IS ALWAYS PREVIEW: no auto-restart, manual mic click only
      return;
    }
    
    const sentence = ttsQueue.current.shift();
    const u = new SpeechSynthesisUtterance(sentence);
    if (selectedVoice.current) u.voice = selectedVoice.current;
    utteranceRef.current = u;
    u.rate = 1.05;
    u.pitch = 1;
    
    u.onend = () => {
      if (!ttsActive.current) return; // Queue was cancelled
      speakNextSentence(); // Continue to next sentence
    };
    
    u.onerror = () => {
      ttsActive.current = false;
      utteranceRef.current = null;
      if (voiceModeRef.current) setVState("idle");
    };
    
    window.speechSynthesis.speak(u);
  }, [setVState]);

  /* ── STT ── */
  function startListeningInner() {
    if (mutedRef.current || sendingRef.current) return;
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("Voice recognition not supported in this browser");
      return;
    }
    stopTTS();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r  = new SR();
    /* continuous:true  = keeps mic alive, no premature no-speech timeout
       interimResults:true = live transcript while user speaks
       We stop manually as soon as isFinal fires (avoids any timer race)   */
    r.continuous     = true;
    r.interimResults = true;
    r.lang = "";

    r.onstart = () => {
      setVState("listening");
      setLiveText("");
      /* Start real mic visualization if supported */
      setupMicVisualization();
    };

    r.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      const txt = res[0].transcript;
      setLiveText(txt);
      if (res.isFinal && txt.trim()) {
        /* Stop recognition immediately, then send */
        if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
        sendText(txt.trim());
      }
    };

    r.onerror = (e) => {
      if (e.error === "not-allowed") {
        toast.error("Microphone access denied");
        setVState("idle");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setVState("idle");
      }
    };

    /* onend fires after we call stop() — by that point vState is 'processing',
       so this guard won't accidentally reset back to idle                     */
    r.onend = () => {
      setLiveText("");
      stopMicVisualization(); // Clean up Web Audio
      if (vStateRef.current === "listening") setVState("idle");
    };

    recognitionRef.current = r;
    try { r.start(); } catch {}
  }

  /* ── Open voice island ── */
  const openVoice = useCallback(() => {
    if (voiceModeRef.current) return;
    voiceModeRef.current = true;
    setVoiceMode(true);
    setMuted(false); mutedRef.current = false;
    setLiveText(""); setBotTxt("");

    /* Compute morph dx: mic button center → container center */
    if (micBtnRef.current && sandboxRef.current) {
      const mic = micBtnRef.current.getBoundingClientRect();
      const box = sandboxRef.current.getBoundingClientRect();
      const micCX     = mic.left + mic.width / 2 - box.left;
      const containerCX = box.width / 2;
      const dx = micCX - containerCX;
      if (islandRef.current) islandRef.current.style.setProperty("--sb-dx", dx + "px");
    }

    setIslandPhase("entering");
  }, []);

  /* ── Close voice island ── */
  const closeVoice = useCallback(() => {
    stopListening();
    stopTTS();
    setMuted(false); mutedRef.current = false;
    
    /* Cancel active SSE stream */
    if (sseReaderRef.current) {
      try { sseReaderRef.current.cancel(); } catch {}
      sseReaderRef.current = null;
    }
    
    /* Clean up Web Audio */
    stopMicVisualization();
    
    setIslandPhase("leaving");
  }, [stopListening, stopTTS, stopMicVisualization]);

  /* ── Orb tap handler ── */
  const handleOrbTap = useCallback(() => {
    const s = vStateRef.current;
    if (s === "idle") {
      if (mutedRef.current) { setMuted(false); mutedRef.current = false; }
      startListeningInner();
    } else if (s === "listening") {
      stopListening();
    } else if (s === "speaking") {
      stopTTS();
      setVState("idle");
      setTimeout(() => {
        if (voiceModeRef.current && !mutedRef.current) startListeningInner();
      }, 300);
    }
  }, [stopListening, stopTTS, setVState]);

  /* ── Mute toggle ── */
  const toggleMute = useCallback(() => {
    const nm = !mutedRef.current;
    mutedRef.current = nm;
    setMuted(nm);
    if (nm) {
      stopListening();
      stopTTS();
      if (vStateRef.current !== "processing") setVState("idle");
    }
  }, [stopListening, stopTTS, setVState]);

  /* ── Feedback ── */
  const giveFeedback = async (msgId, feedback) => {
    try {
      await fetch(`${API}/widget/feedback`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-project-key": project.api_key },
        body: JSON.stringify({ message_id: msgId, feedback }), credentials: "include"
      });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback } : m));
    } catch {}
  };

  /* ── Helpers for island styles ── */
  const orbBg = vState === "listening" ? "#ef4444"
               : vState === "speaking"  ? "#14b8a6"
               : vState === "processing" ? "rgba(12,12,16,.9)"
               : muted ? "#3f3f46" : "#7C3AED";

  const orbShadow = vState === "listening"
    ? "0 0 28px rgba(239,68,68,.55),0 0 0 10px rgba(239,68,68,.12)"
    : vState === "speaking"
    ? "0 0 26px rgba(20,184,166,.5),0 0 0 10px rgba(20,184,166,.1)"
    : vState === "idle" && !muted
    ? "0 0 22px rgba(124,58,237,.4),0 0 0 6px rgba(124,58,237,.1)"
    : "none";

  const waveColors = {
    idle:       "rgba(124,58,237,.09)",
    listening:  "rgba(239,68,68,.17)",
    processing: "rgba(124,58,237,.13)",
    speaking:   "rgba(20,184,166,.15)",
  };
  const wc = waveColors[vState] || waveColors.idle;

  /* Island CSS class */
  const islandCls = `absolute left-1/2 z-20 ${
    islandPhase === "entering" ? "sb-vi-entering"
    : islandPhase === "open"    ? "sb-vi-open"
    : islandPhase === "leaving" ? "sb-vi-leaving"
    : "sb-vi-hidden"
  }`;

  /* Label text */
  const stateLabel = muted && vState === "idle" ? "Muted — tap orb to speak"
    : vState === "listening" ? "Listening…"
    : vState === "processing" ? "Thinking…"
    : vState === "speaking"  ? "Speaking…"
    : "Tap to speak";

  /* Transcription display */
  const displayUsr = liveText || (vState === "processing" || vState === "speaking"
    ? messages.filter(m => m.role === "user").slice(-1)[0]?.content?.slice(0, 80) || ""
    : "");
  const displayBot = botTxt || (vState === "idle" && islandPhase === "open"
    ? messages.filter(m => m.role === "assistant").slice(-1)[0]?.content?.slice(0, 140) || ""
    : "");

  return (
    <div data-testid="sandbox-tab" className="grid lg:grid-cols-5 gap-6">
      <style>{VOICE_STYLES + `
        .sb-vi-hidden { transform: translateX(-50%) scale(0.17); opacity: 0; border-radius: 50%; pointer-events: none; bottom: 24px; }
        .sb-vi-entering { animation: sbViIn 320ms cubic-bezier(.4,0,.2,1) forwards; bottom: 24px; pointer-events: none; }
        .sb-vi-open { transform: translateX(-50%) scale(1); opacity: 1; border-radius: 28px; pointer-events: auto; bottom: 24px; }
        .sb-vi-leaving { animation: sbViOut 280ms cubic-bezier(.4,0,.2,1) forwards; bottom: 24px; pointer-events: none; }
        .sb-bar { width: 2.5px; min-height: 3px; border-radius: 2px; background: rgba(255,255,255,.75); transform-origin: bottom; }
      `}</style>

      <div className="lg:col-span-3">
        <div
          ref={sandboxRef}
          className="bg-zinc-900/50 border border-white/5 rounded-lg flex flex-col relative"
          style={{ height: "600px", overflow: "hidden" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${project.primary_color || "#7C3AED"}20` }}>
              <Bot className="w-4 h-4" style={{ color: project.primary_color || "#7C3AED" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{project.name}</p>
              <p className="text-xs text-zinc-500">Testing Sandbox{sending ? " | Streaming…" : ""}</p>
            </div>
            
            {/* Memory Mode Toggle */}
            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-0.5">
              <button
                onClick={() => switchMemoryMode('session')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  memoryMode === 'session'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Session Memory (resets on refresh)"
              >
                <Database className="w-3 h-3 inline mr-1" />
                Session
              </button>
              <button
                onClick={() => switchMemoryMode('persistent')}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  memoryMode === 'persistent'
                    ? 'bg-green-500 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Persistent Memory (survives refresh)"
              >
                <HardDrive className="w-3 h-3 inline mr-1" />
                Persistent
              </button>
            </div>
            
            {/* New Chat Button */}
            <button
              data-testid="new-chat-btn"
              onClick={clearChat}
              className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
              title="Start new chat"
            >
              <RotateCcw className="w-4 h-4 text-zinc-400" />
            </button>
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
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${msg.role === "user" ? "bg-[#7C3AED] text-white" : "bg-zinc-800 text-zinc-100"}`}>
                  <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: fmtMd(msg.content) }} />
                  {msg.role === "assistant" && msg.id !== "welcome" && (
                    <div className="flex items-center gap-1 mt-2 pt-1 border-t border-white/5">
                      <button data-testid={`feedback-up-${msg.id}`} onClick={() => giveFeedback(msg.id, 1)}
                        className={`p-1 rounded hover:bg-white/10 ${msg.feedback === 1 ? "text-green-400" : "text-zinc-500"}`}>
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button data-testid={`feedback-down-${msg.id}`} onClick={() => giveFeedback(msg.id, -1)}
                        className={`p-1 rounded hover:bg-white/10 ${msg.feedback === -1 ? "text-red-400" : "text-zinc-500"}`}>
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
                  <p className="text-sm whitespace-pre-wrap">
                    {streamingText}<span className="inline-block w-1.5 h-4 bg-[#7C3AED] ml-0.5 animate-pulse" />
                  </p>
                </div>
              </div>
            )}
            {sending && !streamingText && !voiceMode && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-[#7C3AED]" />
                </div>
                <div className="bg-zinc-800 rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-white/5 flex-shrink-0">
            <div className="flex gap-2">
              <Button
                ref={micBtnRef}
                data-testid="sandbox-voice-btn"
                variant="ghost" size="sm"
                onClick={openVoice}
                className="text-zinc-500 hover:text-[#7C3AED] hover:bg-[#7C3AED]/10"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </Button>
              <Input
                data-testid="sandbox-input"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !sending && sendText(input.trim())}
                className="bg-zinc-800 border-white/10"
              />
              <Button
                data-testid="sandbox-send-btn"
                onClick={() => sendText(input.trim())}
                disabled={sending || !input.trim()}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white" size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ══════════ Voice Island (bottom-center) ══════════ */}
          {voiceMode && (
            <>
              {/* Backdrop */}
              <div
                className="absolute inset-0 z-10"
                style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)" }}
                onClick={closeVoice}
              />

              {/* Island pill */}
              <div
                ref={islandRef}
                data-testid="voice-island"
                className={islandCls}
                style={{
                  width: "300px",
                  maxWidth: "calc(100% - 24px)",
                  background: "rgba(0,0,0,.75)",
                  border: "1px solid rgba(255,255,255,.08)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close */}
                <button
                  data-testid="voice-close-btn"
                  onClick={closeVoice}
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "rgba(255,255,255,.06)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.14)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, stroke: "rgba(255,255,255,.55)", fill: "none", strokeWidth: 2.5, strokeLinecap: "round" }}>
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>

                {/* Inner layout */}
                <div className="flex flex-col items-center gap-2.5 px-5 pt-6 pb-4">

                  {/* Orb */}
                  <div
                    data-testid="voice-orb"
                    onClick={handleOrbTap}
                    className="relative flex items-center justify-center cursor-pointer flex-shrink-0"
                    style={{
                      width: 72, height: 72,
                      borderRadius: "50%",
                      transition: "transform .2s cubic-bezier(.4,0,.2,1)",
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(.93)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                  >
                    {/* Orb background */}
                    <div style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      background: orbBg,
                      boxShadow: orbShadow,
                      transition: "background .4s, box-shadow .4s",
                      animation: vState === "listening" ? "sbOrbPulse .88s ease-in-out infinite"
                               : vState === "speaking"  ? "sbOrbPulse 1.85s ease-in-out infinite"
                               : "none",
                    }} />
                    {/* Processing spinner */}
                    {vState === "processing" && (
                      <div style={{
                        position: "absolute", inset: -5, borderRadius: "50%",
                        border: "2px solid transparent",
                        borderTopColor: "#7C3AED",
                        borderRightColor: "rgba(124,58,237,.25)",
                        animation: "sbSpin .88s linear infinite",
                      }} />
                    )}
                    {/* Mic icon */}
                    <svg viewBox="0 0 24 24" style={{ position: "relative", zIndex: 2, width: 28, height: 28 }}>
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="rgba(255,255,255,.9)" stroke="none"/>
                      <path d="M19 10v2a7 7 0 01-14 0v-2" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" stroke="rgba(255,255,255,.9)" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" stroke="rgba(255,255,255,.9)" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>

                  {/* Audio bars */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: 18, opacity: (vState === "listening" || vState === "speaking") ? 1 : 0, transition: "opacity .35s" }}>
                    {BARS.map((_, i) => (
                      <div
                        key={i}
                        className="sb-bar"
                        style={{
                          animation: (vState === "listening" || vState === "speaking")
                            ? `sbBar ${vState === "listening" ? ".40s" : "1.10s"} ease-in-out ${(vState === "listening" ? L_DELAYS : S_DELAYS)[i]}ms infinite alternate`
                            : "none",
                          height: 3,
                        }}
                      />
                    ))}
                  </div>

                  {/* State label */}
                  <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: ".2px", color: "rgba(255,255,255,.6)", minHeight: 16 }}>
                    {stateLabel}
                  </p>

                  {/* Transcript */}
                  <div style={{ textAlign: "center", width: "100%", padding: "0 6px", minHeight: 40 }}>
                    {displayUsr && (
                      <p style={{
                        fontSize: 11.5, lineHeight: 1.5,
                        color: liveText ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.5)",
                        fontStyle: liveText ? "italic" : "normal",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}>
                        {liveText ? liveText : `"${displayUsr}"`}
                      </p>
                    )}
                    {displayBot && (
                      <p style={{
                        fontSize: 11, lineHeight: 1.5, color: "rgba(255,255,255,.35)",
                        marginTop: 5,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}>
                        {displayBot}
                      </p>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-2.5">
                    {/* Mute */}
                    <button
                      data-testid="voice-mute-btn"
                      onClick={toggleMute}
                      className="flex items-center justify-center transition-colors"
                      style={{
                        width: 34, height: 34, borderRadius: "50%",
                        border: muted ? "1px solid rgba(239,68,68,.3)" : "1px solid rgba(255,255,255,.09)",
                        background: muted ? "rgba(239,68,68,.15)" : "rgba(255,255,255,.05)",
                      }}
                    >
                      {muted ? (
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "none", stroke: "#ef4444", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
                          <line x1="2" y1="2" x2="22" y2="22"/>
                          <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
                          <path d="M17 16.95A7 7 0 015 12v-2m14 0v2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "none", stroke: "rgba(255,255,255,.65)", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
                          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="rgba(255,255,255,.65)" stroke="none"/>
                          <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom wave */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, overflow: "hidden", pointerEvents: "none", borderRadius: "0 0 28px 28px" }}>
                  {[
                    { cls: "sbW1", anim: "sbW1 3s ease-in-out infinite", d: "M0,20 C200,36 400,4 600,20 C800,36 1000,4 1200,20 L1200,40 L0,40 Z", opacity: 0.55 },
                    { cls: "sbW2", anim: "sbW2 4.3s ease-in-out infinite", d: "M0,24 C150,8 350,36 600,18 C850,2 1050,32 1200,24 L1200,40 L0,40 Z", opacity: 0.3 },
                    { cls: "sbW3", anim: "sbW3 5.6s ease-in-out infinite", d: "M0,17 C120,32 400,6 700,26 C900,36 1100,12 1200,20 L1200,40 L0,40 Z", opacity: 0.15 },
                  ].map(({ anim, d, opacity }, i) => (
                    <svg key={i} viewBox="0 0 1200 40" preserveAspectRatio="none"
                      style={{ position: "absolute", bottom: 0, width: "100%", height: "100%", animation: anim }}>
                      <path d={d} fill={wc} opacity={opacity} />
                    </svg>
                  ))}
                </div>
              </div>
            </>
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
          <p className="text-xs text-zinc-400 mb-3">
            Click the mic to enter cinematic voice mode. The AI listens, responds with TTS, then auto-listens again.
            Tap the orb during AI speech to interrupt it.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { color: "#7C3AED", label: "Idle" },
              { color: "#ef4444", label: "Listening" },
              { color: "#171717", label: "Processing", ring: "#7C3AED" },
              { color: "#14b8a6", label: "Speaking" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                  background: s.color,
                  boxShadow: s.ring ? `0 0 0 1.5px ${s.ring}` : "none"
                }} />
                {s.label}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[11px] text-zinc-600">
              Mute pauses the mic without exiting. Close exits voice mode and reopens the full chat with history intact.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
