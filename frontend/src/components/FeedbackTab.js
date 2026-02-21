import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown, MessageSquare, Edit } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function FeedbackTab({ projectId }) {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [correction, setCorrection] = useState(null);
  const [correctionText, setCorrectionText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchFeedback(); }, [projectId]);

  const fetchFeedback = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/feedback`, { withCredentials: true });
      setFeedback(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const submitCorrection = async () => {
    if (!correctionText.trim() || !correction) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/projects/${projectId}/corrections`, {
        message_id: correction.message_id,
        corrected_response: correctionText
      }, { withCredentials: true });
      toast.success("Correction saved - the bot will learn from this");
      setCorrection(null);
      setCorrectionText("");
    } catch { toast.error("Failed to save correction"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-zinc-500 animate-pulse py-10 text-center">Loading feedback...</div>;

  return (
    <div data-testid="feedback-tab" className="space-y-6">
      <div>
        <h3 className="font-heading font-semibold">Feedback & Corrections</h3>
        <p className="text-xs text-zinc-500 mt-1">Review rated responses and provide corrections to improve your bot.</p>
      </div>

      {feedback.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/30 border border-white/5 rounded-lg">
          <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No feedback yet. Use the sandbox to test and rate responses.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <div key={f.message_id} data-testid={`feedback-item-${f.message_id}`} className="bg-zinc-900/50 border border-white/5 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {f.feedback === 1 ? (
                      <ThumbsUp className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className="text-xs text-zinc-500">{new Date(f.created_at).toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-600">User asked</span>
                      <p className="text-sm text-zinc-300 mt-0.5">{f.user_query}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-600">Bot answered</span>
                      <p className="text-sm text-zinc-400 mt-0.5">{f.assistant_response}</p>
                    </div>
                  </div>
                </div>
                {f.feedback === -1 && (
                  <Button
                    data-testid={`correct-btn-${f.message_id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => { setCorrection(f); setCorrectionText(f.assistant_response); }}
                    className="border-white/10 text-zinc-400 hover:text-[#7C3AED] shrink-0"
                  >
                    <Edit className="w-3 h-3 mr-1" /> Correct
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Correction Dialog */}
      <Dialog open={!!correction} onOpenChange={() => setCorrection(null)}>
        <DialogContent className="dark bg-zinc-900 border-white/10 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Provide Correction</DialogTitle>
          </DialogHeader>
          {correction && (
            <div className="space-y-4 mt-2">
              <div className="bg-zinc-800/50 rounded-md p-3">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">Original query</span>
                <p className="text-sm text-zinc-300 mt-1">{correction.user_query}</p>
              </div>
              <div>
                <span className="text-sm text-zinc-400 mb-1.5 block">Corrected response</span>
                <Textarea
                  data-testid="correction-text-input"
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  className="bg-zinc-800 border-white/10 min-h-[120px]"
                  placeholder="Enter the correct response..."
                />
              </div>
              <Button
                data-testid="submit-correction-btn"
                onClick={submitCorrection}
                disabled={submitting}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                {submitting ? "Saving..." : "Save Correction"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
