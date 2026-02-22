import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { ContainerScroll } from './ContainerScroll';

const Hero = () => {
    const integrations = [
        {
            name: 'HubSpot',
            icon: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/HubSpot_Logo.svg',
            status: 'Connected',
            description: 'Automate lead qualification and sync directly to your CRM pipeline.'
        },
        {
            name: 'Salesforce',
            icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg',
            status: 'Live',
            description: 'Inject qualified opportunities into your sales funnel in real-time.'
        },
        {
            name: 'Zoho CRM',
            icon: 'https://www.zohowebstatic.com/sites/zweb/images/zoho_general_pages/zohologowhitebg.svg',
            status: 'Connected',
            description: 'Seamlessly transition leads from AI agents to your sales team.'
        },
        {
            name: 'Cal.com',
            icon: 'https://cal.com/logo.svg',
            status: 'Active',
            description: 'Open-source scheduling for your AI agents to book meetings.'
        },
    ];

    return (
        <section className="relative pt-32 pb-20 px-6 overflow-hidden bg-[#F9F9FB]">

            <div className="max-w-7xl mx-auto relative z-20">
                <div className="flex flex-col items-center text-center mb-3">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-slate-200 bg-[#F1F1F4]"
                    >
                        <div className="flex -space-x-1.5">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className={`w-5 h-5 rounded-full border-2 border-white bg-slate-200 overflow-hidden`}>
                                    <img src={`https://i.pravatar.cc/100?img=${i + 20}`} alt="User" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <span className="text-[11px] font-bold text-primary tracking-tight">•  Coner on 50+ Apps</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-slate-900 max-w-4xl leading-[0.85] mb-6 font-display"
                    >
                        Automate Your <br />
                        <span className="text-primary italic">Growth Engine</span>
                    </motion.h1>

                    {/* Subtext */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-lg md:text-xl text-slate-500 max-w-2xl font-bold leading-tight mb-8"
                    >
                        Deploy AI agents that actually convert. <br className="hidden md:block" />
                        Sync qualified leads to your CRM in real-time.
                    </motion.p>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="w-full max-w-xl mx-auto"
                    >
                        <div className="relative group">
                            {/* Animated Glow Effect */}
                            <div className="absolute -inset-1.5 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-[32px] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

                            <div className="relative flex items-center bg-white rounded-full p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100/80">
                                <div className="flex-1 flex items-center px-4">
                                    <input
                                        type="url"
                                        placeholder="Your Website Link Here..."
                                        className="w-full bg-transparent py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                                    />
                                </div>
                                <button className="bg-slate-950 text-white px-6 py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-black transition-all duration-300 shadow-lg shadow-slate-950/20 active:scale-95 group/btn overflow-hidden relative">
                                    <span className="relative z-10 uppercase tracking-tight">Ship Now</span>
                                    <ChevronRight size={14} strokeWidth={3} className="relative z-10 transition-transform group-hover/btn:translate-x-0.5" />
                                </button>
                            </div>
                        </div>
                        <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                            No credit card required • Instant setup
                        </p>
                    </motion.div>
                </div>

                {/* Showcase Card with 3D Scroll Effect */}
                <div className="flex flex-col -mt-10">
                    <ContainerScroll titleComponent={null}>
                        <div className="w-full h-[30rem] md:h-[43rem] flex items-center justify-center">

                            <div className="max-w-7xl w-full border-4 border-[#6C6C6C] p-2 md:p-6 bg-[#222222] rounded-[30px] shadow-2xl">

                                <div className="w-full h-full rounded-[28px] overflow-hidden shadow-xl p-6 bg-black">
                                    <img
                                        src="/preview.png"
                                        alt="Product Preview"
                                        className="w-full h-auto object-contain"
                                    />
                                </div>

                            </div>

                        </div>
                    </ContainerScroll>
                </div>
            </div>
        </section>
    );
};

export default Hero;
