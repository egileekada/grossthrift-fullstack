'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import {
  ShieldCheck,
  Lock,
  Star,
  ArrowRight,
  Telescope,
  Sliders,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import NotificationBar from '@/components/NotificationBar';
import ListingCard from '@/components/ListingCard';
import ListingDetailModal from '@/components/ListingDetailModal';
import AuthModal from '@/components/AuthModal';
import PlanIcon from '@/components/PlanIcon';
import { useApp } from '@/context/AppContext';

const CURATED_PLATFORMS = [
  {
    name: 'Netflix Premium 4K',
    brandName: 'Netflix',
    category: 'Entertainment & Film',
    averageSave: 'Save 75%',
    activePools: 142,
    badge: 'Popular',
    spotPills: ['4 Screens'],
    typicalCost: '$22.99',
    coopCost: '$5.75',
  },
  {
    name: 'Spotify Family',
    brandName: 'Spotify Family',
    category: 'Music & Podcasts',
    averageSave: 'Save 80%',
    activePools: 96,
    badge: 'Trending',
    spotPills: ['6 Accounts'],
    typicalCost: '$16.99',
    coopCost: '$3.40',
  },
  {
    name: 'ChatGPT Plus Team',
    brandName: 'ChatGPT',
    category: 'AI & Productivity',
    averageSave: 'Save 75%',
    activePools: 38,
    badge: 'Best Value',
    spotPills: ['4 Accounts'],
    typicalCost: '$20.00',
    coopCost: '$5.00',
  },
  {
    name: 'YouTube Premium',
    brandName: 'YouTube Premium',
    category: 'Ad-Free Entertainment',
    averageSave: 'Save 70%',
    activePools: 115,
    badge: 'Essential',
    spotPills: ['6 Accounts'],
    typicalCost: '$22.99',
    coopCost: '$6.90',
  },
  {
    name: 'Xbox Game Pass',
    brandName: 'Xbox Game Pass',
    category: 'Interactive Gaming',
    averageSave: 'Save 65%',
    activePools: 24,
    badge: 'Gamers Choice',
    spotPills: ['4 Accounts'],
    typicalCost: '$16.99',
    coopCost: '$5.95',
  },
  {
    name: 'Canva Pro',
    brandName: 'Canva Pro',
    category: 'Design & Workspace',
    averageSave: 'Save 80%',
    activePools: 19,
    badge: 'Creator Essential',
    spotPills: ['5 Accounts'],
    typicalCost: '$14.99',
    coopCost: '$3.00',
  },
];

const SIMULATOR_PLATFORMS = [
  { id: 'Netflix', name: 'Netflix Premium 4K', cost: 22.99, icon: 'netflix', color: 'text-red-500' },
  { id: 'Spotify', name: 'Spotify Family', cost: 16.99, icon: 'spotify', color: 'text-emerald-500' },
  { id: 'ChatGPT', name: 'ChatGPT Plus Team', cost: 20.00, icon: 'chatgpt', color: 'text-teal-500' },
  { id: 'YouTube', name: 'YouTube Premium', cost: 22.99, icon: 'youtube', color: 'text-red-600' },
  { id: 'Xbox', name: 'Xbox Game Pass', cost: 16.99, icon: 'xbox', color: 'text-green-500' },
  { id: 'Canva', name: 'Canva Pro', cost: 14.99, icon: 'canva', color: 'text-blue-500' },
  { id: 'Adobe', name: 'Adobe Creative Cloud', cost: 54.99, icon: 'adobe', color: 'text-red-700' },
];

