'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  UtensilsCrossed,
  ChefHat,
  Table as TableIcon,
  Crown,
  Shield,
  Layers,
} from 'lucide-react';
import {
  OnboardingRole,
  shouldShowTutorial,
  completeTutorial,
  skipTutorial,
  CURRENT_TUTORIAL_VERSION,
} from '@/lib/onboarding';

export interface TourStep {
  selector: string;
  fallbackSelector?: string;
  title: string;
  description: string;
  tip?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  badge?: string;
}

export const ROLE_TOUR_STEPS: Record<OnboardingRole, { roleTitle: string; roleKicker: string; steps: TourStep[] }> = {
  customer: {
    roleTitle: 'Dining Experience Concierge',
    roleKicker: 'Customer Welcome Guide',
    steps: [
      {
        selector: '[data-tour="customer-menu"]',
        fallbackSelector: 'a[href="/menu"]',
        title: 'Browse the Menu',
        description: 'Explore signature dishes, nutritional highlights, and daily chef selections.',
        tip: 'Filter by calorie and protein goals or dietary preferences.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="food-category"]',
        fallbackSelector: '.dish-card-reveal, [data-tour="product-card"]',
        title: 'Food Categories',
        description: 'Quickly find what you crave: High Protein, Vegetarian, or Low-Calorie options.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="product-card"]',
        fallbackSelector: '.dish-card-reveal',
        title: 'View Dish Details',
        description: 'Tap any dish card to view macronutrient breakdowns, ingredients, and allergen notes.',
        tip: 'Each dish is prepared live upon order confirmation.',
        placement: 'top',
      },
      {
        selector: '[data-tour="add-to-cart"]',
        fallbackSelector: 'button[aria-label*="Add"]',
        title: 'Add to Cart',
        description: 'Add this dish to your dining ticket. You can adjust portions with the live +/- stepper.',
        placement: 'top',
      },
      {
        selector: '[data-tour="cart-trigger"]',
        fallbackSelector: 'button[aria-label*="cart"], a[href="/cart"]',
        title: 'Your Order Cart',
        description: 'Review your selected items, configure dining style (Dine-in or Takeaway), and checkout.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="customer-ai"]',
        fallbackSelector: 'button[aria-label*="chat"], button[aria-label*="AI"]',
        title: 'Mix AI Concierge',
        description: 'Consult Mix, our AI dining assistant, for culinary pairings, macro search, and reservations.',
        tip: 'Tap the glowing chat icon at any time.',
        placement: 'left',
      },
    ],
  },

  waiter: {
    roleTitle: 'Server Co-Pilot Terminal',
    roleKicker: 'Waitstaff Operations Guide',
    steps: [
      {
        selector: '[data-tour="waiter-dashboard"]',
        fallbackSelector: 'header',
        title: 'Server Command Center',
        description: 'Your real-time terminal for table oversight, guest ticket assembly, and kitchen communication.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="waiter-tables"]',
        fallbackSelector: 'button:has-text("Floor Tables")',
        title: 'Assigned Dining Tables',
        description: 'Monitor active tables in your section. See occupancy states, active ticket totals, and seat counts.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="waiter-take-order"]',
        fallbackSelector: 'button:has-text("Take Order")',
        title: 'Taking Guest Orders',
        description: 'Select an assigned table, search dishes, and assemble tickets with lightning speed.',
        tip: 'Kitchen modifiers and allergy notes can be attached per dish.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="waiter-ready-queue"]',
        fallbackSelector: 'button:has-text("Ready to Serve")',
        title: 'Ready to Serve Queue',
        description: 'Receive real-time alerts when the chef marks orders ready at the kitchen pass.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="waiter-orders"]',
        fallbackSelector: 'button:has-text("Active KOTs")',
        title: 'Active Kitchen Tickets',
        description: 'Track live order progress from accepted tickets to cooking without running to the kitchen.',
        placement: 'bottom',
      },
    ],
  },

  chef: {
    roleTitle: 'Culinary Kitchen KDS',
    roleKicker: 'Chef Brigade Workflow',
    steps: [
      {
        selector: '[data-tour="chef-kds-header"]',
        fallbackSelector: 'header',
        title: 'Kitchen Display System',
        description: 'Your digital station board for realtime ticket streaming, active timers, and station balance.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="chef-orders"]',
        fallbackSelector: 'div:has-text("1. New Orders")',
        title: '1. New Incoming Orders',
        description: 'Verified guest orders arrive here with customer notes, modifiers, and priority tags.',
        placement: 'right',
      },
      {
        selector: '[data-tour="chef-prep-btn"]',
        fallbackSelector: 'button:has-text("Start Cooking")',
        title: 'Start Cooking Order',
        description: 'Click Start Cooking to move the ticket to Preparing and initiate the live station timer.',
        placement: 'top',
      },
      {
        selector: '[data-tour="chef-ready"]',
        fallbackSelector: 'div:has-text("3. Ready for Server")',
        title: 'Ready at Pass',
        description: 'Marking an order ready instantly notifies floor waitstaff for prompt table delivery.',
        tip: 'Tickets show elapsed wait times to maintain service standards.',
        placement: 'left',
      },
    ],
  },

  receptionist: {
    roleTitle: 'Front Desk Concierge',
    roleKicker: 'Host & Seating Guide',
    steps: [
      {
        selector: '[data-tour="reception-header"]',
        fallbackSelector: 'header',
        title: 'Reception Terminal',
        description: 'Manage dining room flow, guest reservations, and walk-in party allocation.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="reception-table-map"]',
        fallbackSelector: 'button:has-text("Live Floor Layout")',
        title: 'Live Floor Layout',
        description: 'Interactive real-time map displaying Available, Occupied, and Reserved tables.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="reception-available-table"]',
        fallbackSelector: 'div:has-text("Available Tables")',
        title: 'Available Capacity',
        description: 'Instantly view available seating counts and open tables for immediate guest seating.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="reception-reservations"]',
        fallbackSelector: 'button:has-text("Reservations List")',
        title: 'Reservation Master List',
        description: 'Access upcoming bookings, party sizes, and special dining arrangements.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="reception-walkin"]',
        fallbackSelector: 'button:has-text("New Booking")',
        title: 'Fast Walk-in Booking',
        description: 'Seat walk-in patrons and open a live dining session in under 5 seconds.',
        placement: 'left',
      },
    ],
  },

  admin: {
    roleTitle: 'Executive Operations Suite',
    roleKicker: 'Administrator Guide',
    steps: [
      {
        selector: '[data-tour="admin-dashboard"]',
        fallbackSelector: 'button:has-text("Executive Overview")',
        title: 'Executive Dashboard',
        description: 'Real-time sales tracking, ticket averages, and operational efficiency indicators.',
        placement: 'right',
      },
      {
        selector: '[data-tour="admin-sales"]',
        fallbackSelector: 'div:has-text("Total Revenue")',
        title: 'Direct Revenue Streams',
        description: 'Track commission-free direct sales across Dine-in, Takeaway, and Online orders.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="admin-menu"]',
        fallbackSelector: 'button:has-text("Menu & Dishes")',
        title: 'Menu & Recipe Management',
        description: 'Update dish pricing, availability toggles, calorie data, and culinary modifiers.',
        placement: 'right',
      },
      {
        selector: '[data-tour="admin-tables"]',
        fallbackSelector: 'button:has-text("Tables & QR Codes")',
        title: 'Dining Tables & QR Codes',
        description: 'Configure restaurant floor layouts and generate high-resolution QR table codes.',
        placement: 'right',
      },
      {
        selector: '[data-tour="admin-staff"]',
        fallbackSelector: 'button:has-text("Staff & Roles")',
        title: 'Staff Roles & Live Presence',
        description: 'Monitor active staff presence, employee passcodes, and department permissions.',
        placement: 'right',
      },
      {
        selector: '[data-tour="admin-security"]',
        fallbackSelector: 'button:has-text("Audit Trail")',
        title: 'Security & Audit Logs',
        description: 'Review timestamped system operations, login records, and order verification logs.',
        placement: 'right',
      },
    ],
  },

  owner: {
    roleTitle: 'Owner Command Suite',
    roleKicker: 'Owner Strategic Guide',
    steps: [
      {
        selector: '[data-tour="admin-dashboard"]',
        fallbackSelector: 'header',
        title: 'Business Overview',
        description: 'High-level operational metrics, revenue growth, and multi-department activity.',
        placement: 'right',
      },
      {
        selector: '[data-tour="admin-sales"]',
        fallbackSelector: 'div:has-text("Total Revenue")',
        title: 'Gross Revenue Analytics',
        description: 'Monitor total turnover, average ticket sizes, and direct sales velocity.',
        placement: 'bottom',
      },
      {
        selector: '[data-tour="owner-ai-insights"]',
        fallbackSelector: 'div:has-text("Top Performing")',
        title: 'AI Strategic Intelligence',
        description: 'Automated performance reports and top-performing dishes curated by Aether AI.',
        placement: 'top',
      },
      {
        selector: '[data-tour="admin-staff"]',
        fallbackSelector: 'button:has-text("Staff & Roles")',
        title: 'Staff Presence & Oversight',
        description: 'Real-time overview of active waitstaff, chefs, receptionists, and managers on duty.',
        placement: 'right',
      },
      {
        selector: '[data-tour="admin-settings"]',
        fallbackSelector: 'button:has-text("Restaurant Settings")',
        title: 'Restaurant Settings',
        description: 'Configure global business details, currency, taxes, and operating policies.',
        placement: 'right',
      },
    ],
  },
};

