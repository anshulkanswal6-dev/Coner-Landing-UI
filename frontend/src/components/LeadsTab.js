import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Users, Mail, Phone, FileText, Eye, Download, Search, 
  Calendar, MessageSquare, Clock, User, Building 
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUSES = ["New", "Contacted", "Qualified", "Closed"];
const STATUS_COLORS = {
  New: "bg-blue-500 text-white",
  Contacted: "bg-yellow-500 text-white",
  Qualified: "bg-green-500 text-white",
  Closed: "bg-zinc-600 text-white",
};

export default function LeadsTab({ projectId }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [responseMethod, setResponseMethod] = useState("email");
  const [leadStatus, setLeadStatus] = useState("New");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchLeads(); }, [projectId]);

  const fetchLeads = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/leads`, { withCredentials: true });
      setLeads(res.data);
    } catch { toast.error("Failed to load leads"); }
    finally { setLoading(false); }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      await axios.put(
        `${API}/projects/${projectId}/leads/${leadId}`,
        { status: newStatus },
        { withCredentials: true }
      );
      setLeads(prev => prev.map(l => l.lead_id === leadId ? { ...l, status: newStatus } : l));
      toast.success(`Lead moved to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const openLeadModal = (lead) => {
    setSelectedLead(lead);
    setAdminNotes(lead.admin_notes || "");
    setResponseMethod(lead.preferred_contact || "email");
    setLeadStatus(lead.status || "New");
    setModalOpen(true);
  };

  const saveLeadDetails = async () => {
    if (!selectedLead) return;
    setSaving(true);
    try {
      await axios.put(
        `${API}/projects/${projectId}/leads/${selectedLead.lead_id}/details`,
        { 
          admin_notes: adminNotes, 
          preferred_contact: responseMethod,
          status: leadStatus 
        },
        { withCredentials: true }
      );
      toast.success("Lead updated successfully");
      setModalOpen(false);
      fetchLeads();
    } catch { 
      toast.error("Failed to update lead"); 
    } finally {
      setSaving(false);
    }
  };

  const downloadCSV = async () => {
    try {
      const res = await axios.get(
        `${API}/projects/${projectId}/leads/export`, 
        { 
          withCredentials: true,
          responseType: 'blob'
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_${projectId}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Lead sheet downloaded");
    } catch {
      toast.error("Failed to download leads");
    }
  };

  // Filter and search
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesSearch = !searchQuery || 
      (lead.name && lead.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.phone && lead.phone.includes(searchQuery));
    return matchesStatus && matchesSearch;
  });

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  if (loading) return (
    <div className="text-zinc-500 animate-pulse py-10 text-center">Loading leads...</div>
  );

  return (
    <div data-testid="leads-tab" className="space-y-4">
      {/* Header with Search, Filter, and Download */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-lg">Lead Management</h3>
          <p className="text-xs text-zinc-500 mt-1">{leads.length} total leads captured</p>
        </div>
        
        <div className="flex gap-2 items-center w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:flex-none md:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900/50 border-white/10 text-sm h-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-zinc-900/50 border-white/10 text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark bg-zinc-900 border-white/10">
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Download Button */}
          <Button 
            onClick={downloadCSV}
            size="sm"
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-9"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900/80 sticky top-0">
              <tr className="border-b border-white/10 text-xs text-zinc-400">
                <th className="text-left px-4 py-3 font-medium">Lead ID</th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Phone</th>
                <th className="text-left px-4 py-3 font-medium">Query</th>
                <th className="text-left px-4 py-3 font-medium">Source</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-sm text-zinc-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    No leads found
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr 
                    key={lead.lead_id} 
                    className="border-b border-white/5 hover:bg-zinc-800/30 transition-colors text-sm"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zinc-500">
                        {lead.lead_id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-medium">{lead.name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        {lead.email ? (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[180px]">{lead.email}</span>
                          </>
                        ) : "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        {lead.phone ? (
                          <>
                            <Phone className="w-3.5 h-3.5" />
                            {lead.phone}
                          </>
                        ) : "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 max-w-xs">
                      <span className="line-clamp-2 text-xs">
                        {lead.query_objective || lead.requirements || lead.details || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-500">
                        {lead.source || "chatbot"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Select 
                        value={lead.status || "New"} 
                        onValueChange={(newStatus) => updateLeadStatus(lead.lead_id, newStatus)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs border-white/10 bg-zinc-800/50">
                          <SelectValue>
                            <span className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status || 'New']}`}>
                              {lead.status || "New"}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="dark bg-zinc-900 border-white/10">
                          {STATUSES.map(s => (
                            <SelectItem key={s} value={s} className="text-xs">
                              <span className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[s]}`}>
                                {s}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        onClick={() => openLeadModal(lead)}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs hover:bg-[#7C3AED]/10 hover:text-[#7C3AED]"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Details Modal - FIXED UI */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="dark bg-zinc-950 border-white/20 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Lead Details</DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6 mt-6">
              {/* User Details Section */}
              <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#7C3AED]" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">User Information</h4>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Full Name</Label>
                    <p className="text-sm text-white font-medium">{selectedLead.name || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Email</Label>
                    <p className="text-sm text-white">{selectedLead.email || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Phone</Label>
                    <p className="text-sm text-white">{selectedLead.phone || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Lead ID</Label>
                    <p className="text-sm text-zinc-400 font-mono">{selectedLead.lead_id}</p>
                  </div>
                </div>
              </div>

              {/* Query Information Section */}
              <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Query Information</h4>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Query Objective</Label>
                    <p className="text-sm text-white leading-relaxed">
                      {selectedLead.query_objective || selectedLead.requirements || "No specific objective provided"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Detailed User Need</Label>
                    <p className="text-sm text-white leading-relaxed">
                      {selectedLead.user_need || selectedLead.details || "No additional details provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Availability Section */}
              {selectedLead.availability && (
                <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-[#7C3AED]" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">Availability for Meeting</h4>
                  </div>
                  <p className="text-sm text-white">{selectedLead.availability}</p>
                </div>
              )}

              {/* Admin Response Section */}
              <div className="bg-gradient-to-br from-[#7C3AED]/10 to-transparent border border-[#7C3AED]/30 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#7C3AED]/30 flex items-center justify-center">
                    <Building className="w-4 h-4 text-[#7C3AED]" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Admin Response</h4>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-300 font-medium">Response Method</Label>
                    <Select value={responseMethod} onValueChange={setResponseMethod}>
                      <SelectTrigger className="bg-zinc-900 border-white/20 text-white h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark bg-zinc-900 border-white/10">
                        <SelectItem value="email">📧 Email</SelectItem>
                        <SelectItem value="phone">📞 Phone Call</SelectItem>
                        <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                        <SelectItem value="meeting">🗓️ Schedule Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-300 font-medium">Admin Notes</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes, action items, or follow-up details..."
                      className="bg-zinc-900 border-white/20 text-white placeholder:text-zinc-500 min-h-[120px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-300 font-medium">Mark Status</Label>
                    <Select value={leadStatus} onValueChange={setLeadStatus}>
                      <SelectTrigger className="bg-zinc-900 border-white/20 text-white h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark bg-zinc-900 border-white/10">
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s}>
                            <span className={`px-2 py-1 rounded-full ${STATUS_COLORS[s]}`}>
                              {s}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={saveLeadDetails}
                    disabled={saving}
                    className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-10 font-medium"
                  >
                    {saving ? "Saving..." : "💾 Save & Update Lead"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
