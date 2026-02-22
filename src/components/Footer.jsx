import React from 'react';
import { Mail, Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-slate-950 text-white py-12 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
                        </div>
                        <span className="text-xl font-bold tracking-tight">Coner.AI</span>
                    </div>
                    <p className="text-slate-400 max-w-sm mb-6">
                        The intelligent growth engine for modern startups. Deploy AI agents that qualify leads and sync to your CRM in real-time.
                    </p>
                    <a
                        href="https://x.com/saasydotpeople"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                    >
                        <span className="text-sm font-bold text-white uppercase tracking-widest">Building in Public</span>
                        {/* <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    
                        </div> */}
                    </a>
                </div>

                <div>
                    <h4 className="font-bold mb-6">Product</h4>
                    <ul className="space-y-4 text-slate-400">
                        <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                        <li><a href="#integrate" className="hover:text-primary transition-colors">Integrate</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Integrations</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold mb-6">Company</h4>
                    <ul className="space-y-4 text-slate-400">
                        <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                    </ul>
                </div>
            </div>
            <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-slate-900 text-center text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Coner.AI. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
