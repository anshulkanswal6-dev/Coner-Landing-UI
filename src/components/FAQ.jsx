import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
    {
        question: 'What is Coner?',
        answer: 'Coner is your Customer Acquisition OS — a single system to plan, run, and scale acquisition across website visitors, community, and social channels. Instead of managing disconnected tools, agencies, and spreadsheets, Coner brings everything into one intelligent workspace. At the center is your AI agent, helping you qualify leads, understand performance, and continuously improve your growth over time.',
    },
    {
        question: 'How does Coner work?',
        answer: 'Simply copy our one-line snippet to your site. Coner integrates with your existing tools like HubSpot, Salesforce, and Cal.com. It uses advanced LLMs to interact with visitors in natural language, automating everything from qualification to meeting booking.',
    },
    {
        question: 'Who is Coner for?',
        answer: 'It is built for SaaS Founders, E-commerce owners, Agencies, and anyone looking to automate their customer interaction and lead generation processes without a dedicated 24/7 support team.',
    },
    {
        question: 'Is my data secure on Coner?',
        answer: 'Yes, security is our top priority. We use enterprise-grade encryption and comply with GDPR/CCPA standards. Your customer data is never used to train our base models and is protected by SOC2 compliant infrastructure.',
    },
    {
        question: 'How does pricing work for Coner?',
        answer: 'We offer a transparent pricing model that scales with your usage. Starting with a free tier for small projects, our paid plans include advanced features like custom CRM mapping, voice agents, and higher interaction volumes.',
    },
];

const FAQItem = ({ question, answer, isOpen, onClick }) => {
    return (
        <motion.div
            layout
            className="bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden mb-4"
        >
            <button
                onClick={onClick}
                className="w-full flex items-center justify-between px-8 py-6 text-left focus:outline-none"
            >
                <span className="text-xl font-bold text-slate-900 tracking-tight">
                    {question}
                </span>
                <div className="text-slate-900 ml-4 shrink-0">
                    {isOpen ? <Minus size={24} /> : <Plus size={24} />}
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="px-8 pb-8">
                            <div className="h-px w-full bg-slate-100 mb-6" />
                            <p className="text-slate-500 leading-relaxed text-lg">
                                {answer}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(-1);

    return (
        <section id="faq" className="py-32 px-6 bg-[#F9F9FB]">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-primary/40 text-primary text-[11px] font-black mb-6 uppercase tracking-widest bg-primary/5">
                        FAQ's
                    </div>
                    <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter font-display leading-[0.85]">
                        Common Questions
                    </h2>
                    <p className="text-lg md:text-xl text-slate-500 font-medium max-w-xl mx-auto leading-tight">
                        Here are answers to the most common things people ask before getting started.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openIndex === index}
                            onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
