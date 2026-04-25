# Prathomix Restaurant SaaS 🍽️

> Ultra-intelligent restaurant platform with AI Agent, Voice Ordering,
> Generative UI, Split-Bill Checkout & Hidden Admin Dashboard.

## Tech Stack
- **Next.js 14** (App Router)
- **Tailwind CSS** + **Framer Motion** (Glassmorphism + Neon Cyan)
- **Supabase** (PostgreSQL — free tier)
- **Gemini 1.5 Flash** (Primary AI) + **Groq llama3-70b** (Fallback)
- **Web Speech API** (Voice ordering)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your keys
cp .env.local.example .env.local

# 3. Run schema in Supabase SQL Editor
# Open supabase/schema.sql and run all queries

# 4. Start dev server
npm run dev
```

## File Structure
```
prathomix-restaurant/
├── app/
│   ├── page.tsx                    # Home page
│   ├── menu/page.tsx               # Full menu with filters
│   ├── cart/page.tsx               # Cart + Split Bill
│   ├── booking/page.tsx            # Table reservation
│   ├── admin/page.tsx              # 🔒 Hidden admin panel
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── chat/route.ts           # AI Agent (Gemini → Groq fallback)
│       ├── dishes/route.ts
│       ├── booking/route.ts
│       ├── orders/route.ts
│       ├── whatsapp/route.ts       # Mock WhatsApp via Twilio
│       └── admin/analytics/route.ts
├── components/
│   ├── Navbar.tsx
│   ├── ChatInterface.tsx           # AI chat with voice mic
│   ├── DishCard.tsx                # Generative UI dish cards
│   ├── SplitBill.tsx               # QR code split bill
│   ├── HeroSection.tsx
│   ├── FeaturedMenu.tsx
│   ├── BookingBanner.tsx
│   ├── LocationModal.tsx           # Geolocation compare
│   └── CartProvider.tsx
├── hooks/
│   └── useVoice.ts                 # Web Speech API hook
├── lib/
│   ├── supabase.ts
│   └── store.ts                    # Zustand cart store
└── supabase/
    └── schema.sql                  # Full DB schema + seed data
```

## Hidden Admin Panel
Navigate directly to: `http://localhost:3000/admin`
Default password: `prathomix2024`

> ⚠️ There are ZERO frontend links to /admin. It's a secret route.

## AI Features
- **Gemini → Groq fallback** — 100% uptime guarantee
- **Tool Calling** — AI can search dishes by macros, book tables
- **Generative UI** — Dish cards render inside chat
- **Voice Input** — Mic button with neon glow animation

## Supabase Setup
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Paste and run `supabase/schema.sql`
4. Copy your URL and anon key to `.env.local`

## Getting API Keys (All Free Tiers)
- **Gemini**: [aistudio.google.com](https://aistudio.google.com) → Get API Key
- **Groq**: [console.groq.com](https://console.groq.com) → Create API Key
- **Supabase**: [supabase.com](https://supabase.com) → New Project → Settings → API