interface PositionResult {
  targetRect: DOMRect;
  tooltipStyle: React.CSSProperties;
  arrowDirection: 'top' | 'bottom' | 'left' | 'right';
  arrowStyle: React.CSSProperties;
}

interface Props {
  role: OnboardingRole;
  userId?: string;
  userName?: string;
  staffName?: string;
}

export default function RoleOnboardingTutorial({ role, userId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [positionResult, setPositionResult] = useState<PositionResult | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const roleConfig = ROLE_TOUR_STEPS[role] || ROLE_TOUR_STEPS.customer;
  const steps = roleConfig.steps;
  const currentStep = steps[currentStepIndex];

  // 1. Check if tutorial should open on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Small delay to allow page DOM elements to mount and hydrate cleanly
    const checkTimer = setTimeout(() => {
      const show = shouldShowTutorial(role, userId);
      if (show) {
        setIsOpen(true);
        setCurrentStepIndex(0);
      }
    }, 900);

    const handleRestart = (e: any) => {
      if (!e.detail?.role || e.detail.role === role) {
        setIsOpen(true);
        setCurrentStepIndex(0);
      }
    };
    window.addEventListener('prathomix:restart_tutorial', handleRestart);

    return () => {
      clearTimeout(checkTimer);
      window.removeEventListener('prathomix:restart_tutorial', handleRestart);
    };
  }, [role, userId]);

  // 2. Measure & compute intelligent positioning next to actual DOM element
  const updatePosition = useCallback((element: HTMLElement, step: TourStep) => {
    if (!element || typeof window === 'undefined') return;

    const rect = element.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Responsive Tooltip Size
    const tooltipWidth = Math.min(320, vw - 24);
    const tooltipHeight = 200; // Estimated height for clearance
    const gap = 14;

    const spaceBelow = vh - (rect.bottom + gap);
    const spaceAbove = rect.top - gap;
    const spaceRight = vw - (rect.right + gap);
    const spaceLeft = rect.left - gap;

    let chosenPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

    // Desktop: respect preferred placement if space allows
    if (vw >= 768) {
      if (step.placement === 'right' && spaceRight >= tooltipWidth + 10) {
        chosenPlacement = 'right';
      } else if (step.placement === 'left' && spaceLeft >= tooltipWidth + 10) {
        chosenPlacement = 'left';
      } else if (step.placement === 'top' && spaceAbove >= tooltipHeight + 10) {
        chosenPlacement = 'top';
      } else if (spaceBelow >= tooltipHeight + 10) {
        chosenPlacement = 'bottom';
      } else if (spaceAbove >= tooltipHeight + 10) {
        chosenPlacement = 'top';
      } else if (spaceRight >= tooltipWidth + 10) {
        chosenPlacement = 'right';
      } else {
        chosenPlacement = 'bottom';
      }
    } else {
      // Mobile: prefer bottom if space, else top
      if (spaceBelow >= tooltipHeight) {
        chosenPlacement = 'bottom';
      } else if (spaceAbove >= tooltipHeight) {
        chosenPlacement = 'top';
      } else {
        chosenPlacement = spaceBelow > spaceAbove ? 'bottom' : 'top';
      }
    }

    let top = 0;
    let left = 0;
    let arrowDirection: 'top' | 'bottom' | 'left' | 'right' = 'top';
    let arrowStyle: React.CSSProperties = {};

    if (chosenPlacement === 'bottom') {
      top = rect.bottom + gap;
      left = Math.max(12, Math.min(vw - tooltipWidth - 12, rect.left + rect.width / 2 - tooltipWidth / 2));
      arrowDirection = 'top';
      const arrowLeft = Math.max(20, Math.min(tooltipWidth - 20, (rect.left + rect.width / 2) - left));
      arrowStyle = { top: '-7px', left: `${arrowLeft}px`, transform: 'translateX(-50%)' };
    } else if (chosenPlacement === 'top') {
      top = Math.max(12, rect.top - tooltipHeight - gap);
      left = Math.max(12, Math.min(vw - tooltipWidth - 12, rect.left + rect.width / 2 - tooltipWidth / 2));
      arrowDirection = 'bottom';
      const arrowLeft = Math.max(20, Math.min(tooltipWidth - 20, (rect.left + rect.width / 2) - left));
      arrowStyle = { bottom: '-7px', left: `${arrowLeft}px`, transform: 'translateX(-50%)' };
    } else if (chosenPlacement === 'right') {
      left = rect.right + gap;
      top = Math.max(12, Math.min(vh - tooltipHeight - 12, rect.top + rect.height / 2 - tooltipHeight / 2));
      arrowDirection = 'left';
      const arrowTop = Math.max(20, Math.min(tooltipHeight - 20, (rect.top + rect.height / 2) - top));
      arrowStyle = { left: '-7px', top: `${arrowTop}px`, transform: 'translateY(-50%)' };
    } else if (chosenPlacement === 'left') {
      left = Math.max(12, rect.left - tooltipWidth - gap);
      top = Math.max(12, Math.min(vh - tooltipHeight - 12, rect.top + rect.height / 2 - tooltipHeight / 2));
      arrowDirection = 'right';
      const arrowTop = Math.max(20, Math.min(tooltipHeight - 20, (rect.top + rect.height / 2) - top));
      arrowStyle = { right: '-7px', top: `${arrowTop}px`, transform: 'translateY(-50%)' };
    }

    setPositionResult({
      targetRect: rect,
      tooltipStyle: {
        position: 'fixed',
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        width: `${tooltipWidth}px`,
        zIndex: 99999,
      },
      arrowDirection,
      arrowStyle,
    });
  }, []);

  // 3. Locate DOM element, scroll smoothly if off-screen, and attach listeners
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    let timeoutId: NodeJS.Timeout;
    let observer: MutationObserver | null = null;

    const findAndTarget = () => {
      let el = document.querySelector(currentStep.selector) as HTMLElement | null;

      // Try fallback selector if primary not found
      if (!el && currentStep.fallbackSelector) {
        el = document.querySelector(currentStep.fallbackSelector) as HTMLElement | null;
      }

      if (el) {
        setTargetElement(el);

        // Smooth scroll if element is outside comfortable viewport bounds
        const rect = el.getBoundingClientRect();
        const isInView =
          rect.top >= 70 &&
          rect.bottom <= window.innerHeight - 70 &&
          rect.left >= 0 &&
          rect.right <= window.innerWidth;

        if (!isInView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          // Re-measure after smooth scrolling finishes
          timeoutId = setTimeout(() => {
            updatePosition(el!, currentStep);
          }, 350);
        } else {
          updatePosition(el, currentStep);
        }
      } else {
        // Element not found on this screen: gracefully advance to next valid step without error
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          // If no remaining steps found, close gracefully
          completeTutorial(role, userId, CURRENT_TUTORIAL_VERSION);
          setIsOpen(false);
        }
      }
    };

    findAndTarget();

    // Listeners for window resize and scroll to keep spotlight attached
    const handleScrollOrResize = () => {
      if (targetElement) {
        updatePosition(targetElement, currentStep);
      }
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      if (observer) (observer as MutationObserver).disconnect();
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize);
    };
  }, [isOpen, currentStepIndex, currentStep, steps.length, role, userId, targetElement, updatePosition]);

  // 4. Tour Navigation Controls
  const handleNext = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeTutorial(role, userId, CURRENT_TUTORIAL_VERSION);
      setIsOpen(false);
    }
  }, [currentStepIndex, steps.length, role, userId]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleSkip = useCallback(() => {
    skipTutorial(role, userId, CURRENT_TUTORIAL_VERSION);
    setIsOpen(false);
  }, [role, userId]);

  if (!isOpen || !currentStep || !positionResult) return null;

  const { targetRect, tooltipStyle, arrowDirection, arrowStyle } = positionResult;

  // Highlight Box padding around element
  const pad = 6;
  const highlightBox = {
    top: Math.max(0, targetRect.top - pad),
    left: Math.max(0, targetRect.left - pad),
    width: targetRect.width + pad * 2,
    height: targetRect.height + pad * 2,
  };

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] pointer-events-none isolate">
        {/* Subtle Backdrop: 12% dimming, ZERO blur, rest of page remains 100% visible */}
        <div
          onClick={handleSkip}
          className="fixed inset-0 bg-black/15 pointer-events-auto transition-opacity duration-300"
          aria-hidden="true"
        />

        {/* Floating Spotlight Highlight Frame around target element */}
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out rounded-2xl"
          style={{
            top: `${highlightBox.top}px`,
            left: `${highlightBox.left}px`,
            width: `${highlightBox.width}px`,
            height: `${highlightBox.height}px`,
            border: '2px solid #C5A880',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.16), 0 0 25px rgba(197, 168, 128, 0.45)',
            zIndex: 9995,
          }}
        >
          {/* Animated Gold Corner Beacon */}
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A880] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#C5A880]"></span>
          </span>
        </div>

        {/* Small Interactive Tooltip Card positioned next to element */}
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={tooltipStyle}
          className="pointer-events-auto rounded-2xl bg-[#141210]/98 border border-[#C5A880]/40 p-4 sm:p-5 shadow-[0_20px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(197,168,128,0.18)] backdrop-blur-md flex flex-col gap-2.5 text-[#EAE6DF]"
        >
          {/* Directional Pointer Arrow pointing at element */}
          <div
            style={arrowStyle}
            className={`absolute w-3.5 h-3.5 bg-[#141210] border border-[#C5A880]/60 rotate-45 pointer-events-none ${
              arrowDirection === 'top'
                ? 'border-b-0 border-r-0'
                : arrowDirection === 'bottom'
                ? 'border-t-0 border-l-0'
                : arrowDirection === 'left'
                ? 'border-t-0 border-r-0'
                : 'border-b-0 border-l-0'
            }`}
          />

          {/* Header Row: Step counter & Close */}
          <div className="flex items-center justify-between gap-2 border-b border-[#C5A880]/15 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880] animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#C5A880]">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Skip tour"
              className="text-stone-400 hover:text-white transition-colors p-0.5 rounded-md hover:bg-white/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Title & Description */}
          <div>
            <h4
              className="text-sm sm:text-base font-bold text-white tracking-wide mb-1"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {currentStep.title}
            </h4>
            <p
              className="text-xs text-[#EAE6DF]/80 leading-relaxed font-sans"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {currentStep.description}
            </p>
          </div>

          {/* Pro Tip (if specified) */}
          {currentStep.tip && (
            <div className="text-[10px] text-[#C5A880]/90 bg-[#C5A880]/10 px-2.5 py-1.5 rounded-lg border border-[#C5A880]/20 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#C5A880] flex-shrink-0" />
              <span>{currentStep.tip}</span>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-1">
            <button
              type="button"
              onClick={handleSkip}
              className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 hover:text-[#C5A880] transition-colors py-2 px-1 min-h-[38px] sm:min-h-[44px] flex items-center"
            >
              Skip
            </button>

            <div className="flex items-center gap-1.5">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider px-3 py-1.5 min-h-[38px] sm:min-h-[44px] rounded-lg border border-white/15 hover:border-[#C5A880]/40 text-stone-300 hover:text-white transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 min-h-[38px] sm:min-h-[44px] rounded-lg bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] shadow-md transition-all active:scale-95"
              >
                <span>{isLastStep ? 'Finish' : 'Next'}</span>
                {isLastStep ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
