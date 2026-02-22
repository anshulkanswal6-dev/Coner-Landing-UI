import { useState } from "react";
import axios from "axios";
import { Send, Sparkles, AlertCircle, TrendingUp } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CopilotTab({ projectId }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your analytics copilot. Ask me anything about your data. For example:\n\n• How many leads did we get this week?\n• What's the satisfaction trend?\n• Show me top pain points",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendQuery = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/projects/${projectId}/analytics/copilot/ask`,
        { query: userMsg },
        { withCredentials: true }
      );

      const { status, data, explanation, error } = res.data;

      if (status === "success") {
        // Format the response nicely
        let responseText = explanation || "Here's what I found:";
        
        // Add data summary if available
        if (data) {
          responseText += "\n\n**Data:**";
          Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'object' && !Array.isArray(value)) {
              responseText += `\n• ${key}:`;
              Object.entries(value).forEach(([k, v]) => {
                responseText += `\n  - ${k}: ${v}`;
              });
            } else if (Array.isArray(value)) {
              responseText += `\n• ${key}:`;
              value.forEach((item) => {
                if (typeof item === 'object') {
                  responseText += `\n  - ${item.keyword || item.name || 'item'}: ${item.count || item.value || ''}`;
                } else {
                  responseText += `\n  - ${item}`;
                }
              });
            } else {
              responseText += `\n• ${key}: ${value}`;
            }
          });
        }

        setMessages((prev) => [...prev, { role: "assistant", content: responseText }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${explanation || error || "I couldn't process that query. Please try rephrasing."}` },
        ]);
      }
    } catch (err) {
      console.error("Copilot error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="copilot-tab" className="h-[600px] flex flex-col bg-zinc-900/30 border border-white/5 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-white/5 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-heading font-semibold text-white">Talk to Corner</h3>
        </div>
        <p className="text-xs text-zinc-400 mt-1">Ask questions about your analytics data</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800/50 border border-white/5 text-zinc-200"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-medium text-purple-400">Corner AI</span>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap">
                {msg.content.split('\n').map((line, idx) => {
                  // Bold formatting
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <div key={idx} className="font-semibold mt-2 mb-1">
                        {line.replace(/\*\*/g, '')}
                      </div>
                    );
                  }
                  // Bullet points
                  if (line.startsWith('•')) {
                    return (
                      <div key={idx} className="ml-2 text-zinc-300">
                        {line}
                      </div>
                    );
                  }
                  // Sub-bullets
                  if (line.trim().startsWith('-')) {
                    return (
                      <div key={idx} className="ml-6 text-zinc-400 text-xs">
                        {line.trim()}
                      </div>
                    );
                  }
                  return <div key={idx}>{line || <br />}</div>;
                })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800/50 border border-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="text-xs text-zinc-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendQuery} className="border-t border-white/5 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your analytics..."
            disabled={loading}
            className="flex-1 bg-zinc-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2">💡 Try: "How many leads this week?" or "What's the satisfaction rate?"</p>
      </form>
    </div>
  );
}
