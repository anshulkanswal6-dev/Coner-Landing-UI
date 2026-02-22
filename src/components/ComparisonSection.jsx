import React from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';

const ComparisonSection = () => {
    const traditional = [
        "Tools live in too many places",
        "Reporting eats up hours",
        "Insights are too generic",
        "No smart guidance for decisions",
        "Hard to see what's really working"
    ];

    const coner = [
        "All your metrics, one platform",
        "Reports generate instantly",
        "Insights tailored to your goals",
        "AI suggests your next move",
        "Clear path to consistent growth"
    ];

    return (
        <section className="py-32 px-6 bg-[#F9F9FB]">
            <div className="max-w-6xl mx-auto bg-white rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.04)] border border-slate-100 p-4 md:p-6">
                <div className="flex flex-col lg:flex-row items-stretch gap-4 md:gap-6">
                    {/* Left: Traditional */}
                    <div className="flex-1 p-10 lg:p-14 flex flex-col justify-center">
                        <h3 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-12">
                            Other Platforms
                        </h3>
                        <ul className="space-y-8">
                            {traditional.map((item, i) => (
                                <li key={i} className="flex items-center gap-5 text-slate-400 font-bold">
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/50">
                                        <X size={16} className="text-slate-300" strokeWidth={3} />
                                    </div>
                                    <span className="text-lg md:text-xl tracking-tight">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right: Coner AI (Sleek Box) */}
                    <div className="flex-1">
                        <div className="h-full w-full bg-[#110033] rounded-[40px] p-10 lg:p-14 relative overflow-hidden flex flex-col justify-center border-[6px] border-[#330099]/10 shadow-2xl">
                            {/* Logo/Header */}
                            <div className="flex items-center gap-4 mb-12">
                                <div className="w-12 h-12 bg-primary rounded rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                    <div className="w-6 h-6 bg-white rounded-lg rotate-45"></div>
                                </div>
                                <span className="text-3xl font-black tracking-tighter text-white font-display">Coner.AI</span>
                            </div>

                            <ul className="space-y-8">
                                {coner.map((item, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-center gap-5 text-white/95 font-bold"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 border border-white/10">
                                            <Check size={16} className="text-white" strokeWidth={3} />
                                        </div>
                                        <span className="text-lg md:text-xl tracking-tight">{item}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ComparisonSection;
