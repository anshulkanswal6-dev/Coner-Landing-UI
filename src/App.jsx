import React, { useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeatureGrid from './components/FeatureGrid';
import ComparisonSection from './components/ComparisonSection';
import IntegrationSection from './components/IntegrationSection';
import FAQ from './components/FAQ';
import Footer from './components/Footer';

function App() {
    useEffect(() => {
        document.title = 'Coner AI - Automate Your Growth Engine';
    }, []);

    return (
        <div className="min-h-screen relative selection:bg-primary/30 selection:text-primary-dark font-sans bg-[#F9F9FB]">
            <Navbar />

            <main>
                <Hero />
                <FeatureGrid />
                <ComparisonSection />
                <IntegrationSection />
                <FAQ />
            </main>

            <Footer />
        </div>
    );
}

export default App;
