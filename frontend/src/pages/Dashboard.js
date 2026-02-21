import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Bot, MessageSquare, Users, BarChart3, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", welcome_message: "Hi! How can I help you today?" });
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API}/projects`, { withCredentials: true });
      setProjects(res.data);
    } catch (err) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) return toast.error("Project name is required");
    setCreating(true);
    try {
      const res = await axios.post(`${API}/projects`, createForm, { withCredentials: true });
      setProjects([res.data, ...projects]);
      setShowCreate(false);
      setCreateForm({ name: "", description: "", welcome_message: "Hi! How can I help you today?" });
      toast.success("Project created");
      navigate(`/project/${res.data.project_id}`);
    } catch (err) {
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const totalConvos = projects.reduce((a, p) => a + (p.conversation_count || 0), 0);
  const totalLeads = projects.reduce((a, p) => a + (p.lead_count || 0), 0);

  return (
    <DashboardLayout>
      <div data-testid="dashboard-page" className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Bot, label: "Active Agents", value: projects.length, color: "#7C3AED" },
            { icon: MessageSquare, label: "Total Conversations", value: totalConvos, color: "#2dd4bf" },
            { icon: Users, label: "Leads Captured", value: totalLeads, color: "#f59e0b" },
          ].map((s, i) => (
            <div key={i} data-testid={`stat-card-${i}`} className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">{s.label}</span>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <p className="text-3xl font-heading font-bold mt-2">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Projects Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-xl">Your Projects</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                data-testid="project-search-input"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-zinc-900/50 border-white/10 text-sm w-48 focus:w-64 transition-all"
              />
            </div>
            <Button
              data-testid="create-project-btn"
              onClick={() => setShowCreate(true)}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-lg p-5 animate-pulse h-40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Bot className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">
              {projects.length === 0 ? "Create your first AI agent" : "No matching projects"}
            </h3>
            <p className="text-sm text-zinc-500 mb-6">
              {projects.length === 0 ? "Get started by creating a new project" : "Try a different search term"}
            </p>
            {projects.length === 0 && (
              <Button data-testid="empty-create-btn" onClick={() => setShowCreate(true)} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
                <Plus className="w-4 h-4 mr-2" /> Create Agent
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div
                key={p.project_id}
                data-testid={`project-card-${p.project_id}`}
                onClick={() => navigate(`/project/${p.project_id}`)}
                className="bg-zinc-900/50 border border-white/5 rounded-lg p-5 cursor-pointer hover:border-[#7C3AED]/30 hover:bg-zinc-900 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${p.primary_color || '#7C3AED'}20` }}>
                    <Bot className="w-5 h-5" style={{ color: p.primary_color || '#7C3AED' }} />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    p.status === 'deployed' ? 'bg-green-500/10 text-green-400' :
                    p.status === 'testing' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {p.status || 'draft'}
                  </span>
                </div>
                <h3 className="font-heading font-semibold mb-1 group-hover:text-[#7C3AED] transition-colors">{p.name}</h3>
                <p className="text-xs text-zinc-500 mb-4 line-clamp-2">{p.description || "No description"}</p>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{p.conversation_count || 0}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.lead_count || 0}</span>
                  <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[#7C3AED]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="dark bg-zinc-900 border-white/10 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Create New Agent</DialogTitle>
            <DialogDescription className="text-zinc-400">Configure your AI assistant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-zinc-300 text-sm">Agent Name</Label>
              <Input
                data-testid="project-name-input"
                placeholder="e.g., Customer Support Bot"
                value={createForm.name}
                onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                className="bg-zinc-800 border-white/10 mt-1.5"
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">Description</Label>
              <Textarea
                data-testid="project-desc-input"
                placeholder="What does this agent do?"
                value={createForm.description}
                onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                className="bg-zinc-800 border-white/10 mt-1.5"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">Welcome Message</Label>
              <Input
                data-testid="project-welcome-input"
                value={createForm.welcome_message}
                onChange={(e) => setCreateForm({...createForm, welcome_message: e.target.value})}
                className="bg-zinc-800 border-white/10 mt-1.5"
              />
            </div>
            <Button
              data-testid="create-project-submit-btn"
              onClick={handleCreate}
              disabled={creating}
              className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            >
              {creating ? "Creating..." : "Create Agent"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
