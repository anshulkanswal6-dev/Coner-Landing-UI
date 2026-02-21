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

  useEffect(() => { fetchRules(); }, [projectId]);

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

  return (
    <div data-testid="golden-rules-tab" className="space-y-6">
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
