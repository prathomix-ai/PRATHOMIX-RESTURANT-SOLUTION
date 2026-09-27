# 🍽️ PRATHOMIX — Next-Gen Restaurant Operating System & Multi-Tenant SaaS

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2_App_Router-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0_Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Dark_Luxury_Gold-gold?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%26_Realtime-green?logo=supabase)](https://supabase.com/)
[![AI Engine](https://img.shields.io/badge/AI_Engine-Gemini_2.0_%2B_Groq_Llama_3.3-purple)](https://deepmind.google/technologies/gemini/)

**PRATHOMIX** is a commercial-grade, multi-tenant Restaurant Operating System engineered to power end-to-end luxury dining hospitality, zero-commission customer ordering, high-velocity handheld waiter POS, Chef KDS ticket management, front-desk reservation orchestration, and an executive administration suite.

---

## 🏛️ Architecture & Visual Identity

* **Design Aesthetic:** Obsidian dark luxury (`#0A0A0A` / `#121212`) accented with Champagne Gold (`#C5A880`), subtle golden borders (`border-[#C5A880]/15`), and frosted glassmorphic card containers.
* **Typography:** `Cormorant Garamond` & `Cinzel` serif titles paired with high-legibility `Montserrat` sans-serif for operational numbers, metrics, and menus.
* **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, Zustand.
* **Backend & Realtime:** Next.js Route Handlers, Supabase PostgreSQL, Realtime WebSockets, Edge Middleware guards.
* **AI Intelligence:** Multi-role AI Copilot with Google Gemini 2.0 Flash primary, Groq `llama-3.3-70b-versatile` fallback, and local deterministic offline engine.

---

## 👥 Role Directory & Instant Demo Access

Unified authentication is available at **`/login`** supporting standard email credentials, numeric employee passcodes, and 1-click role switcher badges:

| Role | Badge / Email | Passcode | Landing Destination | Primary Operational Scope |
|---|---|---|---|---|
| **Owner / Executive** | `owner@prathomix.tech` / `ADM-01` | `prathomix2024` | `/admin` | Complete restaurant controls, financial analytics, menu CRUD, inventory, staff, CRM. |
| **Operations Admin** | `admin@prathomix.tech` / `ADM-02` | `prathomix2024` | `/admin` | Day-to-day catalog, coupon promotions, floor table configuration, sales ledger. |
| **Front Desk Reception** | `reception@prathomix.tech` / `REC-01` | `reception2026` | `/reception/dashboard` | 5-status live floor map, 1-click walk-in seating, VIP guest reservation book. |
| **Head Chef** | `chef@prathomix.tech` / `CHF-01` | `kitchen2026` | `/kitchen/dashboard` | 4-column KDS Kanban, elapsed cooking stopwatches, SLA delay alerts, rejection modal. |
| **Lead Waiter / Server** | `waiter@prathomix.tech` / `W-1001` | `waiter2026` | `/waiter/dashboard` | Handheld POS order builder, dish modifiers (*extra spicy, no alliums*), live KOT dispatch. |
| **Delivery Courier** | `delivery@prathomix.tech` / `DEL-01` | `delivery2026` | `/delivery/dashboard` | Direct takeaway & home delivery dispatch tracking. |
| **VIP Customer** | `customer@prathomix.tech` | `customer2026` | `/` | Dine-in QR scan (`/menu?table=X`), zero-commission cart, bill split UPI QR, AI concierge. |

---

## 📦 Key Sub-Systems & Modules

### 1. Zero-Commission Customer Hub (`/`, `/menu`, `/cart`)
* **Dine-In QR Recognition:** Visiting `/menu?table=4` auto-binds the order to Table 4 without prompting.
* **Multi-Channel Switcher:** Dine-In, Takeaway, and Home Delivery with automated tax and delivery calculations.
* **Promotional Engine:** Interactive promo coupon validator (`PRATHOMIX10`, `WELCOME150`, `LUXURY20`).
* **Bill Split & UPI QR:** Real-time guest count split calculation with instantaneous dynamic UPI QR code generator.

### 2. Waiter Handheld POS (`/waiter/dashboard`)
* Visual dining room floor plan with real-time occupancy pills (*Available, Occupied, Reserved, Billing, Cleaning*).
* Category search, fast quantity increment/decrement, and 8 instant culinary modifier toggles.
* 1-click **Send KOT** with double-click locking protection to eliminate duplicate kitchen orders.

### 3. Kitchen Display System (KDS) (`/kitchen/dashboard`)
* 4-column Kanban pipeline: `NEW (Pending)`, `PREPARING`, `READY FOR SERVING`, `COMPLETED`.
* 1-second live ticking elapsed stopwatches with dynamic SLA color thresholds:
  * 🟢 **Normal ($<10$m):** Champagne gold filigree border.
  * 🟡 **Warning ($10-20$m):** Glowing amber alert pulse.
  * 🔴 **Critical ($>20$m):** Crimson delay beacon.
* Formal ticket rejection modal with standardized culinary reasons.

### 4. Front Desk Reception Desk (`/reception/dashboard`)
* 10-table interactive floor plan categorized into Main Dining, Terrace Garden, and VIP Lounge.
* Rapid 1-click walk-in seating engine assigning guest names and party sizes in seconds.
* Reservation management calendar with advance table lockouts and guest special requests.

### 5. Modular Executive Admin OS (`/admin`)
Decoupled into 10 specialized sub-systems:
1. **Overview:** Gross sales, net revenue, active diners, occupancy rate, and channel distribution.
2. **Menu & Dishes:** Real-time availability toggles, dish price edits, and macro nutrition fields.
3. **Tables & QR Generator:** Table capacity configuration and live SVG QR Standee generator with 1-click browser printing.
4. **Inventory & Vault:** Stock tracking, reorder thresholds, inventory valuation, and stock in/out adjustments.
5. **Staff Command:** Personnel roster across 7 roles, employee badge codes, shift assignments, and payroll.
6. **Customer CRM:** Guest lifetime order count, total spent (LTV), and hospitality/dietary preferences.
7. **Coupons:** Promotional code builder (% or flat discount), max caps, and redemption limits.
8. **Reports & Ledger:** 5% GST tax calculation, channel volume metrics, and 1-click CSV download.
9. **Audit Trail:** Immutable log stream recording staff actions and system events.
10. **Settings:** Restaurant identity, operating hours, currency, and online ordering kill-switch.

### 6. Multi-Tenant AI Copilot (`/api/chat`)
* Role-calibrated system prompts adapting dynamically between Customer Concierge, Executive Director, Waiter Co-Pilot, and Kitchen Sous-AI.
* Native function calling (`search_dishes`, `book_table`, `get_daily_sales`, `get_inventory_alerts`, `get_table_status`).
* Triple-tier fallback: Gemini 2.0 Flash $\rightarrow$ Groq Llama 3.3 70B $\rightarrow$ Local Deterministic Engine.

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js:** v18.17+ or v20+
* **Package Manager:** `npm` or `pnpm`

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/prathomix/restaurant-solution.git
cd restaurant-solution

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```bash
cp .env.local.example .env.local
```
Fill in your Supabase and AI provider credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup
1. Open your **Supabase Dashboard** $\rightarrow$ **SQL Editor**.
2. Run the complete migration script located at:
   `supabase/v2_saas_schema.sql`
   *(Includes tables for multi-tenancy, profiles, tables, categories, orders, inventory, CRM, coupons, audit logs, and seed demo records).*

### 5. Running the Application
```bash
# Development server
npm run dev

# TypeScript type validation
npx tsc --noEmit

# Production build validation
npm run build

# Start production server
npm run start
```

---

## 🛡️ Security & Architecture Best Practices

* **Server-Side Role Guard:** Edge route protection in `middleware.ts` intercepts unauthorized role access before pages render.
* **Tenant Isolation:** Every operational record is scoped to `restaurant_id` with foreign key cascades and indexed queries.
* **Double-Click Idempotency:** Critical actions (*Place Order, Send KOT, Seat Guest*) utilize client-side submit locks to prevent duplicate database mutations.
* **Graceful Degradation:** All database and AI endpoints feature resilient local fallbacks, ensuring zero downtime even during provider rate limits or initial onboarding.

---

## 📄 License
Commercial Enterprise SaaS — Proprietary by PRATHOMIX Solutions. All rights reserved.
