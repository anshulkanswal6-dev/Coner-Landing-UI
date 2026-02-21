import { useState, useEffect } from "react";
import axios from "axios";
import { BarChart3, MessageSquare, Users, ThumbsUp, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AnalyticsTab({ projectId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, [projectId]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/analytics`, { withCredentials: true });
      setAnalytics(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  if (loading) return <div className="text-zinc-500 animate-pulse py-10 text-center">Loading analytics...</div>;
  if (!analytics) return <div className="text-zinc-500 py-10 text-center">No analytics data yet</div>;

  const leadData = Object.entries(analytics.lead_stats || {}).map(([k, v]) => ({ name: k, value: v }));
  const COLORS = ["#7C3AED", "#2dd4bf", "#f59e0b", "#ef4444"];

  const stats = [
    { icon: MessageSquare, label: "Conversations", value: analytics.total_conversations, color: "#7C3AED" },
    { icon: BarChart3, label: "Messages", value: analytics.total_messages, color: "#2dd4bf" },
    { icon: Users, label: "Leads", value: analytics.total_leads, color: "#f59e0b" },
    { icon: ThumbsUp, label: "Satisfaction", value: `${analytics.satisfaction_rate}%`, color: "#22c55e" },
  ];

  const feedbackData = [
    { name: "Positive", value: analytics.positive_feedback },
    { name: "Negative", value: analytics.negative_feedback },
  ];

  return (
    <div data-testid="analytics-tab" className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} data-testid={`analytics-stat-${i}`} className="bg-zinc-900/50 border border-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">{s.label}</span>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-heading font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Feedback Chart */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Feedback Distribution</h3>
          {feedbackData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={feedbackData}>
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 12 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-zinc-600">No feedback data yet</div>
          )}
        </div>

        {/* Leads by Status */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Leads by Status</h3>
          {leadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={leadData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {leadData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-zinc-600">No lead data yet</div>
          )}
          {leadData.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {leadData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-zinc-400">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">Recent Conversations</h3>
        {analytics.recent_conversations?.length > 0 ? (
          <div className="space-y-2">
            {analytics.recent_conversations.map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-zinc-800/30 rounded-md px-3 py-2 text-xs">
                <span className="text-zinc-400 font-mono">{c.session_id?.slice(0, 20)}...</span>
                <span className="text-zinc-500">{c.message_count || 0} messages</span>
                <span className="text-zinc-600">{new Date(c.started_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600 text-center py-6">No conversations yet</p>
        )}
      </div>
    </div>
  );
}
