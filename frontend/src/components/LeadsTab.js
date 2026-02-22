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
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[lead.status || 'New']}`}>
                        {lead.status || "New"}
                      </span>
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

      {/* Lead Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="dark bg-zinc-900 border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Lead Details</DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6 mt-4">
              {/* User Details */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#7C3AED]" />
                  User Information
                </h4>
                <div className="grid md:grid-cols-2 gap-3 bg-zinc-800/30 border border-white/5 rounded-lg p-4">
                  <div>
                    <Label className="text-xs text-zinc-500">Full Name</Label>
                    <p className="text-sm mt-1">{selectedLead.name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Email</Label>
                    <p className="text-sm mt-1">{selectedLead.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Phone</Label>
                    <p className="text-sm mt-1">{selectedLead.phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Lead ID</Label>
                    <p className="text-sm mt-1 font-mono">{selectedLead.lead_id}</p>
                  </div>
                </div>
              </div>

              {/* Query Information */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
                  Query Information
                </h4>
                <div className="space-y-3 bg-zinc-800/30 border border-white/5 rounded-lg p-4">
                  <div>
                    <Label className="text-xs text-zinc-500">Query Objective</Label>
                    <p className="text-sm mt-1">
                      {selectedLead.query_objective || selectedLead.requirements || "No specific objective provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Detailed User Need</Label>
                    <p className="text-sm mt-1">
                      {selectedLead.user_need || selectedLead.details || "No additional details provided"}
                    </p>
                  </div>
                  {selectedLead.conversation_summary && (
                    <div>
                      <Label className="text-xs text-zinc-500">Conversation Summary</Label>
                      <p className="text-sm mt-1 text-zinc-400">{selectedLead.conversation_summary}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Availability */}
              {selectedLead.availability && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#7C3AED]" />
                    Availability for Meeting
                  </h4>
                  <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-4">
                    <p className="text-sm">{selectedLead.availability}</p>
                  </div>
                </div>
              )}

              {/* Admin Response Section */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#7C3AED]" />
                  Admin Response
                </h4>
                <div className="space-y-4 bg-zinc-800/30 border border-white/5 rounded-lg p-4">
                  <div>
                    <Label className="text-xs mb-2">Response Method</Label>
                    <Select value={responseMethod} onValueChange={setResponseMethod}>
                      <SelectTrigger className="bg-zinc-900 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark bg-zinc-900 border-white/10">
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="meeting">Schedule Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs mb-2">Admin Notes</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes, action items, or follow-up details..."
                      className="bg-zinc-900 border-white/10 min-h-[100px]"
                    />
                  </div>

                  <div>
                    <Label className="text-xs mb-2">Mark Status</Label>
                    <Select value={leadStatus} onValueChange={setLeadStatus}>
                      <SelectTrigger className="bg-zinc-900 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark bg-zinc-900 border-white/10">
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={saveLeadDetails}
                    disabled={saving}
                    className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                  >
                    {saving ? "Saving..." : "Save & Update Lead"}
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
