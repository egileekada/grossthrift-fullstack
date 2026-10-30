'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Check,
  Copy,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { Category, Currency } from '@/types/listing';
import { useApp } from '@/context/AppContext';
import {
  CustomField,
  CustomText,
  AppButton,
  CustomCheckboxGroup,
} from '@/components/ui';
import Navbar from '@/components/Navbar';
import NotificationBar from '@/components/NotificationBar';
import AuthModal from '@/components/AuthModal';
import PlanIcon from '@/components/PlanIcon';

// 10 plans for the step 1 card grid selector as specified
const GRID_PLANS = [
  { name: 'YouTube Premium', emoji: '🎬', category: 'Streaming' as Category, typicalCost: 22.99 },
  { name: 'Spotify Family', emoji: '🎵', category: 'Streaming' as Category, typicalCost: 16.99 },
  { name: 'Netflix Premium 4K', emoji: '🍿', category: 'Streaming' as Category, typicalCost: 22.99 },
  { name: 'ChatGPT Plus Team', emoji: '🤖', category: 'AI Tools' as Category, typicalCost: 20.00 },
  { name: 'Adobe Creative Cloud', emoji: '🎨', category: 'Productivity' as Category, typicalCost: 89.99 },
  { name: 'Microsoft 365 Family', emoji: '📎', category: 'Productivity' as Category, typicalCost: 9.99 },
  { name: 'Apple One Premier', emoji: '🍏', category: 'Storage' as Category, typicalCost: 37.95 },
  { name: 'Canva Pro', emoji: '✨', category: 'Productivity' as Category, typicalCost: 14.99 },
  { name: 'NordVPN', emoji: '🛡️', category: 'Security' as Category, typicalCost: 12.99 },
  { name: 'Notion Plus', emoji: '📝', category: 'Productivity' as Category, typicalCost: 10.00 },
];