export default function LandingPage() {
  const router = useRouter();
  const {
    listings,
    user,
    setUser,
    selectedListing,
    setSelectedListing,
    isDetailModalOpen,
    setIsDetailModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    handleConfirmJoin,
  } = useApp();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [savedPlans, setSavedPlans] = useState<Record<string, boolean>>({});
  const [heroCoords, setHeroCoords] = useState({ x: 0, y: 0 });
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [selectedSimPlatforms, setSelectedSimPlatforms] = useState<string[]>([
    'Netflix',
    'Spotify',
    'ChatGPT',
  ]);
  const [simBuyers, setSimBuyers] = useState<number>(4);

  // Scroll spy to update active step as user scrolls
  useEffect(() => {
    const handleScroll = () => {
      const s2 = document.getElementById('step-block-2');
      const s3 = document.getElementById('step-block-3');
      if (!s2 || !s3) return;

      const triggerY = window.innerHeight * 0.5;
      const s2Top = s2.getBoundingClientRect().top;
      const s3Top = s3.getBoundingClientRect().top;

      if (s3Top < triggerY) {
        setActiveStep(2);
      } else if (s2Top < triggerY) {
        setActiveStep(1);
      } else {
        setActiveStep(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    const timer = setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  const handleStepClick = (stepIndex: number, elementId: string) => {
    setActiveStep(stepIndex);
    const element = document.getElementById(elementId);
    if (element) {
      const rect = element.getBoundingClientRect();
      const elemTop = rect.top + window.pageYOffset;
      const middleOffset = elemTop - window.innerHeight / 2 + rect.height / 2;
      window.scrollTo({
        top: middleOffset,
        behavior: 'smooth',
      });
    }
  };

  const handleSelectListing = (planName: string) => {
    router.push(`/browse?q=${encodeURIComponent(planName)}`);
  };

  const toggleSavePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPlans((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setHeroCoords({ x, y });
    setIsHeroHovered(true);
  };

  const handlePointerLeave = () => {
    setHeroCoords({ x: 0, y: 0 });
    setIsHeroHovered(false);
  };

  const previewListings = listings.slice(0, 6);

  return (
    <div className="bg-off-white text-ink min-h-screen font-sans selection:bg-ink selection:text-white" id="landing-container">
      <Navbar />
      <NotificationBar />

      {/* --- SECTION 1: HERO --- */}
      <section
        className="relative pt-[100px] lg:pt-[140px] pb-[80px] px-6 sm:px-12 overflow-hidden"
        id="hero-section"
      >
        <div className="relative max-w-[1120px] mx-auto z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center text-left">
          {/* Left Column: Headline, Subtext, CTAs */}
          <div className="lg:col-span-7 space-y-[24px] flex flex-col items-start">
            {/* Headline */}
            <h1 className="font-display font-medium tracking-[-1.5px] lg:tracking-[-3px] leading-[0.95] text-[44px] lg:text-[76px] text-ink">
              <span className="block font-semibold text-ink">Split subscriptions.</span>
              <span className="block font-normal text-dust">
                Pay less, <span className="font-serif italic font-light text-accent">together</span>.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-[16px] lg:text-[17px] font-normal text-slate leading-[1.65] max-w-[46ch]">
              GrossThrift lets you find verified people to share subscription plans. One click to join. No coordination headaches. Just savings.
            </p>

            {/* CTA Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.025, y: -2 }}
                whileTap={{ scale: 0.975 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => router.push('/browse')}
                className="group px-7 py-3.5 bg-[#115c3e] hover:bg-[#15724c] font-medium rounded-full text-[15px] cursor-pointer transition-all duration-200 flex items-center gap-2.5 shadow-[0_4px_12px_rgba(17,92,62,0.15)] hover:shadow-[0_8px_20px_rgba(21,114,76,0.25)]"
                style={{ color: '#ffffff' }}
                id="hero-primary-cta"
              >
                <Telescope size={18} color="#ffffff" className="group-hover:rotate-[15deg] transition-transform duration-300 ease-out" />
                <span className="font-medium" style={{ color: '#ffffff' }}>Explore Open Split</span>
              </motion.button>

              <button
                onClick={() => router.push('/create')}
                className="px-7 py-3.5 bg-transparent border border-ink text-ink font-medium rounded-full text-[15px] cursor-pointer flex items-center gap-2.5"
                id="hero-secondary-cta"
              >
                <Sliders size={16} className="text-slate" />
                <span>List Split</span>
              </button>
            </div>
          </div>

          {/* Right Column: Floating Interactive Cards Stack */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[380px] lg:min-h-[440px]">
            {/* Interactive Stack of Cards Zone */}
            <div
              className="w-full max-w-[440px] flex items-center justify-center relative touch-none"
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              id="interactive-cards-stack-zone"
            >
              <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[350px] flex items-center justify-center scale-90 sm:scale-100">
                {/* Card 1 — Netflix Premium (Left Background Card) */}
                <div
                  onClick={() => handleSelectListing('Netflix Premium 4K')}
                  className="absolute w-[280px] h-[205px] rounded-[24px] p-5 shadow-gt-card text-left flex flex-col justify-between cursor-pointer select-none origin-center overflow-hidden border border-red-500/20"
                  style={{
                    zIndex: 10,
                    background: 'radial-gradient(130% 110% at 50% 10%, #1e0b0d 0%, #080304 100%)',
                    transform: isHeroHovered
                      ? `rotate(${-14 + heroCoords.x * 5}deg) translate(${-105 + heroCoords.x * 20}px, ${20 + heroCoords.y * 15}px) scale(0.92) translateZ(0)`
                      : 'rotate(-14deg) translate(-105px, 20px) scale(0.92) translateZ(0)',
                    boxShadow: isHeroHovered
                      ? `0 25px 50px rgba(229, 9, 20, 0.15), ${-heroCoords.x * 10}px ${15 - heroCoords.y * 10}px 30px rgba(0,0,0,0.5)`
                      : '0 20px 40px rgba(229, 9, 20, 0.08), 0 10px 20px rgba(0,0,0,0.4)',
                    transition: isHeroHovered
                      ? 'transform 0.1s ease-out, box-shadow 0.1s ease-out'
                      : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none rounded-[24px]" />
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                  <div className="flex justify-between items-start relative z-10">
                    <div className="w-8 h-8 flex items-center justify-center bg-white/[0.03] border border-white/5 rounded-lg">
                      <PlanIcon name="netflix" size={20} />
                    </div>
                    <span className="px-2.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                      2 Slots open
                    </span>
                  </div>

                  <div className="relative z-10">
                    <h4 className="font-display font-semibold text-[17px] text-white leading-tight">Netflix Premium</h4>
                    <p className="text-[10px] font-mono text-zinc-400 tracking-tight mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] inline-block animate-pulse"></span>
                      Verified Host
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-3 relative z-10">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Your share</span>
                    <span className="text-[17px] font-bold text-white">$4.49<span className="text-[11px] font-normal text-zinc-500">/mo</span></span>
                  </div>
                </div>

                {/* Card 2 — ChatGPT Plus (Right Background Card) */}
                <div
                  onClick={() => handleSelectListing('ChatGPT Plus Team')}
                  className="absolute w-[280px] h-[205px] rounded-[24px] p-5 shadow-gt-card text-left flex flex-col justify-between cursor-pointer select-none origin-center overflow-hidden border border-emerald-500/20"
                  style={{
                    zIndex: 11,
                    background: 'radial-gradient(130% 110% at 50% 10%, #0a1f18 0%, #030806 100%)',
                    transform: isHeroHovered
                      ? `rotate(${14 + heroCoords.x * 5}deg) translate(${105 + heroCoords.x * 20}px, ${20 + heroCoords.y * 15}px) scale(0.92) translateZ(0)`
                      : 'rotate(14deg) translate(105px, 20px) scale(0.92) translateZ(0)',
                    boxShadow: isHeroHovered
                      ? `0 25px 50px rgba(16, 163, 127, 0.15), ${heroCoords.x * 10}px ${15 - heroCoords.y * 10}px 30px rgba(0,0,0,0.5)`
                      : '0 20px 40px rgba(16, 163, 127, 0.08), 0 10px 20px rgba(0,0,0,0.4)',
                    transition: isHeroHovered
                      ? 'transform 0.1s ease-out, box-shadow 0.1s ease-out'
                      : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none rounded-[24px]" />
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                  <div className="flex justify-between items-start relative z-10">
                    <div className="w-8 h-8 bg-white/[0.03] border border-white/5 rounded-lg flex items-center justify-center">
                      <PlanIcon name="chatgpt" size={18} />
                    </div>
                    <span className="px-2.5 py-0.5 bg-[#edf3ee]/10 text-emerald-300 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                      2 Slots open
                    </span>
                  </div>

                  <div className="relative z-10">
                    <h4 className="font-display font-semibold text-[17px] text-white leading-tight">ChatGPT Plus</h4>
                    <p className="text-[10px] font-mono text-zinc-400 tracking-tight mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      Verified Host
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-3 relative z-10">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Your share</span>
                    <span className="text-[17px] font-bold text-[#2ecc71]">$4.00<span className="text-[11px] font-normal text-zinc-500">/mo</span></span>
                  </div>
                </div>

                {/* Card 3 — Spotify Plus (Center/Foreground Card) */}
                <div
                  onClick={() => handleSelectListing('Spotify Family')}
                  className="absolute w-[290px] h-[205px] rounded-[24px] p-5 text-left flex flex-col justify-between cursor-pointer select-none origin-center overflow-hidden border border-emerald-500/30"
                  style={{
                    zIndex: 20,
                    background: 'radial-gradient(130% 110% at 50% 10%, #072a1a 0%, #020b07 100%)',
                    transform: isHeroHovered
                      ? `rotate(${heroCoords.x * 5}deg) translate(${heroCoords.x * 30}px, ${-12 + heroCoords.y * 22}px) scale(1.04) translateZ(0)`
                      : 'rotate(0deg) translate(0px, -12px) scale(1.04) translateZ(0)',
                    boxShadow: isHeroHovered
                      ? `0 35px 70px rgba(30, 215, 96, 0.2), ${-heroCoords.x * 12}px ${20 - heroCoords.y * 12}px 40px rgba(0,0,0,0.6)`
                      : '0 25px 50px rgba(30, 215, 96, 0.12), 0 15px 30px rgba(0,0,0,0.5)',
                    transition: isHeroHovered
                      ? 'transform 0.1s ease-out, box-shadow 0.1s ease-out'
                      : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none rounded-[24px]" />
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                  <div className="flex justify-between items-start relative z-10">
                    <div className="w-8 h-8 bg-white/[0.03] border border-white/5 rounded-lg flex items-center justify-center">
                      <PlanIcon name="spotify" size={20} />
                    </div>
                    <span className="px-2.5 py-0.5 bg-[#1ed760]/10 text-[#1ed760] border border-[#1ed760]/20 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                      2 Slots open
                    </span>
                  </div>

                  <div className="relative z-10">
                    <h4 className="font-display font-semibold text-[18px] text-white leading-tight">Spotify Family</h4>
                    <p className="text-[10px] font-mono text-zinc-300 tracking-tight mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] inline-block animate-pulse"></span>
                      Verified Host
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-3 relative z-10">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Your share</span>
                    <span className="text-[18px] font-bold text-white">$4.49<span className="text-[11px] font-normal text-zinc-500">/mo</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 2: CURATED ECOSYSTEM --- */}
      <section className="w-full bg-off-white py-20 border-t border-b border-border/50" id="supported-ribbon">
        <div className="max-w-[1120px] mx-auto px-6 sm:px-12 mb-14 text-left md:flex md:items-end md:justify-between gap-8">
          <div className="max-w-[620px] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent block">
              SUPPORTED ECOSYSTEM
            </span>
            <h3 className="font-display font-medium text-[36px] lg:text-[44px] tracking-tight text-ink leading-[1.05]">
              Premium platforms, <span className="font-serif italic font-light text-accent">shared pricing</span>.
            </h3>
            <p className="text-[15px] lg:text-[16px] text-slate leading-relaxed font-normal max-w-[50ch]">
              Explore active, community-run co-op slots. Select any card to discover secure subscription pools ready for instant split access.
            </p>
          </div>
          <div className="mt-6 md:mt-0 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate font-medium bg-surface/50 border border-border/40 px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#2ecc71] animate-pulse animate-duration-1000"></span>
              <span>100% Host Verification Guaranteed</span>
            </div>
          </div>
        </div>

        {/* Symmetrical Curated Bento Grid */}
        <div className="max-w-[1120px] mx-auto px-6 sm:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CURATED_PLATFORMS.map((platform, idx) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              onClick={() => handleSelectListing(platform.name)}
              className="group relative bg-white border border-border/60 hover:border-ink/20 rounded-[24px] p-6 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.01)] cursor-pointer flex flex-col justify-between h-[280px]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-[16px] bg-surface border border-border/40 flex items-center justify-center shrink-0 transition-colors duration-300">
                    <PlanIcon name={platform.brandName} size={22} />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-[0.08em] px-2.5 py-1 bg-surface text-slate border border-border/40 rounded-full select-none transition-all duration-300">
                    {platform.badge}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-1.5">
                  <h4 className="font-display font-semibold text-[18px] text-ink leading-tight transition-colors duration-300">
                    {platform.brandName}
                  </h4>
                </div>
                <p className="text-[12px] text-slate font-medium mt-0.5">
                  {platform.category}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-4">
                  {platform.spotPills.map((pill) => (
                    <span
                      key={pill}
                      className="text-[10px] font-medium bg-off-white text-slate border border-border/30 px-2 py-0.5 rounded-md"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex items-center justify-between mt-4">
                <div>
                  <span className="text-[11px] text-slate font-medium block">Co-op Rate</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[20px] font-bold text-emerald-500 tracking-tight">{platform.coopCost}</span>
                    <span className="text-[11px] text-slate font-normal">/mo</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate font-medium block">{platform.averageSave}</span>
                  <span className="text-[11px] text-slate line-through block mt-0.5">{platform.typicalCost}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- SECTION 3: HOW IT WORKS --- */}
      <section className="py-[100px] px-6 sm:px-12 bg-white border-t border-b border-border" id="how-it-works-section">
        <div className="max-w-[1120px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Sticky Column (40% width) */}
          <div className="lg:col-span-5 lg:sticky lg:top-[120px] self-start space-y-[24px]">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-dust block">
              HOW IT WORKS
            </span>
            <h2 className="font-display font-medium text-[42px] tracking-[-1.5px] text-ink leading-none">
              Three steps to splitting <span className="font-serif italic font-light text-accent">smarter</span>.
            </h2>
            <p className="text-[16px] font-normal text-slate leading-[1.75] max-w-[34ch]">
              No apps to download. No complicated setup. Find a split, send a request, start saving.
            </p>
          </div>

          {/* Right Interactive Column (60% width) */}
          <div className="lg:col-span-7 relative">
            {/* Step 1 */}
            <div
              className={`relative pl-8 pb-12 cursor-pointer select-none transition-all duration-300 ${activeStep === 0 ? 'opacity-100' : 'opacity-40 hover:opacity-75'}`}
              onClick={() => handleStepClick(0, 'step-block-1')}
              id="step-block-1"
            >
              <div className="absolute left-0 top-2 bottom-0 w-[2px] bg-border/30" />
              {activeStep === 0 && (
                <motion.div
                  layoutId="active-flow-indicator"
                  className="absolute left-0 top-2 bottom-0 w-[2px] bg-accent z-10"
                  transition={{ type: 'tween', duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              )}

              <div className="space-y-2">
                <span className={`text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-300 ${activeStep === 0 ? 'text-accent' : 'text-dust'}`}>01</span>
                <h3 className="text-[22px] font-semibold text-ink">Find the plan you need</h3>
                <p className="text-[14px] text-slate font-normal leading-[1.75] max-w-[52ch]">
                  Browse verified listings for Spotify, YouTube, ChatGPT, and 50+ other plans. Filter by category, price, or slots available.
                </p>

                <div className="pt-4">
                  <div className="bg-off-white border border-border rounded-[16px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-charcoal text-white dark:text-[#141c17] text-[12px] font-medium">All splits</span>
                      <span className="px-3 py-1 rounded-full bg-white border border-border text-slate text-[12px]">Streaming</span>
                      <span className="px-3 py-1 rounded-full bg-white border border-border text-slate text-[12px]">AI Tools</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white border border-border rounded-xl p-4 text-xs space-y-2 opacity-90">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold flex items-center gap-1.5">
                            <PlanIcon name="YouTube Premium" size={14} className="shrink-0" />
                            YouTube Premium
                          </span>
                          <span className="text-[#15803d] bg-[#f0fdf4] px-1.5 py-0.5 rounded font-bold">Save 83%</span>
                        </div>
                        <div className="h-1 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-ink" style={{ width: '83%' }}></div>
                        </div>
                      </div>
                      <div className="bg-white border border-border rounded-xl p-4 text-xs space-y-2 opacity-90">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold flex items-center gap-1.5">
                            <PlanIcon name="ChatGPT" size={14} className="shrink-0" />
                            ChatGPT Plus
                          </span>
                          <span className="text-[#15803d] bg-[#f0fdf4] px-1.5 py-0.5 rounded font-bold">Save 75%</span>
                        </div>
                        <div className="h-1 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-ink" style={{ width: '50%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`relative pl-8 pb-12 cursor-pointer select-none transition-all duration-300 ${activeStep === 1 ? 'opacity-100' : 'opacity-40 hover:opacity-75'}`}
              onClick={() => handleStepClick(1, 'step-block-2')}
              id="step-block-2"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-border/30" />
              {activeStep === 1 && (
                <motion.div
                  layoutId="active-flow-indicator"
                  className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent z-10"
                  transition={{ type: 'tween', duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              )}

              <div className="space-y-2">
                <span className={`text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-300 ${activeStep === 1 ? 'text-accent' : 'text-dust'}`}>02</span>
                <h3 className="text-[22px] font-semibold text-ink">One click. Host gets notified instantly.</h3>
                <p className="text-[14px] text-slate font-normal leading-[1.75] max-w-[52ch]">
                  Fill in your name and contact. The host receives your details immediately and reaches out to confirm.
                </p>

                <div className="pt-4">
                  <div className="bg-off-white border border-border rounded-[16px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] max-w-sm">
                    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
                      <div className="text-xs font-semibold text-ink uppercase tracking-wide">Request to join pool</div>
                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <div className="text-[10px] text-dust uppercase font-bold">Your Name</div>
                          <div className="h-8 bg-surface rounded-lg border border-border px-3 text-xs flex items-center">Godstime K.</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] text-dust uppercase font-bold">Contact method</div>
                          <div className="h-8 bg-surface rounded-lg border border-border px-3 text-xs flex items-center">WhatsApp · +234 810...</div>
                        </div>
                      </div>
                      <button className="w-full h-9 bg-charcoal text-white dark:text-[#141c17] rounded-lg text-xs font-semibold">
                        Send join request
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className={`relative pl-8 cursor-pointer select-none transition-all duration-300 ${activeStep === 2 ? 'opacity-100' : 'opacity-40 hover:opacity-75'}`}
              onClick={() => handleStepClick(2, 'step-block-3')}
              id="step-block-3"
            >
              <div className="absolute left-0 top-0 bottom-4 w-[2px] bg-border/30" />
              {activeStep === 2 && (
                <motion.div
                  layoutId="active-flow-indicator"
                  className="absolute left-0 top-0 bottom-4 w-[2px] bg-accent z-10"
                  transition={{ type: 'tween', duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              )}

              <div className="space-y-2">
                <span className={`text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-300 ${activeStep === 2 ? 'text-accent' : 'text-dust'}`}>03</span>
                <h3 className="text-[22px] font-semibold text-ink">Coordinate and save.</h3>
                <p className="text-[14px] text-slate font-normal leading-[1.75] max-w-[52ch]">
                  Connect with your host via WhatsApp or email. Start enjoying the plan at a fraction of what you&apos;d pay alone.
                </p>

                <div className="pt-4">
                  <div className="bg-off-white border border-border rounded-[16px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] max-w-sm">
                    <div className="bg-white border border-border rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-center border-b border-border pb-3">
                        <span className="text-xs font-semibold text-slate">Monthly Cost</span>
                        <span className="text-xs text-dust">Verified Invoice</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate">You paid</span>
                          <span className="font-semibold text-[#16a34a]">$4.49</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate">Full single price</span>
                          <span className="text-dust line-through">$16.99</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 font-semibold">
                          <span className="text-ink">Net Saved</span>
                          <span className="text-ink">$12.50 / mo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 4: LIVE LISTINGS PREVIEW --- */}
      <section className="py-[100px] px-6 sm:px-12 bg-off-white" id="featured-splits-section">
        <div className="max-w-[1120px] mx-auto text-left space-y-12">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent block">
                OPEN SPLITS
              </span>
              <h2 className="font-display font-medium text-[42px] tracking-[-1.5px] text-ink leading-none">
                Jump into a split <span className="font-serif italic font-light text-accent">right now</span>.
              </h2>
            </div>
            <button
              onClick={() => router.push('/browse')}
              className="text-[13px] font-mono tracking-wider uppercase text-ink hover:text-accent font-bold transition-colors duration-300 cursor-pointer shrink-0 inline-flex items-center gap-2 group/btn2"
            >
              <span>Browse all {listings.length} splits</span>
              <span className="transform group-hover/btn2:translate-x-1.5 transition-transform duration-300">→</span>
            </button>
          </div>

          {/* 6 Listing cards in a 3-column grid with staggered motion loading */}
          {previewListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewListings.map((listing, idx) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ListingCard
                    listing={listing}
                    onSelect={(lst) => {
                      setSelectedListing(lst);
                      setIsDetailModalOpen(true);
                    }}
                    isSaved={!!savedPlans[listing.id]}
                    onToggleSave={toggleSavePlan}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-border rounded-[24px] p-12 text-center space-y-4">
              <p className="text-[16px] font-semibold text-ink">No active splits listed yet</p>
              <p className="text-[14px] text-slate max-w-md mx-auto">
                Sign in and list your first subscription split so co-buyers can join your pool.
              </p>
              <button
                onClick={() => router.push('/create')}
                className="px-6 py-3 bg-charcoal text-white dark:text-[#141c17] font-semibold rounded-xl text-[13px] cursor-pointer"
              >
                List a split
              </button>
            </div>
          )}

          {/* Dark Banner Strip with Premium Forest-Tinted Gradient */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0c120f] via-[#131d18] to-[#0c120f] text-white rounded-[28px] py-8 px-6 sm:px-10 border border-white/10 shadow-2xl" id="plan-not-found-banner">
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.012)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -left-16 -top-16 w-60 h-60 bg-white/5 rounded-full blur-[60px] pointer-events-none" />

            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10 w-full">
              <div className="text-center md:text-left space-y-4 max-w-[550px]">
                <div className="space-y-2">
                  <h4 className="text-[24px] sm:text-[28px] font-sans font-bold tracking-tight text-white leading-tight">
                    Can&apos;t find your plan? List it yourself.
                  </h4>
                  <p className="text-[13px] sm:text-[14px] text-neutral-200 leading-relaxed font-sans">
                    Take 1 minute to setup a co-buying group. Keep your own slot while other co-buyers automatically join your pool.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-xl p-3 select-none mx-auto md:mx-0">
                  <div className="flex -space-x-2.5">
                    <motion.div
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                      className="w-8 h-8 rounded-full bg-ink border border-[#1a241e] flex items-center justify-center shadow-md text-white dark:text-[#141c17] font-sans text-[8px] font-bold shrink-0"
                    >
                      HOST
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -1.5, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', delay: 0.5 }}
                      className="w-8 h-8 rounded-full bg-[#1c2620] border border-[#1a241e] flex items-center justify-center shadow-md text-neutral-300 font-sans text-[8px] font-medium shrink-0"
                    >
                      Mbr 1
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -1.5, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', delay: 1 }}
                      className="w-8 h-8 rounded-full bg-[#1c2620] border border-[#1a241e] flex items-center justify-center shadow-md text-neutral-300 font-sans text-[8px] font-medium shrink-0"
                    >
                      Mbr 2
                    </motion.div>
                    <div className="w-8 h-8 rounded-full bg-transparent border border-dashed border-[#2b3a30] flex items-center justify-center shadow-md text-neutral-500 font-sans text-xs font-bold shrink-0">
                      +
                    </div>
                  </div>
                  <div className="text-left shrink-0 border-l border-white/10 pl-3">
                    <p className="text-[10px] font-mono font-bold text-neutral-200 uppercase tracking-widest leading-none">Co-op Split</p>
                    <p className="text-[9px] text-neutral-300 mt-1 leading-none">Waiting for buyers</p>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  onClick={() => router.push('/create')}
                  className="px-7 h-11 bg-[#edf3ee] text-[#141c17] font-sans font-bold rounded-full shadow-md cursor-pointer text-[13px] flex items-center gap-2 shrink-0 select-none border border-neutral-100"
                >
                  <span>Create listing</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 5: TRUST / SOCIAL PROOF --- */}
      <section className="py-[100px] px-6 sm:px-12 bg-white border-t border-border" id="trust-details-section">
        <div className="max-w-[1120px] mx-auto text-center space-y-12">
          <h2 className="font-sans font-semibold text-[42px] tracking-[-1.5px] text-ink">
            Built for people who value their money.
          </h2>

          {/* Stat Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-6 border-b border-border text-center">
            <div className="space-y-1">
              <span className="block text-[56px] font-semibold tracking-tight text-ink font-numeric-tabular leading-none">
                <CountUp end={12000} separator="," suffix="+" duration={1.5} enableScrollSpy scrollSpyOnce />
              </span>
              <span className="text-[14px] text-slate font-medium">Active users</span>
            </div>
            <div className="hidden md:block w-[1px] h-16 bg-border self-center mx-auto" />
            <div className="space-y-1">
              <span className="block text-[56px] font-semibold tracking-tight text-ink font-numeric-tabular leading-none">
                <CountUp end={80} suffix="%" duration={1.2} enableScrollSpy scrollSpyOnce />
              </span>
              <span className="text-[14px] text-slate font-medium">Avg. savings</span>
            </div>
            <div className="hidden md:block w-[1px] h-16 bg-border self-center mx-auto" />
            <div className="space-y-1">
              <span className="block text-[56px] font-semibold tracking-tight text-[#16a34a] font-numeric-tabular leading-none">
                $<CountUp end={2.4} decimals={1} suffix="M+" duration={1.5} enableScrollSpy scrollSpyOnce />
              </span>
              <span className="text-[14px] text-slate font-medium">Saved by users</span>
            </div>
          </div>

          {/* 3 Trust cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white border border-border rounded-[20px] p-[32px] space-y-5 shadow-none hover:shadow-gt-hover transition-shadow duration-200">
              <div className="w-[40px] h-[40px] bg-surface rounded-[10px] flex items-center justify-center text-ink shrink-0">
                <ShieldCheck size={20} className="text-ink" />
              </div>
              <div className="space-y-2">
                <h3 className="font-sans font-semibold text-[18px] text-ink">Every host is verified</h3>
                <p className="text-[14px] text-slate leading-[1.75] font-normal">
                  Phone OTP and Google login required before anyone can list a split. No anonymous listings. Ever.
                </p>
              </div>
            </div>

            <div className="bg-white border border-border rounded-[20px] p-[32px] space-y-5 shadow-none hover:shadow-gt-hover transition-shadow duration-200">
              <div className="w-[40px] h-[40px] bg-surface rounded-[10px] flex items-center justify-center text-ink shrink-0">
                <Lock size={20} className="text-ink" />
              </div>
              <div className="space-y-2">
                <h3 className="font-sans font-semibold text-[18px] text-ink">Zero platform payments</h3>
                <p className="text-[14px] text-slate leading-[1.75] font-normal">
                  All payments happen directly between you and your split partner. GrossThrift is just the coordination layer.
                </p>
              </div>
            </div>

            <div className="bg-white border border-border rounded-[20px] p-[32px] space-y-5 shadow-none hover:shadow-gt-hover transition-shadow duration-200">
              <div className="w-[40px] h-[40px] bg-surface rounded-[10px] flex items-center justify-center text-ink shrink-0">
                <Star size={20} className="text-ink" />
              </div>
              <div className="space-y-2">
                <h3 className="font-sans font-semibold text-[18px] text-ink">Real reputation</h3>
                <p className="text-[14px] text-slate leading-[1.75] font-normal">
                  Hosts build public split history. See how many successful splits before you join anything.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 5B: CO-OP CLUSTER SAVINGS SIMULATOR --- */}
      <section className="py-[100px] px-6 sm:px-12 bg-off-white border-t border-b border-border/80" id="savings-simulator-section">
        <div className="max-w-[1120px] mx-auto text-left space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-3">
              <span className="text-[11px] font-mono tracking-[0.2em] text-[#115c3e] dark:text-[#2ecc71] uppercase font-semibold block">
                [ SIMULATOR NODE 08 ]
              </span>
              <h2 className="font-display font-medium text-[42px] tracking-[-1.5px] text-ink leading-none">
                Estimate your network savings rate.
              </h2>
            </div>
            <p className="text-[14px] text-slate max-w-[340px] leading-relaxed">
              Simulate bundling your active nodes with verified split partners to calculate efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Control Panel (7 cols on desktop) */}
            <div className="lg:col-span-7 bg-white dark:bg-dark-surface border border-border rounded-[28px] p-6 sm:p-8 flex flex-col justify-between space-y-8 relative overflow-hidden shadow-gt-card">
              <div className="absolute inset-0 bg-[radial-gradient(rgba(20,28,23,0.01)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-center border-b border-border/60 pb-4">
                  <span className="text-[12px] font-mono tracking-wider text-dust uppercase font-bold">01. Select Active Nodes</span>
                  <span className="text-[11px] text-slate font-medium">{selectedSimPlatforms.length} services selected</span>
                </div>

                {/* Subscriptions Grid Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SIMULATOR_PLATFORMS.map((platform) => {
                    const isSelected = selectedSimPlatforms.includes(platform.id);
                    return (
                      <button
                        key={platform.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSimPlatforms((prev) => prev.filter((p) => p !== platform.id));
                          } else {
                            setSelectedSimPlatforms((prev) => [...prev, platform.id]);
                          }
                        }}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-300 relative select-none cursor-pointer ${isSelected
                            ? 'bg-gt-green-bg/60 dark:bg-[#14281b]/40 border-emerald-500/30 text-ink shadow-[0_2px_8px_rgba(16,185,129,0.06)]'
                            : 'bg-white dark:bg-dark-surface border-border text-slate hover:border-slate/40'
                          }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300 ${isSelected ? 'bg-white dark:bg-[#14281b] border-emerald-500/20 shadow-sm' : 'bg-surface dark:bg-[#1c2620] border-border/40'
                            }`}
                        >
                          <PlanIcon name={platform.id.toLowerCase()} size={16} />
                        </div>
                        <div className="truncate">
                          <p className="text-[12px] font-bold tracking-tight text-ink truncate leading-tight">{platform.id}</p>
                          <p className="text-[10px] text-slate font-mono mt-0.5 leading-none">${platform.cost}/mo</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slider Input */}
              <div className="space-y-5 relative z-10 pt-6 border-t border-border/60">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[12px] font-mono tracking-wider text-dust uppercase font-bold">02. Node Partitioning Ratio</span>
                    <p className="text-[11px] text-slate">Adjust the number of active co-buyers in your cluster</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[20px] font-mono font-bold text-ink">{simBuyers}</span>
                    <span className="text-[12px] text-slate font-mono"> Peers</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min="2"
                    max="6"
                    step="1"
                    value={simBuyers}
                    onChange={(e) => setSimBuyers(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-surface dark:bg-[#1c2620] rounded-lg appearance-none cursor-pointer accent-emerald-500 dark:accent-emerald-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-dust px-1 select-none">
                    <span>1/2 Split</span>
                    <span>1/3 Split</span>
                    <span>1/4 Split</span>
                    <span>1/5 Split</span>
                    <span>1/6 Split</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Telemetry Output (5 cols on desktop) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#0c120f] via-[#131d18] to-[#0c120f] text-white rounded-[28px] p-6 sm:p-8 flex flex-col justify-between space-y-8 relative overflow-hidden shadow-2xl border border-white/5">
              <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.012)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              <div className="flex justify-between items-center border-b border-white/10 pb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-bold">CO-OP FEED BACKFLOW</span>
                </div>
                <span className="text-[9px] font-mono text-neutral-400 uppercase">[ ONLINE ]</span>
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-4 relative z-10 py-2">
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">SINGLE USER COST</span>
                  <p className="text-[28px] sm:text-[32px] font-mono font-bold tracking-tight text-neutral-300 mt-1">
                    ${selectedSimPlatforms.reduce((acc, p) => acc + (SIMULATOR_PLATFORMS.find((sp) => sp.id === p)?.cost || 0), 0).toFixed(2)}
                    <span className="text-[12px] font-normal text-neutral-500">/mo</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">CO-OP CLUSTER RATE</span>
                  <p className="text-[28px] sm:text-[32px] font-mono font-bold tracking-tight text-white mt-1">
                    ${(selectedSimPlatforms.reduce((acc, p) => acc + (SIMULATOR_PLATFORMS.find((sp) => sp.id === p)?.cost || 0), 0) / simBuyers).toFixed(2)}
                    <span className="text-[12px] font-normal text-neutral-500">/mo</span>
                  </p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">NET MONTHLY REBATE</span>
                  <p className="text-[28px] sm:text-[32px] font-mono font-bold tracking-tight text-[#2ecc71] mt-1">
                    ${(
                      selectedSimPlatforms.reduce((acc, p) => acc + (SIMULATOR_PLATFORMS.find((sp) => sp.id === p)?.cost || 0), 0) -
                      selectedSimPlatforms.reduce((acc, p) => acc + (SIMULATOR_PLATFORMS.find((sp) => sp.id === p)?.cost || 0), 0) / simBuyers
                    ).toFixed(2)}
                    <span className="text-[12px] font-normal text-neutral-500">/mo</span>
                  </p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">ANNUAL SAVINGS SPEED</span>
                  <p className="text-[28px] sm:text-[32px] font-mono font-bold tracking-tight text-white mt-1">
                    ${(
                      (selectedSimPlatforms.reduce((acc, p) => acc + (SIMULATOR_PLATFORMS.find((sp) => sp.id === p)?.cost || 0), 0) -
                        selectedSimPlatforms.reduce((acc, p) => acc + (SIMULATOR_PLATFORMS.find((sp) => sp.id === p)?.cost || 0), 0) / simBuyers) *
                      12
                    ).toFixed(2)}
                    <span className="text-[12px] font-normal text-neutral-500">/yr</span>
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6 relative z-10 space-y-4">
                <div className="flex justify-between text-xs font-mono text-neutral-300">
                  <span>Cluster Savings Yield</span>
                  <span className="text-emerald-400 font-bold">{((1 - 1 / simBuyers) * 100).toFixed(0)}% Efficiency</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
                    style={{ width: `${(1 - 1 / simBuyers) * 100}%` }}
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => router.push('/browse')}
                    className="w-full py-3.5 bg-[#edf3ee] text-[#0c120f] font-bold rounded-2xl text-[13px] flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span>Deploy Savings Cluster</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 6: CATEGORIES --- */}
      <section className="py-[100px] px-6 sm:px-12 bg-white dark:bg-dark-bg border-t border-b border-border/80" id="categories-section">
        <div className="max-w-[1120px] mx-auto text-left space-y-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-3">
              <span className="text-[11px] font-mono tracking-[0.2em] text-accent uppercase font-semibold block">
                [ ROADMAP & SCOPE ]
              </span>
              <h2 className="font-sans font-semibold text-[42px] tracking-[-1.5px] text-ink leading-none">
                One platform. Everything you split.
              </h2>
            </div>
            <p className="text-[14px] text-slate max-w-[340px] leading-relaxed">
              Verifying and unlocking multi-buyer distribution channels. Bypassing intermediary platform fees to create direct co-buying routes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 border-t border-b border-border divide-y lg:divide-y-0 lg:divide-x divide-border">
            <div className="py-10 md:py-12 lg:pr-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-dust uppercase tracking-wider">[ STATION_01_SUB ]</span>
                  <span className="text-[12px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">01 // LIVE NOW</span>
                </div>
                <h3 className="text-[20px] font-semibold text-ink">Subscriptions</h3>
                <p className="text-[14px] text-slate leading-relaxed font-normal">
                  Streaming services, generative AI, utility platforms, and cloud storage. Fully automated direct handshake flow.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Live: 247 splits active</span>
                </div>
                <button
                  onClick={() => router.push('/browse')}
                  className="text-[13px] font-bold text-ink hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1.5 cursor-pointer group transition-colors"
                >
                  <span>Browse splits</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                </button>
              </div>
            </div>

            <div className="py-10 md:py-12 lg:px-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-dust uppercase tracking-wider">[ STATION_02_BULK ]</span>
                  <span className="text-[12px] font-mono font-bold text-slate bg-off-white dark:bg-dark-surface px-2 py-0.5 rounded border border-border">02 // QUEUED</span>
                </div>
                <h3 className="text-[20px] font-semibold text-ink">Bulk Goods</h3>
                <p className="text-[14px] text-slate leading-relaxed font-normal">
                  Wholesale supplier shipments, group orders, shared logistics packages, and bulk merchant purchases.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                <span className="text-[10px] font-mono text-slate">Allocation Queue: 4,120 nodes</span>
              </div>
            </div>

            <div className="py-10 md:py-12 lg:px-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-dust uppercase tracking-wider">[ STATION_03_CORP ]</span>
                  <span className="text-[12px] font-mono font-bold text-slate bg-off-white dark:bg-dark-surface px-2 py-0.5 rounded border border-border">03 // QUEUED</span>
                </div>
                <h3 className="text-[20px] font-semibold text-ink">Business Inventory</h3>
                <p className="text-[14px] text-slate leading-relaxed font-normal">
                  Co-owning supplier minimum order quantities, manufacturing raw materials, and enterprise tool suites.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                <span className="text-[10px] font-mono text-slate">Allocation Queue: 1,840 nodes</span>
              </div>
            </div>

            <div className="py-10 md:py-12 lg:pl-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-dust uppercase tracking-wider">[ STATION_04_ACAD ]</span>
                  <span className="text-[12px] font-mono font-bold text-slate bg-off-white dark:bg-dark-surface px-2 py-0.5 rounded border border-border">04 // QUEUED</span>
                </div>
                <h3 className="text-[20px] font-semibold text-ink">Courses & Licenses</h3>
                <p className="text-[14px] text-slate leading-relaxed font-normal">
                  Professional bootcamp seats, workspace developer licenses, educational passes, and team training programs.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                <span className="text-[10px] font-mono text-slate">Allocation Queue: 2,930 nodes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-surface text-ink pt-[80px] pb-[48px] px-6 sm:px-12 mt-12 border-t border-border" id="landing-footer">
        <div className="max-w-[1120px] mx-auto space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 text-left">
            <div className="lg:col-span-5 space-y-6">
              <div
                className="flex items-center gap-0 cursor-pointer select-none"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <span className="font-bold text-[18px] text-ink tracking-tight">Gross</span>
                <span className="font-normal text-[18px] text-slate tracking-tight">Thrift</span>
              </div>
              <p className="text-[13px] text-slate leading-relaxed max-w-[280px]">
                Split costs. Save more. Together. Verified co-buying for digital subscription accounts.
              </p>

              <div className="flex gap-4 pt-1">
                <a href="#twitter" className="w-9 h-9 rounded-full bg-white dark:bg-dark-surface hover:bg-border/60 border border-border/80 flex items-center justify-center transition-colors">
                  <span className="text-[13px] text-slate hover:text-ink">𝕏</span>
                </a>
                <a href="#instagram" className="w-9 h-9 rounded-full bg-white dark:bg-dark-surface hover:bg-border/60 border border-border/80 flex items-center justify-center transition-colors">
                  <span className="text-[13px] text-slate hover:text-ink">📸</span>
                </a>
                <a href="#linkedin" className="w-9 h-9 rounded-full bg-white dark:bg-dark-surface hover:bg-border/60 border border-border/80 flex items-center justify-center transition-colors">
                  <span className="text-[13px] text-slate hover:text-ink">in</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink">Product</h4>
              <ul className="space-y-2 text-[14px]">
                <li>
                  <button
                    onClick={() => router.push('/browse')}
                    className="text-slate hover:text-gt-green dark:hover:text-emerald-400 transition-colors duration-150 py-1.5 block cursor-pointer"
                  >
                    Browse splits
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => router.push('/create')}
                    className="text-slate hover:text-gt-green dark:hover:text-emerald-400 transition-colors duration-150 py-1.5 block cursor-pointer"
                  >
                    List a split
                  </button>
                </li>
                <li>
                  <a href="#how-it-works-section" className="text-slate hover:text-gt-green dark:hover:text-emerald-400 transition-colors duration-150 py-1.5 block">
                    How it works
                  </a>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink">Company</h4>
              <ul className="space-y-2 text-[14px]">
                <li><a href="#about" className="text-slate hover:text-gt-green dark:hover:text-emerald-400 transition-colors duration-150 py-1.5 block">About us</a></li>
                <li><a href="#blog" className="text-slate hover:text-gt-green dark:hover:text-emerald-400 transition-colors duration-150 py-1.5 block">Blog</a></li>
                <li><span className="text-slate hover:text-gt-green dark:hover:text-emerald-400 transition-colors duration-150 py-1.5 block cursor-pointer">Contact support</span></li>
              </ul>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink">Legal</h4>
              <ul className="space-y-2 text-[14px]">
                <li><span className="text-slate hover:text-gt-green dark:hover:text-emerald-400 transition-colors duration-150 py-1.5 block cursor-pointer">Privacy Policy</span></li>
                <li><span className="text-slate hover:text-gt-green dark:hover:text-emerald-400 transition-colors duration-150 py-1.5 block cursor-pointer">Terms of Service</span></li>
                <li className="flex items-center gap-2 pt-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">All Systems Nominal</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center text-[13px] text-dust">
            <p>© 2026 GrossThrift. Built for the world.</p>
            <p className="mt-2 sm:mt-0">Made with care.</p>
          </div>
        </div>
      </footer>

      <ListingDetailModal
        listing={selectedListing}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedListing(null);
        }}
        user={user}
        onConfirmJoin={handleConfirmJoin}
        onOpenAuth={() => {
          setIsDetailModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}