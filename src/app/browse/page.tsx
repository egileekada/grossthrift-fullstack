'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw } from 'lucide-react';
import { Category } from '@/types/listing';
import { useApp } from '@/context/AppContext';
import { CustomText } from '@/components/ui';
import Navbar from '@/components/Navbar';
import NotificationBar from '@/components/NotificationBar';
import ListingCard from '@/components/ListingCard';
import ListingDetailModal from '@/components/ListingDetailModal';
import AuthModal from '@/components/AuthModal';

const CATEGORIES: ('All' | Category | 'Security')[] = [
  'All',
  'Streaming',
  'AI Tools',
  'Productivity',
  'Storage',
  'Gaming',
  'Security',
];

type SortOption = 'Newest first' | 'Price low-high' | 'Price high-low' | 'Most slots';

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    setUser,
    listings,
    selectedListing,
    setSelectedListing,
    isDetailModalOpen,
    setIsDetailModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    handleConfirmJoin,
  } = useApp();

  const initialQuery = searchParams?.get('q') || searchParams?.get('search') || '';
  const [filterText, setFilterText] = useState<string>(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<'All' | Category | 'Security'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('Newest first');
  const [savedPlans, setSavedPlans] = useState<Record<string, boolean>>({});

  // Custom Filter States
  const [selectedSlots, setSelectedSlots] = useState<'Any' | '1' | '2+'>('Any');
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<boolean>(false);

  useEffect(() => {
    const q = searchParams?.get('q') || searchParams?.get('search');
    if (q !== null && q !== undefined) {
      setFilterText(q);
    }
  }, [searchParams]);

  const toggleSavePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPlans((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    filterText.trim() !== '' ||
    selectedSlots !== 'Any' ||
    selectedMaxPrice !== null ||
    selectedVerification;

  const handleClearAllFilters = () => {
    setSelectedCategory('All');
    setFilterText('');
    setSelectedSlots('Any');
    setSelectedMaxPrice(null);
    setSelectedVerification(false);
    setSortBy('Newest first');
  };

  // Filter listings based on categories, search, slot availability, max price, and host verification
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter((listing) => listing.category === selectedCategory);
    }

    // Slots Filter
    if (selectedSlots === '1') {
      result = result.filter((listing) => listing.slotsTotal - listing.slotsFilled === 1);
    } else if (selectedSlots === '2+') {
      result = result.filter((listing) => listing.slotsTotal - listing.slotsFilled >= 2);
    }

    // Max Price Filter
    if (selectedMaxPrice !== null) {
      result = result.filter((listing) => listing.totalCost / listing.slotsTotal <= selectedMaxPrice);
    }

    // Verification Filter
    if (selectedVerification) {
      result = result.filter((listing) => listing.hostVerified === true);
    }

    // Search Input Filter
    if (filterText.trim() !== '') {
      const search = filterText.toLowerCase();
      result = result.filter(
        (listing) =>
          listing.planName.toLowerCase().includes(search) ||
          listing.category.toLowerCase().includes(search) ||
          (listing.description && listing.description.toLowerCase().includes(search))
      );
    }

    // Sort logic
    if (sortBy === 'Newest first') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'Price low-high') {
      result.sort((a, b) => a.totalCost / a.slotsTotal - b.totalCost / b.slotsTotal);
    } else if (sortBy === 'Price high-low') {
      result.sort((a, b) => b.totalCost / b.slotsTotal - a.totalCost / a.slotsTotal);
    } else if (sortBy === 'Most slots') {
      result.sort((a, b) => b.slotsTotal - b.slotsFilled - (a.slotsTotal - a.slotsFilled));
    }

    return result;
  }, [listings, selectedCategory, filterText, sortBy, selectedSlots, selectedMaxPrice, selectedVerification]);

  const activeCount = filteredListings.length;

  return (
    <div className="bg-off-white min-h-screen pt-[100px] pb-16" id="browse-page-layout">
      <Navbar />
      <NotificationBar />

      {/* PAGE HEADER & DYNAMIC SEARCH SECTION CARD */}
      <div className="max-w-[1120px] mx-auto px-6 sm:px-12 mb-10" id="browse-header-section">
        {/* Simple Title Row */}
        <div className="text-center mb-8 space-y-2">
          <CustomText
            type="display-sm"
            as="h1"
            className="font-display font-bold tracking-[-1.5px] text-ink leading-tight"
          >
            Find your Next <span className="font-serif italic font-light text-accent">Split</span>
          </CustomText>
          <CustomText type="body-md" className="text-slate font-medium">
            Find a premium plan, co-buy together, and start saving instantly.
          </CustomText>
        </div>

        {/* EXQUISITE REAL ESTATE OUTLAY SEARCH CONTAINER */}
        <div
          className="relative overflow-hidden bg-gradient-to-b from-[#1e2621] to-[#121815] border border-white/10 rounded-[28px] py-5 px-6 sm:py-6 sm:px-8 shadow-[0_24px_54px_-10px_rgba(20,28,23,0.3)] text-center space-y-5 max-w-[720px] mx-auto"
          id="real-estate-search-card"
        >
          {/* Subtle technical ambient dots */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none rounded-[28px]" />

          {/* ZONE A: CATEGORY TABS */}
          <div className="border-b border-white/10 pb-1" id="tabs-category-zone">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none justify-start sm:justify-center">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`relative py-3 px-4 text-[13px] sm:text-[14px] font-semibold transition-all duration-150 shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'text-white font-bold'
                      : 'text-white/60 hover:text-white/90 font-medium'
                  }`}
                >
                  <span className="relative z-10">{cat}</span>
                  {selectedCategory === cat && (
                    <motion.div
                      layoutId="activeCategoryBorder"
                      className="absolute bottom-0 left-3 right-3 h-[3px] bg-[#edf3ee] rounded-full z-20"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ZONE B: MAIN CAPSULE SEARCH INPUT BAR */}
          <div className="relative max-w-[640px] mx-auto w-full" id="capsule-search-bar-zone">
            <div className="flex items-center bg-white rounded-2xl p-1.5 sm:p-2 shadow-inner h-[52px] sm:h-[58px] w-full border border-border">
              <Search className="text-dust shrink-0 ml-4 mr-2" size={18} />
              <input
                type="text"
                placeholder="Search YouTube Premium, Spotify, ChatGPT..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full h-full bg-transparent border-none text-[13px] sm:text-[14px] text-ink placeholder:text-dust/80 font-normal focus:ring-0 outline-none px-1"
                id="search-input-field"
              />

              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="text-[12px] font-bold text-gt-red hover:underline cursor-pointer px-2 mr-1 shrink-0"
                >
                  Clear
                </button>
              )}

              <button
                className="bg-[#115c3e] hover:bg-[#15724c] hover:scale-[1.01] active:scale-[0.98] text-white px-5 sm:px-7 h-full rounded-xl sm:rounded-2xl font-bold text-[12px] sm:text-[13px] transition-all duration-200 shadow-md flex items-center justify-center cursor-pointer shrink-0"
                style={{ color: '#ffffff' }}
                id="search-action-btn"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* ACTIVE FILTER SUMMARY BUBBLES */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[12px] text-slate font-medium">Applied:</span>
            {selectedCategory !== 'All' && (
              <span className="bg-white border border-border rounded-full px-3 py-1 text-[12px] font-semibold text-ink flex items-center gap-1.5">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory('All')} className="text-dust hover:text-gt-red font-bold text-[10px] ml-1">×</button>
              </span>
            )}
            {filterText.trim() !== '' && (
              <span className="bg-white border border-border rounded-full px-3 py-1 text-[12px] font-semibold text-ink flex items-center gap-1.5">
                Search: &quot;{filterText}&quot;
                <button onClick={() => setFilterText('')} className="text-dust hover:text-gt-red font-bold text-[10px] ml-1">×</button>
              </span>
            )}
            {selectedSlots !== 'Any' && (
              <span className="bg-white border border-border rounded-full px-3 py-1 text-[12px] font-semibold text-ink flex items-center gap-1.5">
                Slots: {selectedSlots === '1' ? 'Exactly 1' : '2+ Open'}
                <button onClick={() => setSelectedSlots('Any')} className="text-dust hover:text-gt-red font-bold text-[10px] ml-1">×</button>
              </span>
            )}
            {selectedMaxPrice !== null && (
              <span className="bg-white border border-border rounded-full px-3 py-1 text-[12px] font-semibold text-ink flex items-center gap-1.5">
                Max Price: ${selectedMaxPrice}/mo
                <button onClick={() => setSelectedMaxPrice(null)} className="text-dust hover:text-gt-red font-bold text-[10px] ml-1">×</button>
              </span>
            )}
            {selectedVerification && (
              <span className="bg-white border border-border rounded-full px-3 py-1 text-[12px] font-semibold text-ink flex items-center gap-1.5">
                Verified Hosts Only
                <button onClick={() => setSelectedVerification(false)} className="text-dust hover:text-gt-red font-bold text-[10px] ml-1">×</button>
              </span>
            )}
            <button
              onClick={handleClearAllFilters}
              className="text-[12px] text-gt-green font-bold hover:underline cursor-pointer flex items-center gap-1 ml-2"
            >
              <RefreshCw size={12} />
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* MAIN LISTINGS GRID */}
      <main className="px-6 sm:px-12 py-[20px]">
        <div className="max-w-[1120px] mx-auto">
          {/* Active count badge & Sort select */}
          <div className="flex items-center justify-between mb-6 px-1 flex-wrap gap-3 border-b border-border/60 pb-4">
            <span className="text-[14px] text-slate font-medium">
              Showing <strong className="text-ink font-semibold">{activeCount}</strong> available splits
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-slate font-semibold">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-white border border-border text-ink text-[12px] font-semibold py-1 px-3 pr-8 rounded-full focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23707070%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_auto] bg-[right_10px_center] bg-no-repeat"
              >
                <option value="Newest first">Newest first</option>
                <option value="Price low-high">Price low-high</option>
                <option value="Price high-low">Price high-low</option>
                <option value="Most slots">Most slots</option>
              </select>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {activeCount > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                id="listings-grid"
              >
                {filteredListings.map((listing) => (
                  <motion.div
                    key={listing.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
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
              </motion.div>
            ) : (
              /* EMPTY STATE */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-20 max-w-md mx-auto space-y-6"
                id="browse-empty-state"
              >
                <div className="w-[120px] h-[120px] bg-white border border-border rounded-full flex items-center justify-center mx-auto shadow-gt-card">
                  <svg
                    className="w-12 h-12 text-dust"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-sans font-semibold text-[18px] text-ink">No splits found</h3>
                  <p className="text-[14px] text-slate max-w-xs mx-auto leading-relaxed">
                    Try different filters, clear your search, or be the first to start this pool.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleClearAllFilters}
                    className="px-5 py-2.5 bg-white border border-border text-ink hover:bg-surface font-medium rounded-xl transition-all duration-150 cursor-pointer text-[13px]"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => router.push('/create')}
                    className="px-5 py-2.5 bg-[#115c3e] text-white hover:bg-[#15724c] font-medium rounded-xl transition-all duration-150 cursor-pointer text-[13px] inline-flex items-center gap-1.5"
                    style={{ color: '#ffffff' }}
                  >
                    Create a listing
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <ListingDetailModal
        listing={selectedListing}
        isOpen={isDetailModalOpen}
        user={user}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedListing(null);
        }}
        onOpenAuth={() => {
          setIsDetailModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        onConfirmJoin={handleConfirmJoin}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(u) => {
          setUser(u);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-off-white" />}>
      <BrowseContent />
    </Suspense>
  );
}
