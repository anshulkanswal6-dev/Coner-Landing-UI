import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Code, Shield, Plus, X, Globe } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function WidgetConfigTab({ project }) {
  const [copied, setCopied] = useState(null);
  const [domains, setDomains] = useState(project.whitelisted_domains || []);
  const [newDomain, setNewDomain] = useState("");
  const [saving, setSaving] = useState(false);

  const embedScript = `<script src="${BACKEND_URL}/api/widget.js" data-project-key="${project.api_key}" async></script>`;

  const reactCode = `// EmergentPulse React Widget
// Drop this into any React component
useEffect(() => {
  const s = document.createElement('script');
  s.src = '${BACKEND_URL}/api/widget.js';
  s.setAttribute('data-project-key', '${project.api_key}');
  s.async = true;
  document.body.appendChild(s);
  return () => document.body.removeChild(s);
}, []);`;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!d) return;
    if (domains.includes(d)) return toast.error("Domain already added");
    setDomains([...domains, d]);
    setNewDomain("");
  };

  const removeDomain = (d) => setDomains(domains.filter(x => x !== d));

  const saveDomains = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/projects/${project.project_id}`, { whitelisted_domains: domains }, { withCredentials: true });
      toast.success("Domain whitelist saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div data-testid="widget-config-tab" className="space-y-6">
      {/* Embed Script */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
          <Code className="w-4 h-4 text-[#7C3AED]" />
          Embed Script
          <Badge variant="secondary" className="text-[10px]">Production Ready</Badge>
        </h3>
        <p className="text-xs text-zinc-500 mb-4">Add this single line to your website's HTML. The widget loads asynchronously and includes voice mode, streaming, and feedback.</p>
        <div className="relative">
          <pre className="bg-zinc-950 border border-white/5 rounded-lg p-4 text-xs font-mono text-[#2dd4bf] overflow-x-auto">
            {embedScript}
          </pre>
          <Button data-testid="copy-embed-script-btn" variant="ghost" size="sm"
            onClick={() => copyToClipboard(embedScript, "embed")}
            className="absolute top-2 right-2 text-zinc-500 hover:text-white">
            {copied === "embed" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Domain Whitelist */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#7C3AED]" />
          Domain Whitelist
        </h3>
        <p className="text-xs text-zinc-500 mb-4">Restrict widget usage to specific domains. Leave empty to allow all domains (development mode).</p>
        <div className="flex gap-2 mb-3">
          <Input data-testid="domain-input" placeholder="example.com"
            value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDomain()}
            className="bg-zinc-800 border-white/10" />
          <Button data-testid="add-domain-btn" onClick={addDomain} variant="outline" className="border-white/10 text-zinc-300">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {domains.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {domains.map((d) => (
              <div key={d} data-testid={`domain-tag-${d}`}
                className="flex items-center gap-1.5 bg-zinc-800/50 border border-white/5 rounded-md px-3 py-1.5 text-xs">
                <Globe className="w-3 h-3 text-[#7C3AED]" />
                {d}
                <button onClick={() => removeDomain(d)} className="text-zinc-500 hover:text-red-400 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-yellow-500/70 mb-3">No domains set - widget will work on any website</p>
        )}
        <Button data-testid="save-domains-btn" onClick={saveDomains} disabled={saving}
          size="sm" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
          {saving ? "Saving..." : "Save Whitelist"}
        </Button>
      </div>

      {/* API Key */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-2">API Key</h3>
        <p className="text-xs text-zinc-500 mb-3">Used to authenticate widget API calls.</p>
        <div className="flex gap-2">
          <Input value={project.api_key} readOnly className="bg-zinc-950 border-white/5 font-mono text-xs text-zinc-300" />
          <Button data-testid="copy-api-key-btn" variant="outline" size="sm"
            onClick={() => copyToClipboard(project.api_key, "key")}
            className="border-white/10 text-zinc-300">
            {copied === "key" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* React Usage */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-2">React / Next.js</h3>
        <p className="text-xs text-zinc-500 mb-4">For React apps, load the widget dynamically in a useEffect hook.</p>
        <div className="relative">
          <pre className="bg-zinc-950 border border-white/5 rounded-lg p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-48 overflow-y-auto">
            {reactCode}
          </pre>
          <Button data-testid="copy-react-code-btn" variant="ghost" size="sm"
            onClick={() => copyToClipboard(reactCode, "react")}
            className="absolute top-2 right-2 text-zinc-500 hover:text-white">
            {copied === "react" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Widget Features */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-3 text-sm">Widget Features</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            "Streaming SSE responses",
            "Voice conversation mode",
            "Feedback thumbs up/down",
            "Session persistence",
            "Async loading",
            "Domain whitelisting",
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
              <Check className="w-3 h-3 text-green-400" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
