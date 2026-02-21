import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Globe, Type, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function KnowledgeTab({ projectId }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [textForm, setTextForm] = useState({ title: "", content: "" });
  const [urlForm, setUrlForm] = useState({ url: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchSources(); }, [projectId]);

  const fetchSources = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/knowledge`, { withCredentials: true });
      setSources(res.data);
    } catch { toast.error("Failed to load knowledge sources"); }
    finally { setLoading(false); }
  };

  const addText = async () => {
    if (!textForm.title.trim() || !textForm.content.trim()) return toast.error("Title and content required");
    setSubmitting(true);
    try {
      await axios.post(`${API}/projects/${projectId}/knowledge/text`, textForm, { withCredentials: true });
      toast.success("Knowledge added and indexed");
      setTextForm({ title: "", content: "" });
      fetchSources();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add knowledge");
    } finally { setSubmitting(false); }
  };

  const addUrl = async () => {
    if (!urlForm.url.trim()) return toast.error("URL required");
    setSubmitting(true);
    try {
      await axios.post(`${API}/projects/${projectId}/knowledge/url`, urlForm, { withCredentials: true });
      toast.success("URL scraped and indexed");
      setUrlForm({ url: "" });
      fetchSources();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to scrape URL");
    } finally { setSubmitting(false); }
  };

  const deleteSource = async (sourceId) => {
    try {
      await axios.delete(`${API}/projects/${projectId}/knowledge/${sourceId}`, { withCredentials: true });
      setSources(sources.filter(s => s.source_id !== sourceId));
      toast.success("Knowledge source deleted");
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div data-testid="knowledge-tab" className="space-y-6">
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-white/5 p-1">
          <TabsTrigger value="text" data-testid="knowledge-text-tab" className="data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white text-xs">
            <Type className="w-3 h-3 mr-1" /> Text / Q&A
          </TabsTrigger>
          <TabsTrigger value="url" data-testid="knowledge-url-tab" className="data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white text-xs">
            <Globe className="w-3 h-3 mr-1" /> Website URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-4">
          <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5 space-y-4">
            <div>
              <Label className="text-zinc-300 text-sm">Title</Label>
              <Input
                data-testid="knowledge-title-input"
                placeholder="e.g., Product FAQ"
                value={textForm.title}
                onChange={(e) => setTextForm({...textForm, title: e.target.value})}
                className="bg-zinc-800 border-white/10 mt-1.5"
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">Content</Label>
              <Textarea
                data-testid="knowledge-content-input"
                placeholder="Paste your knowledge content, FAQ answers, product descriptions..."
                value={textForm.content}
                onChange={(e) => setTextForm({...textForm, content: e.target.value})}
                className="bg-zinc-800 border-white/10 mt-1.5 min-h-[150px]"
              />
            </div>
            <Button
              data-testid="add-knowledge-text-btn"
              onClick={addText}
              disabled={submitting}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Add Knowledge"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-4">
          <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5 space-y-4">
            <div>
              <Label className="text-zinc-300 text-sm">Website URL</Label>
              <Input
                data-testid="knowledge-url-input"
                placeholder="https://example.com/about"
                value={urlForm.url}
                onChange={(e) => setUrlForm({ url: e.target.value })}
                className="bg-zinc-800 border-white/10 mt-1.5"
              />
            </div>
            <Button
              data-testid="add-knowledge-url-btn"
              onClick={addUrl}
              disabled={submitting}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scraping...</> : "Scrape & Add"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sources List */}
      <div>
        <h3 className="font-heading font-semibold mb-3">Knowledge Sources ({sources.length})</h3>
        {loading ? (
          <div className="text-sm text-zinc-500 animate-pulse">Loading...</div>
        ) : sources.length === 0 ? (
          <div className="text-center py-10 bg-zinc-900/30 border border-white/5 rounded-lg">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No knowledge sources yet. Add text or URLs above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.source_id} data-testid={`knowledge-source-${s.source_id}`} className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-lg px-4 py-3">
                {s.type === "url" ? <Globe className="w-4 h-4 text-blue-400" /> : <FileText className="w-4 h-4 text-[#7C3AED]" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-zinc-500">{s.type} {s.chunk_count ? `| ${s.chunk_count} chunks` : ""}</p>
                </div>
                {s.status === "completed" ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : s.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSource(s.source_id)}
                  className="text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
