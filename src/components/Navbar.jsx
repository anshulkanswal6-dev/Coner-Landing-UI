import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Build in Public', href: 'https://x.com/saasydotpeople', external: true },
        { name: 'Integrate', href: '#integrate' },
    ];

    return (
        <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 py-4 ${isScrolled ? 'bg-slate-950/90 backdrop-blur-md shadow-lg' : 'bg-slate-950'}`}>
            <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(108,99,255,0.3)]">
                        <div className="w-5 h-5 bg-white rounded-md rotate-45"></div>
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-white font-display">Coner.AI</span>
                </div>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-10">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            target={link.external ? "_blank" : undefined}
                            rel={link.external ? "noopener noreferrer" : undefined}
                            className="text-sm font-bold text-slate-300 hover:text-white transition-colors tracking-tight"
                        >
                            {link.name}
                        </a>
                    ))}
                    <a href="#integrate" className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all active:scale-95">
                        Get Started
                    </a>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-white"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-slate-950 border-b border-white/10 p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            target={link.external ? "_blank" : undefined}
                            rel={link.external ? "noopener noreferrer" : undefined}
                            className="text-lg font-bold text-slate-300"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {link.name}
                        </a>
                    ))}
                    <a
                        href="#integrate"
                        className="bg-white text-black py-4 rounded-xl font-bold text-center"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Get Started
                    </a>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
