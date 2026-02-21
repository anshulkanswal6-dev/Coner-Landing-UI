import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Globe, Type, Trash2, CheckCircle, XCircle, Loader2, Upload, RefreshCw, HardDrive } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function KnowledgeTab({ projectId }) {
  const [sources, setSources] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [textForm, setTextForm] = useState({ title: "", content: "" });
  const [urlForm, setUrlForm] = useState({ url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { 
    fetchSources();
    fetchFiles();
    fetchSyncStatus();
  }, [projectId]);

  const fetchSources = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/knowledge`, { withCredentials: true });
      setSources(res.data);
    } catch { toast.error("Failed to load knowledge sources"); }
    finally { setLoading(false); }
  };

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/knowledge/files`, { withCredentials: true });
      setFiles(res.data);
    } catch { /* Ignore if endpoint not available */ }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/knowledge/sync/status`, { withCredentials: true });
      setSyncStatus(res.data);
    } catch { /* Ignore */ }
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is 10 MB. Your file: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      return;
    }

    // Validate type
    const allowedTypes = ['.pdf', '.docx', '.pptx', '.txt', '.xlsx', '.xls'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      toast.error(`Unsupported file type. Allowed: PDF, DOCX, PPTX, TXT, XLSX`);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/projects/${projectId}/knowledge/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${file.name} uploaded and processed successfully`);
      fetchFiles();
      fetchSources();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId) => {
    try {
      await axios.delete(`${API}/projects/${projectId}/knowledge/files/${fileId}`, { withCredentials: true });
      setFiles(files.filter(f => f.source_id !== fileId));
      toast.success("Document deleted");
    } catch { toast.error("Failed to delete file"); }
  };

  const deleteSource = async (sourceId) => {
    try {
      await axios.delete(`${API}/projects/${projectId}/knowledge/${sourceId}`, { withCredentials: true });
      setSources(sources.filter(s => s.source_id !== sourceId));
      toast.success("Knowledge source deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const syncWebsite = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/projects/${projectId}/knowledge/sync`, {}, { withCredentials: true });
      toast.success(`Website synced! Crawled ${res.data.pages_crawled} pages, created ${res.data.chunks_created} knowledge chunks.`);
      fetchSyncStatus();
      fetchSources();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to sync website");
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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
          <TabsTrigger value="documents" data-testid="knowledge-documents-tab" className="data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white text-xs">
            <HardDrive className="w-3 h-3 mr-1" /> Documents
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

          {/* Website Sync Section */}
          <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-lg p-5 mt-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-400" />
              Website Sync
            </h4>
            <p className="text-xs text-zinc-400 mb-3">
              Re-crawl your website to update AI knowledge with latest content and navigation.
            </p>
            
            {syncStatus && syncStatus.status !== 'never_synced' && (
              <div className="mb-3 text-xs text-zinc-500">
                <p>Last synced: <span className="text-zinc-300">{formatDate(syncStatus.completed_at || syncStatus.started_at)}</span></p>
                {syncStatus.pages_crawled && (
                  <p>Pages crawled: <span className="text-zinc-300">{syncStatus.pages_crawled}</span></p>
                )}
              </div>
            )}

            <Button
              onClick={syncWebsite}
              disabled={syncing}
              className="bg-blue-500 hover:bg-blue-600 text-white"
              size="sm"
            >
              {syncing ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Syncing Website...</>
              ) : (
                <><RefreshCw className="w-3.5 h-3.5 mr-2" />Sync Now</>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5 space-y-4">
            <div>
              <Label className="text-zinc-300 text-sm mb-2 block">Upload Document</Label>
              <p className="text-xs text-zinc-500 mb-3">
                Supported: PDF, DOCX, PPTX, TXT, XLSX (Max 10 MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.pptx,.txt,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Choose File</>
                )}
              </Button>
            </div>

            {/* Uploaded Files List */}
            {files.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Uploaded Documents ({files.length})</h4>
                <div className="space-y-2">
                  {files.map((file) => (
                    <div key={file.source_id} className="flex items-center gap-3 bg-zinc-800/50 border border-white/10 rounded-lg px-4 py-3">
                      <FileText className="w-4 h-4 text-[#7C3AED]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-zinc-500">
                          {file.file_type?.toUpperCase()} | {formatFileSize(file.file_size)}
                          {file.chunk_count && ` | ${file.chunk_count} chunks`}
                        </p>
                      </div>
                      {file.status === "completed" ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : file.status === "failed" ? (
                        <XCircle className="w-4 h-4 text-red-400" title={file.error} />
                      ) : (
                        <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFile(file.source_id)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* All Sources List */}
      <div>
        <h3 className="font-heading font-semibold mb-3">All Knowledge Sources ({sources.length})</h3>
        {loading ? (
          <div className="text-sm text-zinc-500 animate-pulse">Loading...</div>
        ) : sources.length === 0 ? (
          <div className="text-center py-10 bg-zinc-900/30 border border-white/5 rounded-lg">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No knowledge sources yet. Add text, URLs, or upload documents above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.source_id} data-testid={`knowledge-source-${s.source_id}`} className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-lg px-4 py-3">
                {s.type === "url" ? (
                  <Globe className="w-4 h-4 text-blue-400" />
                ) : s.type === "document" ? (
                  <HardDrive className="w-4 h-4 text-purple-400" />
                ) : (
                  <FileText className="w-4 h-4 text-[#7C3AED]" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-zinc-500">
                    {s.type}
                    {s.chunk_count && ` | ${s.chunk_count} chunks`}
                    {s.file_size && ` | ${formatFileSize(s.file_size)}`}
                  </p>
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
