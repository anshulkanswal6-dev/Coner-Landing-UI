import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Code, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function WidgetConfigTab({ project }) {
  const [copied, setCopied] = useState(null);

  const embedScript = `<script src="${BACKEND_URL}/api/widget.js" data-project-key="${project.api_key}"></script>`;

  const reactCode = `import { useEffect, useRef, useState } from 'react';

function EmergentPulseWidget({ projectKey }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    fetch('${BACKEND_URL}/api/widget/init', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-project-key': projectKey }
    }).then(r => r.json()).then(data => {
      setSessionId(data.session_id);
      setMessages([{ role: 'assistant', content: data.welcome_message }]);
    });
  }, [projectKey]);

  const send = async () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    const msg = input; setInput('');
    const res = await fetch('${BACKEND_URL}/api/widget/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-project-key': projectKey },
      body: JSON.stringify({ session_id: sessionId, content: msg })
    }).then(r => r.json());
    setMessages(prev => [...prev, { role: 'assistant', content: res.content }]);
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
      {open ? (
        <div style={{ width: 380, height: 500, background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #eee', fontWeight: 600 }}>Chat</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 12, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <span style={{ display: 'inline-block', padding: '8px 12px', borderRadius: 8, background: m.role === 'user' ? '#7C3AED' : '#f3f4f6', color: m.role === 'user' ? '#fff' : '#111', fontSize: 14 }}>
                  {m.content}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type..." style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
            <button onClick={send} style={{ padding: '8px 16px', background: '#7C3AED', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      ) : null}
      <button onClick={() => setOpen(!open)} style={{ width: 56, height: 56, borderRadius: '50%', background: '#7C3AED', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)', marginTop: 8, fontSize: 24 }}>
        {open ? '\\u00D7' : '\\u2709'}
      </button>
    </div>
  );
}

// Usage: <EmergentPulseWidget projectKey="${project.api_key}" />`;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div data-testid="widget-config-tab" className="space-y-6">
      {/* Embed Script */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
          <Code className="w-4 h-4 text-[#7C3AED]" />
          Script Tag (Recommended)
        </h3>
        <p className="text-xs text-zinc-500 mb-4">Add this single line to any HTML page to embed your AI agent.</p>
        <div className="relative">
          <pre className="bg-zinc-950 border border-white/5 rounded-lg p-4 text-xs font-mono text-[#2dd4bf] overflow-x-auto">
            {embedScript}
          </pre>
          <Button
            data-testid="copy-embed-script-btn"
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(embedScript, "embed")}
            className="absolute top-2 right-2 text-zinc-500 hover:text-white"
          >
            {copied === "embed" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* API Key */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-2">API Key</h3>
        <p className="text-xs text-zinc-500 mb-3">Use this key to authenticate widget API calls.</p>
        <div className="flex gap-2">
          <Input value={project.api_key} readOnly className="bg-zinc-950 border-white/5 font-mono text-xs text-zinc-300" />
          <Button
            data-testid="copy-api-key-btn"
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(project.api_key, "key")}
            className="border-white/10 text-zinc-300"
          >
            {copied === "key" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* React Component */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
          React Component
        </h3>
        <p className="text-xs text-zinc-500 mb-4">For React/Next.js applications, use this component.</p>
        <div className="relative">
          <pre className="bg-zinc-950 border border-white/5 rounded-lg p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-64 overflow-y-auto">
            {reactCode}
          </pre>
          <Button
            data-testid="copy-react-code-btn"
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(reactCode, "react")}
            className="absolute top-2 right-2 text-zinc-500 hover:text-white"
          >
            {copied === "react" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
