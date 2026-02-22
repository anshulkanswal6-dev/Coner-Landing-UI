import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Code, Zap, Globe, ShieldCheck } from 'lucide-react';

const IntegrationSection = () => {
    const [copied, setCopied] = useState(false);

    const codeSnippet = `<script
  src="https://cdn.coner.ai/widget.js"
  data-id="YOUR_UNIQUE_ID"
  async
></script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(codeSnippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const steps = [
        {
            title: "Connect Your Data",
            description: "Sync your CRM, website content, or docs to train your AI.",
            icon: Zap,
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            title: "Copy the Script",
            description: "Get your personalized integration script from the dashboard.",
            icon: Code,
            color: "text-purple-500",
            bg: "bg-purple-50"
        },
        {
            title: "Go Live Instantly",
            description: "Paste it on your site and watch your AI start converting.",
            icon: Globe,
            color: "text-green-500",
            bg: "bg-green-50"
        }
    ];

    return (
        <section id="integrate" className="py-32 px-6 bg-[#F9F9FB] relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row gap-20 items-center">
                    {/* Left: Content */}
                    <div className="flex-1 space-y-12">
                        <div>
                            <span className="px-5 py-2 rounded-full border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-8 inline-block">
                                Simple Setup
                            </span>
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 leading-[0.9]">
                                Integrate Coner <br /> In <span className="text-primary italic">60 Seconds.</span>
                            </h2>
                            <p className="text-xl text-slate-500 font-medium leading-tight max-w-xl">
                                No complex API calls. No backend setup. Just one line of code to transform your website into a high-converting machine.
                            </p>
                        </div>

                        <div className="space-y-8">
                            {steps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-start gap-6 group"
                                >
                                    <div className={`w-14 h-14 rounded-2xl ${step.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                        <step.icon className={`w-7 h-7 ${step.color}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">{step.title}</h3>
                                        <p className="text-slate-500 font-medium">{step.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Code Block / Visual */}
                    <div className="flex-1 w-full lg:w-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            className="relative"
                        >
                            {/* Decorative elements */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />

                            <div className="bg-[#0F1117] rounded-[40px] overflow-hidden shadow-2xl shadow-primary/20 border border-white/5 relative z-10">
                                {/* Window Header */}
                                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                                        <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                                    </div>
                                    <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                        <ShieldCheck size={14} />
                                        Secure Script
                                    </div>
                                </div>

                                {/* Code Content */}
                                <div className="p-8 md:p-12">
                                    <div className="relative group">
                                        <pre className="font-mono text-sm md:text-base leading-loose">
                                            <code className="text-white/90">
                                                <span className="text-purple-400">{"<"}script</span>
                                                <br />
                                                {"  "}src=<span className="text-green-400">"https://cdn.coner.ai/widget.js"</span>
                                                <br />
                                                {"  "}data-id=<span className="text-green-400">"YOUR_UNIQUE_ID"</span>
                                                <br />
                                                {"  "}<span className="text-purple-400">async</span>
                                                <br />
                                                <span className="text-purple-400">{">"}{"</"}script{">"}</span>
                                            </code>
                                        </pre>

                                        <button
                                            onClick={handleCopy}
                                            className="absolute top-0 right-0 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95"
                                        >
                                            {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                                        </button>
                                    </div>

                                    <div className="mt-12 pt-12 border-t border-white/5">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="text-white font-bold">Universal Compatibility</p>
                                                <p className="text-white/40 text-sm">React, Next.js, Webflow, Shopify, HTML</p>
                                            </div>
                                            <div className="flex -space-x-3">
                                                {[
                                                    { name: 'React', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
                                                    { name: 'Next.js', icon: 'https://cdn.worldvectorlogo.com/logos/next-js.svg' },
                                                    { name: 'HTML5', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg' }
                                                ].map((stack) => (
                                                    <div key={stack.name} className="w-10 h-10 rounded-full border-2 border-[#0F1117] bg-white flex items-center justify-center overflow-hidden p-2 shadow-xl">
                                                        <img src={stack.icon} alt={stack.name} className="w-full h-full object-contain" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default IntegrationSection;
