import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Zap, Bot, BarChart3, MessageSquare, Upload, Shield, ChevronRight, ArrowRight, Sparkles, Target, Brain
} from "lucide-react";

const features = [
  { icon: Bot, title: "AI Agents in Minutes", desc: "Create custom-trained AI assistants with zero coding. Just upload your data and deploy." },
  { icon: Upload, title: "Knowledge Injection", desc: "Feed your agent with website URLs, documents, or manual Q&A pairs instantly." },
  { icon: Shield, title: "Golden Rules Engine", desc: "Control exactly what your AI says with preset and custom behavioral guardrails." },
  { icon: Target, title: "Lead Capture", desc: "Automatically detect and qualify leads from conversations with structured extraction." },
  { icon: BarChart3, title: "Conversation Intelligence", desc: "Understand customer pain points, trending topics, and knowledge gaps." },
  { icon: Brain, title: "Self-Improving AI", desc: "Feedback loop with corrections that make your agent smarter over time." },
];

const steps = [
  { num: "01", title: "Create Your Agent", desc: "Name your project and configure the basic personality of your AI assistant." },
  { num: "02", title: "Add Knowledge", desc: "Upload documents, paste URLs, or manually add Q&A pairs to train your agent." },
  { num: "03", title: "Deploy Anywhere", desc: "Copy one line of code and paste it into any website. Your agent goes live instantly." },
];

export default function LandingPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/coner-logo.png" alt="Coner AI" className="w-8 h-8 rounded-lg" />
            <span className="font-heading font-bold text-lg">Coner AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-[#7C3AED] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#7C3AED] transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-[#7C3AED] transition-colors">Pricing</a>
          </div>
          <Button
            data-testid="nav-login-btn"
            onClick={login}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-md shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 transition-all duration-200"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="opacity-0 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f3e8ff] text-[#7C3AED] text-xs font-medium mb-6">
              <Sparkles className="w-3 h-3" />
              AI-Powered Customer Agents
            </div>
            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6">
              Transform Data Into{" "}
              <span className="text-[#7C3AED]">Intelligent Agents</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
              Build, deploy, and continuously improve custom AI chatbots for your business.
              No coding required. Live in under 5 minutes.
            </p>
            <div className="flex items-center gap-4">
              <Button
                data-testid="hero-get-started-btn"
                onClick={login}
                size="lg"
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-md shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 transition-all duration-200 text-base px-8"
              >
                Start Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-[#7C3AED] flex items-center gap-1 transition-colors">
                See how it works <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="opacity-0 animate-fade-in-up stagger-2 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED]/10 to-[#2dd4bf]/10 rounded-2xl blur-3xl" />
            <div className="relative bg-[#09090b] rounded-2xl p-6 border border-zinc-800 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-zinc-500 ml-2 font-mono">EmergentPulse Dashboard</span>
              </div>
              <div className="space-y-3">
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-zinc-400">Active Agents</span>
                    <span className="text-2xl font-heading font-bold text-white">12</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#7C3AED] rounded-full" style={{width: '75%'}} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                    <span className="text-xs text-zinc-500">Conversations</span>
                    <p className="text-lg font-heading font-bold text-white">2,847</p>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                    <span className="text-xs text-zinc-500">Leads Captured</span>
                    <p className="text-lg font-heading font-bold text-[#2dd4bf]">384</p>
                  </div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-3 h-3 text-[#7C3AED]" />
                    <span className="text-xs text-zinc-400">Latest Chat</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-mono">"What are your pricing plans?"</p>
                  <p className="text-xs text-[#2dd4bf] font-mono mt-1">"We offer three tiers starting at..."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl sm:text-4xl mb-4">Everything You Need</h2>
            <p className="text-base text-slate-600 max-w-2xl mx-auto">
              A complete platform to build, deploy, and evolve intelligent customer agents.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                data-testid={`feature-card-${i}`}
                className="bg-white border border-slate-200/60 rounded-xl p-6 hover:shadow-lg hover:border-[#7C3AED]/20 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-lg bg-[#f3e8ff] flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl sm:text-4xl mb-4">Three Steps to Launch</h2>
            <p className="text-base text-slate-600">Deploy your AI agent in under 5 minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} data-testid={`step-card-${i}`} className="text-center">
                <div className="text-5xl font-heading font-bold text-[#7C3AED]/10 mb-4">{s.num}</div>
                <h3 className="font-heading font-semibold text-xl mb-3">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#09090b]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-6">
            Ready to Transform Your Customer Experience?
          </h2>
          <p className="text-base text-zinc-400 mb-8">
            Join businesses using EmergentPulse AI to automate support, capture leads, and gain insights.
          </p>
          <Button
            data-testid="cta-get-started-btn"
            onClick={login}
            size="lg"
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-md shadow-lg shadow-[#7C3AED]/30 hover:-translate-y-0.5 transition-all duration-200 text-base px-8"
          >
            Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#7C3AED]" />
            <span className="font-heading font-medium text-slate-700">EmergentPulse AI</span>
          </div>
          <span>Built with Emergent</span>
        </div>
      </footer>
    </div>
  );
}