export default function CreateListingPage() {
  const router = useRouter();
  const {
    user,
    setUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    handleCreateListing,
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [createdListingId, setCreatedListingId] = useState<string>('');

  // Form Fields
  const [selectedPlan, setSelectedPlan] = useState<string>('Spotify Family');
  const [customPlanName, setCustomPlanName] = useState<string>('');
  const [category, setCategory] = useState<Category>('Streaming');
  const [description, setDescription] = useState<string>('');

  // Step 2 Fields
  const [currency, setCurrency] = useState<Currency>('USD');
  const [totalCost, setTotalCost] = useState<number>(16.99);
  const [slotsTotal, setSlotsTotal] = useState<number>(4);

  // Step 3 Fields
  const [contactMethod, setContactMethod] = useState<'WhatsApp' | 'Email'>('WhatsApp');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [copied, setCopied] = useState(false);

  // Sync pricing when card plans are selected
  useEffect(() => {
    if (selectedPlan !== 'Other') {
      const match = GRID_PLANS.find((p) => p.name === selectedPlan);
      if (match) {
        setCategory(match.category);
        setTotalCost(match.typicalCost);
      }
    } else {
      setCategory('Other');
      setTotalCost(10.0);
    }
  }, [selectedPlan]);

  const planName = selectedPlan === 'Other' ? customPlanName : selectedPlan;
  const costPerPerson = totalCost / slotsTotal;
  const savingsPercent = Math.round((1 - costPerPerson / totalCost) * 100);

  const handleNext = () => {
    setDirection('forward');
    setStep((prev) => (prev + 1) as 1 | 2 | 3);
  };

  const handleBack = () => {
    setDirection('backward');
    setStep((prev) => (prev - 1) as 1 | 2 | 3);
  };

  const handlePostSplit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const finalContact = contactMethod === 'WhatsApp' ? whatsappNumber : contactEmail;

      const created = await handleCreateListing({
        planName: planName || 'Custom subscription',
        category,
        totalCost,
        slotsTotal,
        currency,
        description: description || `Split co-buying group for ${planName}. Save together.`,
        contactMethod,
        contactValue: finalContact || user.email,
        logoEmoji: GRID_PLANS.find((p) => p.name === selectedPlan)?.emoji || '🔋',
      });

      if (created?.id) {
        setCreatedListingId(created.id);
      }

      setIsSubmitting(false);
      setIsSuccess(true);

      confetti({
        particleCount: 150,
        spread: 80,
        colors: ['#0a0a0a', '#f0f0ee', '#16a34a'],
      });
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : 'Unable to create listing. Please try again.');
    }
  };

  const shareUrl =
    typeof window !== 'undefined' && createdListingId
      ? `${window.location.origin}/listings/${createdListingId}`
      : `https://grossthrift.co/listings/${createdListingId || 'split'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auth Guard
  if (!user) {
    return (
      <div className="bg-off-white min-h-screen">
        <Navbar />
        <NotificationBar />
        <div className="max-w-[680px] mx-auto px-6 py-[120px] text-center" id="create-unauth">
          <div className="bg-white border border-border p-8 rounded-[20px] shadow-gt-card space-y-6">
            <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center mx-auto text-ink">
              🔒
            </div>
            <div className="space-y-2">
              <CustomText type="title-lg" as="h2" className="font-sans font-semibold text-ink">
                Sign in required
              </CustomText>
              <CustomText type="body-md" className="text-slate leading-relaxed">
                You must be logged in to create and host a split subscription pool.
              </CustomText>
            </div>
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => setIsAuthModalOpen(true)}
            >
              Sign in to continue
            </AppButton>
          </div>
        </div>
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

  // SUCCESS TAKEOVER VIEW
  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center select-none" id="success-takeover">
        <div className="max-w-md w-full space-y-8">
          <div className="w-20 h-20 bg-gt-green-bg border border-[#bbf7d0] rounded-full flex items-center justify-center mx-auto">
            <motion.svg
              className="w-10 h-10 text-gt-green"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
            >
              <motion.path
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </motion.svg>
          </div>

          <div className="space-y-2">
            <CustomText type="headline-lg" as="h1" className="font-sans font-semibold tracking-tight text-ink leading-none">
              Your split is live!
            </CustomText>
            <CustomText type="body-md" className="text-slate">
              People can now find and join your listing.
            </CustomText>
          </div>

          <div className="bg-surface border border-border rounded-[16px] p-5 text-left space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-dust block">
              Share to fill your slots faster
            </span>
            <div className="flex gap-2">
              <CustomField
                value={shareUrl}
                disabled
                className="flex-1"
              />
              <AppButton
                onPress={handleCopyLink}
                variant="primary"
                startContent={copied ? <Check size={14} /> : <Copy size={14} />}
              >
                {copied ? 'Copied!' : 'Copy link'}
              </AppButton>
            </div>

            <div className="flex gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=Join%20my%20${planName}%20split%20on%20GrossThrift%20and%20save%20${savingsPercent}%25!`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 bg-white border border-border hover:bg-surface rounded-xl text-[12px] font-medium text-slate flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Share on X</span>
              </a>
              <a
                href={`https://wa.me/?text=Join%20my%20${planName}%20split%20on%20GrossThrift%20and%20save%20${savingsPercent}%25!`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 bg-white border border-border hover:bg-surface rounded-xl text-[12px] font-medium text-slate flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Share on WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.push('/dashboard')}
            >
              View my listing
            </AppButton>
            <AppButton
              variant="secondary-outline"
              size="lg"
              fullWidth
              onPress={() => {
                setIsSuccess(false);
                setStep(1);
                router.push('/browse');
              }}
            >
              Browse other splits
            </AppButton>
          </div>
        </div>
      </div>
    );
  }

  // Active step slide animations
  const slideVariants = {
    enter: (dir: 'forward' | 'backward') => ({
      opacity: 0,
      x: dir === 'forward' ? 30 : -30,
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
    },
    exit: (dir: 'forward' | 'backward') => ({
      opacity: 0,
      x: dir === 'forward' ? -30 : 30,
      transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
    }),
  };

  return (
    <div className="bg-off-white min-h-screen">
      <Navbar />
      <NotificationBar />

      <div className="max-w-[1120px] mx-auto px-6 py-[110px]" id="create-flow-layout">
        {/* Step Progress Line */}
        <div className="max-w-[480px] mx-auto mb-12 space-y-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 h-[1.5px] bg-border -translate-y-1/2 z-0" />
            <div
              className="absolute left-0 top-1/2 h-[1.5px] bg-ink -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />

            {/* Dot 1 */}
            <div className="relative z-10">
              {step > 1 ? (
                <div className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-white dark:text-[#141c17] text-[10px]">
                  ✓
                </div>
              ) : (
                <div className={`w-5 h-5 rounded-full ${step === 1 ? 'bg-ink border-4 border-surface shadow-[0_0_0_2px_var(--color-ink)]' : 'bg-white border-[1.5px] border-border'}`} />
              )}
            </div>

            {/* Dot 2 */}
            <div className="relative z-10">
              {step > 2 ? (
                <div className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-white dark:text-[#141c17] text-[10px]">
                  ✓
                </div>
              ) : (
                <div className={`w-5 h-5 rounded-full ${step === 2 ? 'bg-ink border-4 border-surface shadow-[0_0_0_2px_var(--color-ink)]' : 'bg-white border-[1.5px] border-border'}`} />
              )}
            </div>

            {/* Dot 3 */}
            <div className="relative z-10">
              <div className={`w-5 h-5 rounded-full ${step === 3 ? 'bg-ink border-4 border-surface shadow-[0_0_0_2px_var(--color-ink)]' : 'bg-white border-[1.5px] border-border'}`} />
            </div>
          </div>

          <div className="flex justify-between text-[13px] font-medium text-dust">
            <span className={step === 1 ? 'text-ink' : ''}>Plan</span>
            <span className={step === 2 ? 'text-ink' : ''}>Pricing</span>
            <span className={step === 3 ? 'text-ink' : ''}>Contact</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start text-left">
          {/* Left Column: Form Blocks */}
          <div className="lg:col-span-7 bg-white border border-border rounded-[20px] p-[28px] shadow-gt-card min-h-[480px] flex flex-col justify-between">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <motion.div
                  key="step-1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-6"
                >
                  <div>
                    <CustomText type="headline-sm" as="h2" className="font-sans font-semibold text-ink">
                      What are you splitting?
                    </CustomText>
                  </div>

                  {/* Card selection grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {GRID_PLANS.map((plan) => {
                      const isSelected = selectedPlan === plan.name;
                      return (
                        <div
                          key={plan.name}
                          onClick={() => setSelectedPlan(plan.name)}
                          className={`border rounded-xl p-[14px_16px] cursor-pointer transition-all duration-150 relative flex items-center gap-3 ${
                            isSelected
                              ? 'border-ink bg-surface shadow-gt-card'
                              : 'border-border bg-white hover:bg-surface'
                          }`}
                        >
                          <div className="w-[44px] h-[44px] bg-surface dark:bg-dark-bg border border-border/40 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                            <PlanIcon name={plan.name} size={22} />
                          </div>
                          <span className="text-[15px] font-medium text-ink">{plan.name}</span>
                          {isSelected && (
                            <span className="absolute top-2 right-2 text-[10px] text-ink font-bold">✓</span>
                          )}
                        </div>
                      );
                    })}

                    {/* Other / Custom Card */}
                    <div
                      onClick={() => setSelectedPlan('Other')}
                      className={`border rounded-xl p-[14px_16px] cursor-pointer transition-all duration-150 relative flex items-center gap-3 ${
                        selectedPlan === 'Other'
                          ? 'border-ink bg-surface shadow-gt-card'
                          : 'border-border bg-white hover:bg-surface'
                      }`}
                    >
                      <div className="w-[44px] h-[44px] bg-surface dark:bg-dark-bg border border-border/40 rounded-xl flex items-center justify-center shrink-0 text-dust shadow-sm">
                        <Plus size={20} />
                      </div>
                      <span className="text-[15px] font-medium text-ink">Other (custom)</span>
                      {selectedPlan === 'Other' && (
                        <span className="absolute top-2 right-2 text-[10px] text-ink font-bold">✓</span>
                      )}
                    </div>
                  </div>

                  {/* Inline input for "Other" card */}
                  {selectedPlan === 'Other' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2 pt-2"
                    >
                      <CustomField
                        label="Custom Plan Name"
                        placeholder="e.g. Claude Pro, Midjourney Team, Bloomberg"
                        value={customPlanName}
                        onChange={(val) => setCustomPlanName(String(val))}
                      />
                    </motion.div>
                  )}

                  {/* Category selectors */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-dust block">Category</span>
                    <div className="flex flex-wrap gap-2">
                      {['Streaming', 'AI Tools', 'Productivity', 'Storage', 'Gaming', 'Other'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => selectedPlan === 'Other' && setCategory(cat as Category)}
                          disabled={selectedPlan !== 'Other'}
                          className={`h-[32px] px-4 rounded-full text-[13px] font-medium transition-all duration-150 border cursor-pointer ${
                            category === cat
                              ? 'bg-ink text-white dark:text-[#141c17] border-ink'
                              : 'bg-transparent text-slate border-border hover:bg-surface disabled:opacity-50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <CustomField
                      as="textarea"
                      label="Description (optional)"
                      placeholder="Add details about this split — anything joiners should know."
                      value={description}
                      onChange={(val) => setDescription(String(val).slice(0, 200))}
                    />
                    <div className="flex justify-end text-[11px] text-dust font-mono">
                      <span className={description.length >= 180 ? 'text-gt-red' : description.length >= 150 ? 'text-gt-amber' : 'text-dust'}>
                        {description.length} / 200
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-6"
                >
                  <div>
                    <CustomText type="headline-sm" as="h2" className="font-sans font-semibold text-ink">
                      Set your split price
                    </CustomText>
                  </div>

                  {/* Total Cost Row */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-dust block">
                      Full plan cost per month
                    </label>
                    <div className="flex gap-3">
                      <CustomField
                        as="select"
                        value={currency}
                        options={[
                          { label: '🇺🇸 USD', value: 'USD' },
                          { label: '🇬🇧 GBP', value: 'GBP' },
                          { label: '🇪🇺 EUR', value: 'EUR' },
                          { label: '🇳🇬 NGN', value: 'NGN' },
                        ]}
                        onChange={(val) => setCurrency((String(val) || 'USD') as Currency)}
                        className="w-[140px]"
                      />

                      <CustomField
                        type="number"
                        value={totalCost}
                        onChange={(val) => setTotalCost(parseFloat(String(val)) || 0)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Slots Stepper */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-dust block">
                      Number of people splitting (including you)
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setSlotsTotal((prev) => Math.max(2, prev - 1))}
                        className="w-10 h-10 rounded-full border border-border bg-white text-ink font-semibold flex items-center justify-center hover:bg-surface transition-colors duration-150 cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-[32px] font-bold tracking-tight text-ink font-mono min-w-[48px] text-center">
                        {slotsTotal}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSlotsTotal((prev) => Math.min(6, prev + 1))}
                        className="w-10 h-10 rounded-full border border-border bg-white text-ink font-semibold flex items-center justify-center hover:bg-surface transition-colors duration-150 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Auto Calculated Display Card */}
                  <div className="bg-surface rounded-2xl p-5 border border-border space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-slate font-medium">Cost per person</span>
                      <span className="text-[28px] font-bold text-gt-green font-numeric-tabular leading-none">
                        ${costPerPerson.toFixed(2)}<span className="text-xs font-normal">/mo</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-slate font-medium">Each person saves</span>
                      <span className="text-[15px] font-semibold text-ink">
                        {savingsPercent}% vs paying alone
                      </span>
                    </div>

                    {savingsPercent > 50 && (
                      <div className="text-[13px] text-[#16a34a] font-medium animate-pulse pt-1 flex items-center gap-1.5">
                        <span>🎉</span>
                        <span>Great deal — most people save 60-80% on GrossThrift</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step-3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-6"
                >
                  <div>
                    <CustomText type="headline-sm" as="h2" className="font-sans font-semibold text-ink">
                      How should people reach you?
                    </CustomText>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => setContactMethod('WhatsApp')}
                      className={`border rounded-xl p-5 text-center cursor-pointer transition-all duration-150 flex flex-col items-center gap-3 ${
                        contactMethod === 'WhatsApp' ? 'border-ink bg-surface shadow-gt-card' : 'border-border bg-white hover:bg-surface'
                      }`}
                    >
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" fill="#25D366" />
                        </svg>
                      </div>
                      <span className="text-[13px] font-semibold">WhatsApp</span>
                    </div>

                    <div
                      onClick={() => setContactMethod('Email')}
                      className={`border rounded-xl p-5 text-center cursor-pointer transition-all duration-150 flex flex-col items-center gap-3 ${
                        contactMethod === 'Email' ? 'border-ink bg-surface shadow-gt-card' : 'border-border bg-white hover:bg-surface'
                      }`}
                    >
                      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335" />
                        </svg>
                      </div>
                      <span className="text-[13px] font-semibold">Email</span>
                    </div>
                  </div>

                  {/* Contact Input fields using CustomField */}
                  {contactMethod === 'WhatsApp' ? (
                    <CustomField
                      label="WhatsApp number"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={whatsappNumber}
                      onChange={(val) => setWhatsappNumber(String(val))}
                    />
                  ) : (
                    <CustomField
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      value={contactEmail}
                      onChange={(val) => setContactEmail(String(val))}
                    />
                  )}

                  {/* Blue Info Notice Box */}
                  <div className="flex gap-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-4 text-[#0369a1]">
                    <span className="text-[16px] shrink-0 mt-0.5">ℹ️</span>
                    <p className="text-[13px] leading-relaxed">
                      Your contact details are only revealed to people whose join request you accept.
                    </p>
                  </div>

                  {/* CustomCheckboxGroup */}
                  <div className="pt-2">
                    <CustomCheckboxGroup
                      value={termsAccepted ? ['accepted'] : []}
                      onChange={(vals) => setTermsAccepted(vals.includes('accepted'))}
                      options={[
                        {
                          value: 'accepted',
                          label: "I confirm this split complies with each platform's terms of service",
                        },
                      ]}
                    />
                  </div>

                  {submitError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[13px] font-medium">
                      {submitError}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Controllers */}
            <div className="flex justify-between items-center pt-8 border-t border-border mt-8">
              {step > 1 ? (
                <AppButton
                  variant="secondary-outline"
                  onPress={handleBack}
                >
                  ← Back
                </AppButton>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <AppButton
                  variant="primary"
                  onPress={handleNext}
                  disabled={selectedPlan === 'Other' && !customPlanName}
                >
                  Continue →
                </AppButton>
              ) : (
                <AppButton
                  variant="primary"
                  onPress={handlePostSplit}
                  loading={isSubmitting}
                  disabled={
                    isSubmitting ||
                    !termsAccepted ||
                    (contactMethod === 'WhatsApp' ? !whatsappNumber : !contactEmail)
                  }
                >
                  Post my split
                </AppButton>
              )}
            </div>
          </div>

          {/* Right Column: Live Update Card Preview */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-dust block">
              Preview
            </span>
            <div className="border border-border rounded-[24px] p-1 bg-surface shadow-gt-card">
              <div className="bg-white rounded-[20px] p-6 text-left space-y-4 relative">
                {/* Fake Pulse/updating indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[11px] text-dust">
                  <span className="w-1.5 h-1.5 bg-gt-green rounded-full animate-ping" />
                  <span>Live update</span>
                </div>

                {/* Title / Identity */}
                <div className="flex gap-3">
                  <div className="w-[44px] h-[44px] bg-surface dark:bg-dark-bg border border-border/40 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <PlanIcon name={planName || 'Custom'} size={22} />
                  </div>
                  <div>
                    <CustomText type="title-md" as="h3" className="font-display font-semibold text-ink leading-tight">
                      {planName || 'Custom subscription'}
                    </CustomText>
                    <span className="text-[12px] font-medium text-dust">
                      {category}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-border my-4" />

                {/* Host Mockup */}
                <div className="flex items-center gap-2.5">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover border border-border"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex items-center gap-1 text-[13px] text-slate">
                    <span className="font-medium text-ink">{user.name}</span>
                    <span className="text-dust">·</span>
                    <ShieldCheck size={14} className="text-[#16a34a]" />
                    <span className="text-[12px] text-[#16a34a] font-medium">Verified host</span>
                  </div>
                </div>

                {/* Slots progress */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-dust">Slots available</span>
                    <span className="text-slate font-medium">1 of {slotsTotal} filled</span>
                  </div>
                  <div className="w-full h-[6px] bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-ink" style={{ width: `${(1 / slotsTotal) * 100}%` }} />
                  </div>
                </div>

                {/* Price & Savings */}
                <div className="pt-4 border-t border-border flex justify-between items-baseline mt-4">
                  <div>
                    <span className="text-[11px] text-dust block font-normal">per person / month</span>
                    <span className="text-[26px] font-bold tracking-tight text-ink font-numeric-tabular leading-none">
                      ${costPerPerson.toFixed(2)}
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] rounded-full text-[12px] font-semibold">
                    Save {savingsPercent}%
                  </span>
                </div>

                {/* Action Button Mock */}
                <AppButton
                  variant="primary"
                  fullWidth
                  disabled
                  className="mt-4 pointer-events-none opacity-50"
                >
                  Join split
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      </div>

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
