import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Mail, Phone, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUSES = ["New", "Contacted", "Qualified", "Closed"];
const STATUS_COLORS = {
  New: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Qualified: "bg-green-500/10 text-green-400 border-green-500/20",
  Closed: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

export default function LeadsTab({ projectId }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchLeads(); }, [projectId]);

  const fetchLeads = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/leads`, { withCredentials: true });
      setLeads(res.data);
    } catch { toast.error("Failed to load leads"); }
    finally { setLoading(false); }
  };

  const updateStatus = async (leadId, status) => {
    try {
      await axios.put(`${API}/projects/${projectId}/leads/${leadId}`, { status }, { withCredentials: true });
      setLeads(prev => prev.map(l => l.lead_id === leadId ? { ...l, status } : l));
      toast.success(`Lead moved to ${status}`);
    } catch { toast.error("Failed to update lead"); }
  };

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);

  if (loading) return <div className="text-zinc-500 animate-pulse py-10 text-center">Loading leads...</div>;

  return (
    <div data-testid="leads-tab" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold">Lead Management</h3>
          <p className="text-xs text-zinc-500 mt-1">{leads.length} total leads captured</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger data-testid="lead-filter-select" className="w-36 bg-zinc-900/50 border-white/10 text-sm">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="dark bg-zinc-900 border-white/10">
            <SelectItem value="all">All Leads</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban-style columns */}
      <div className="grid md:grid-cols-4 gap-4">
        {STATUSES.map(status => {
          const statusLeads = leads.filter(l => l.status === status);
          return (
            <div key={status} data-testid={`lead-column-${status.toLowerCase()}`} className="bg-zinc-900/30 border border-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[status]}`}>{status}</span>
                <span className="text-xs text-zinc-600">{statusLeads.length}</span>
              </div>
              <div className="space-y-2">
                {statusLeads.map(lead => (
                  <div key={lead.lead_id} data-testid={`lead-card-${lead.lead_id}`} className="bg-zinc-900/50 border border-white/5 rounded-lg p-3 hover:border-[#7C3AED]/20 transition-all">
                    <p className="text-sm font-medium mb-2">{lead.name || "Unknown"}</p>
                    {lead.email && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                        <Mail className="w-3 h-3" /> {lead.email}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                        <Phone className="w-3 h-3" /> {lead.phone}
                      </div>
                    )}
                    {lead.requirements && (
                      <div className="flex items-start gap-1.5 text-xs text-zinc-500 mt-2">
                        <FileText className="w-3 h-3 mt-0.5" />
                        <span className="line-clamp-2">{lead.requirements}</span>
                      </div>
                    )}
                    <div className="mt-3">
                      <Select value={lead.status} onValueChange={(v) => updateStatus(lead.lead_id, v)}>
                        <SelectTrigger className="h-7 text-xs bg-zinc-800/50 border-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark bg-zinc-900 border-white/10">
                          {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                {statusLeads.length === 0 && (
                  <p className="text-xs text-zinc-600 text-center py-4">No leads</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table view for filtered */}
      {filter !== "all" && filtered.length > 0 && (
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-xs text-zinc-500">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Phone</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.lead_id} className="border-b border-white/5 text-sm">
                  <td className="px-4 py-3">{l.name || "-"}</td>
                  <td className="px-4 py-3 text-zinc-400">{l.email || "-"}</td>
                  <td className="px-4 py-3 text-zinc-400">{l.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[l.status]}`}>{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
