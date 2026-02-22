import React from "react";
import { WobbleCard } from "./WobbleCard";
import { Bot, Zap, Shield, Target } from "lucide-react";

const FeatureGrid = () => {
    return (
        <section className="py-32 px-6 bg-[#F9F9FB] overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                    <div className="max-w-2xl text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-[11px] font-black mb-6 uppercase tracking-[0.2em]">
                            Core Capabilities
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter font-display leading-[0.85]">
                            Engineered for <br /> <span className="text-primary italic">High Performance</span>
                        </h2>
                    </div>
                    <p className="text-lg text-slate-500 font-medium max-w-sm text-left md:text-right leading-tight">
                        Built on next-gen infrastructure to ensure your customer acquisition never sleeps.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Card 1: Main Feature */}
                    <WobbleCard
                        containerClassName="col-span-1 lg:col-span-2 bg-slate-950 min-h-[500px] lg:min-h-[400px]"
                        className=""
                    >
                        <div className="max-w-xs">
                            <h2 className="text-left text-balance text-2xl md:text-4xl font-black tracking-tighter text-white font-display leading-none">
                                AI-Powered Acquisition at Scale
                            </h2>
                            <p className="mt-6 text-left text-lg text-slate-300 font-medium leading-snug">
                                Coner.AI deploys intelligent agents that don't just chat—they convert. Qualify leads 24/7.
                            </p>
                        </div>
                        <div className="absolute right-[-10%] top-[10%] lg:right-[-5%] xl:right-[0%] w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                        <Bot className="absolute right-10 bottom-10 text-white/5" size={200} strokeWidth={1} />
                    </WobbleCard>

                    {/* Card 2: Speed */}
                    <WobbleCard containerClassName="col-span-1 bg-primary min-h-[400px]">
                        <h2 className="max-w-80 text-left text-balance text-2xl md:text-4xl font-black tracking-tighter text-white font-display leading-none">
                            Universal <br /> Deployment
                        </h2>
                        <p className="mt-6 max-w-[26rem] text-left text-lg text-white/90 font-medium leading-snug">
                            One line of code. Any platform. Shopify, Webflow, or custom stacks.
                        </p>
                        <Zap className="absolute right-4 bottom-4 text-white/10" size={120} strokeWidth={1} />
                    </WobbleCard>

                    {/* Card 3: Security */}
                    <WobbleCard containerClassName="col-span-1 bg-orange-500 border border-orange-400 min-h-[400px]">
                        <h2 className="max-w-80 text-left text-balance text-2xl md:text-4xl font-black tracking-tighter text-white font-display leading-none">
                            Enterprise <br /> Security
                        </h2>
                        <p className="mt-6 max-w-[26rem] text-left text-lg text-white/90 font-medium leading-snug">
                            Secure, SOC2 compliant, and privacy-first design for modern teams.
                        </p>
                        <Shield className="absolute right-4 bottom-4 text-white/10" size={120} strokeWidth={1} />
                    </WobbleCard>

                    {/* Card 4: Targeting */}
                    <WobbleCard containerClassName="col-span-1 lg:col-span-2 bg-slate-900 min-h-[500px] lg:min-h-[400px]">
                        <div className="max-w-sm">
                            <h2 className="text-left text-balance text-2xl md:text-4xl font-black tracking-tighter text-white font-display leading-none">
                                Qualified Lead Injection
                            </h2>
                            <p className="mt-6 text-left text-lg text-slate-300 font-medium leading-snug">
                                Stop wasting time on "just looking". Our agents identify high-intent visitors and push them directly to your CRM.
                            </p>
                        </div>
                        <Target className="absolute right-10 bottom-10 text-white/5" size={180} strokeWidth={1} />
                    </WobbleCard>
                </div>
            </div>
        </section>
    );
};

export default FeatureGrid;
