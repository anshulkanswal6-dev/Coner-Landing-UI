import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import KnowledgeTab from "@/components/KnowledgeTab";
import GoldenRulesTab from "@/components/GoldenRulesTab";
import SandboxTab from "@/components/SandboxTab";
import WidgetConfigTab from "@/components/WidgetConfigTab";
import AnalyticsTab from "@/components/AnalyticsTab";
import LeadsTab from "@/components/LeadsTab";
import FeedbackTab from "@/components/FeedbackTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, Shield, TestTube, Code, BarChart3, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("knowledge");

  useEffect(() => { fetchProject(); }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}`, { withCredentials: true });
      setProject(res.data);
    } catch {
      toast.error("Failed to load project");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-zinc-500">Loading project...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) return null;

  const tabs = [
    { id: "knowledge", label: "Knowledge", icon: Database },
    { id: "rules", label: "Golden Rules", icon: Shield },
    { id: "sandbox", label: "Test Bot", icon: TestTube },
    { id: "widget", label: "Deploy", icon: Code },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "leads", label: "Leads", icon: Users },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
  ];

  return (
    <DashboardLayout>
      <div data-testid="project-detail-page">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            data-testid="back-to-dashboard-btn"
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="font-heading font-bold text-2xl">{project.name}</h1>
            <p className="text-sm text-zinc-500">{project.description || "No description"}</p>
          </div>
          <span className={`ml-auto text-xs px-2.5 py-1 rounded-full ${
            project.status === 'deployed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
            project.status === 'testing' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
            'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}>
            {project.status || 'draft'}
          </span>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-zinc-900/50 border border-white/5 p-1 rounded-lg flex flex-wrap gap-1 h-auto">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                data-testid={`tab-${t.id}`}
                className="data-[state=active]:bg-[#7C3AED] data-[state=active]:text-white text-zinc-400 rounded-md text-xs px-3 py-2 flex items-center gap-1.5 transition-all"
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="knowledge"><KnowledgeTab projectId={projectId} /></TabsContent>
            <TabsContent value="rules"><GoldenRulesTab projectId={projectId} /></TabsContent>
            <TabsContent value="sandbox"><SandboxTab project={project} /></TabsContent>
            <TabsContent value="widget"><WidgetConfigTab project={project} /></TabsContent>
            <TabsContent value="analytics"><AnalyticsTab projectId={projectId} /></TabsContent>
            <TabsContent value="leads"><LeadsTab projectId={projectId} /></TabsContent>
            <TabsContent value="feedback"><FeedbackTab projectId={projectId} /></TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
