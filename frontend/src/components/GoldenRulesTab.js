import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, X, Save, Shield, Target, Headphones } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRESET_RULES = [
  { key: "professional_tone", label: "Maintain Professional Tone", desc: "Always respond in a professional and friendly manner" },
  { key: "never_mention_competitors", label: "Never Mention Competitors", desc: "Avoid mentioning or comparing with competitor products" },
  { key: "dont_discuss_pricing", label: "Don't Discuss Pricing", desc: "Direct pricing inquiries to the sales team" },
  { key: "stay_on_topic", label: "Stay On Topic", desc: "Only answer questions related to the business" },
  { key: "be_concise", label: "Be Concise", desc: "Keep responses short and to the point" },
  { key: "ask_before_assuming", label: "Ask Before Assuming", desc: "Clarify ambiguous queries before answering" },
];

export default function GoldenRulesTab({ projectId }) {
  const [rules, setRules] = useState({ preset_rules: {}, custom_rules: [] });
  const [newRule, setNewRule] = useState("");
  const [saving, setSaving] = useState(false);
  const [agentMode, setAgentMode] = useState("support");
  const [project, setProject] = useState(null);

  useEffect(() => { 
    fetchRules();
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}`, { withCredentials: true });
      setProject(res.data);
      setAgentMode(res.data.agent_mode || "support");
    } catch { /* use defaults */ }
  };

  const fetchRules = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/golden-rules`, { withCredentials: true });
      setRules(res.data);
    } catch { /* use defaults */ }
  };

  const togglePreset = (key) => {
    setRules(prev => ({
      ...prev,
      preset_rules: { ...prev.preset_rules, [key]: !prev.preset_rules[key] }
    }));
  };

  const addCustomRule = () => {
    if (!newRule.trim()) return;
    setRules(prev => ({ ...prev, custom_rules: [...prev.custom_rules, newRule.trim()] }));
    setNewRule("");
  };

  const removeCustomRule = (index) => {
    setRules(prev => ({ ...prev, custom_rules: prev.custom_rules.filter((_, i) => i !== index) }));
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/projects/${projectId}/golden-rules`, rules, { withCredentials: true });
      toast.success("Golden rules saved");
    } catch { toast.error("Failed to save rules"); }
    finally { setSaving(false); }
  };

  const updateAgentMode = async (mode) => {
    try {
      await axios.put(`${API}/projects/${projectId}`, { agent_mode: mode }, { withCredentials: true });
      setAgentMode(mode);
      toast.success(`Switched to ${mode === 'support' ? 'Support' : 'Acquisition'} mode`);
    } catch { 
      toast.error("Failed to update agent mode"); 
    }
  };

  return (
    <div data-testid="golden-rules-tab" className="space-y-6">
      {/* Agent Mode Selector */}
      <div className="bg-gradient-to-br from-[#7C3AED]/10 to-transparent border border-[#7C3AED]/20 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#7C3AED]" />
          Agent Mode
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Choose how your AI agent should interact with visitors
        </p>
        
        <div className="grid md:grid-cols-2 gap-3">
          {/* Support Mode Card */}
          <button
            data-testid="mode-support-btn"
            onClick={() => updateAgentMode("support")}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              agentMode === "support"
                ? "border-[#7C3AED] bg-[#7C3AED]/10"
                : "border-white/10 bg-zinc-900/50 hover:border-white/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${agentMode === "support" ? "bg-[#7C3AED]/20" : "bg-zinc-800"}`}>
                <Headphones className={`w-5 h-5 ${agentMode === "support" ? "text-[#7C3AED]" : "text-zinc-500"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">Support Mode</h4>
                  {agentMode === "support" && (
                    <span className="px-2 py-0.5 bg-[#7C3AED] text-white text-[10px] rounded-full">Active</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Help visitors with questions using your knowledge base. Best for customer support and FAQs.
                </p>
              </div>
            </div>
          </button>

          {/* Acquisition Mode Card */}
          <button
            data-testid="mode-acquisition-btn"
            onClick={() => updateAgentMode("acquisition")}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              agentMode === "acquisition"
                ? "border-green-500 bg-green-500/10"
                : "border-white/10 bg-zinc-900/50 hover:border-white/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${agentMode === "acquisition" ? "bg-green-500/20" : "bg-zinc-800"}`}>
                <Target className={`w-5 h-5 ${agentMode === "acquisition" ? "text-green-500" : "text-zinc-500"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">Acquisition Mode</h4>
                  {agentMode === "acquisition" && (
                    <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] rounded-full">Active</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Qualify visitors as leads. Naturally collects name, email, phone, and requirements.
                </p>
              </div>
            </div>
          </button>
        </div>

        {agentMode === "acquisition" && (
          <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
            <p className="text-xs text-green-400 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" />
              <span>Leads will be captured automatically and appear in the <strong>Leads</strong> tab.</span>
            </p>
          </div>
        )}
      </div>

      {/* Preset Rules */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#7C3AED]" />
          Preset Rules
        </h3>
        <div className="space-y-4">
          {PRESET_RULES.map((rule) => (
            <div key={rule.key} data-testid={`preset-rule-${rule.key}`} className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">{rule.label}</Label>
                <p className="text-xs text-zinc-500">{rule.desc}</p>
              </div>
              <Switch
                checked={rules.preset_rules[rule.key] || false}
                onCheckedChange={() => togglePreset(rule.key)}
                data-testid={`toggle-${rule.key}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Custom Rules */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold mb-4">Custom Rules</h3>
        <div className="space-y-3 mb-4">
          {rules.custom_rules.map((rule, i) => (
            <div key={i} data-testid={`custom-rule-${i}`} className="flex items-center gap-2 bg-zinc-800/50 rounded-md px-3 py-2">
              <span className="text-sm flex-1">{rule}</span>
              <button onClick={() => removeCustomRule(i)} className="text-zinc-500 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            data-testid="custom-rule-input"
            placeholder="e.g., Always suggest booking a demo call"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomRule()}
            className="bg-zinc-800 border-white/10"
          />
          <Button data-testid="add-custom-rule-btn" onClick={addCustomRule} variant="outline" className="border-white/10 text-zinc-300">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Button
        data-testid="save-rules-btn"
        onClick={saveRules}
        disabled={saving}
        className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Rules"}
      </Button>
    </div>
  );
}
