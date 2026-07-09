# RailPay OBHS

Railway OBHS contractor payroll management — trip-based salary, manpower planning, penalty tracking, and payslip generation.

**Stack:** Next.js 14 (App Router) · Supabase (Auth + PostgreSQL) · Tailwind CSS · React

---

## Setup Guide

### Step 1 — Supabase project banao

1. [app.supabase.com](https://app.supabase.com) pe jaao aur **New Project** banao
2. Project ready hone ke baad: **Settings → API** mein jaao
3. Copy karo:
   - `Project URL` (e.g. `https://xxxx.supabase.co`)
   - `anon public` key

### Step 2 — Database schema chalao

1. Supabase Dashboard mein **SQL Editor** mein jaao
2. `supabase/migrations/001_schema.sql` ka poora content copy karo
3. Paste karo aur **Run** dabao

### Step 3 — Environment variables set karo

```bash
# Project folder mein .env.local file banao
cp .env.local.example .env.local
```

`.env.local` file kholo aur apni values daalo:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4 — Dependencies install karo

```bash
npm install
```

### Step 5 — App chalao

```bash
npm run dev
```

Browser mein jaao: [http://localhost:3000](http://localhost:3000)

---

## GitHub pe push karna

```bash
# Pehli baar:
git init
git add .
git commit -m "Initial commit — RailPay OBHS SaaS"

# GitHub pe nayi repo banao (github.com/new), phir:
git remote add origin https://github.com/YOUR_USERNAME/railpay-obhs.git
git branch -M main
git push -u origin main
```

---

## Deploy karna (Vercel — free)

1. [vercel.com](https://vercel.com) pe login karo
2. **New Project → Import** apni GitHub repo
3. Environment Variables mein wahi do values daalo jo `.env.local` mein hain
4. **Deploy** dabao — ho gaya!

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Login page
│   │   └── register/       # Registration page
│   ├── api/                # Backend API routes
│   │   ├── firm/           # Contractor firm details
│   │   ├── employees/      # Staff management
│   │   ├── trips/          # Trip log
│   │   ├── trains/         # Train master
│   │   ├── designations/   # Staff designations
│   │   ├── rates/          # Janitor/EHK rates
│   │   ├── minwages/       # Minimum wage revisions
│   │   └── penalties/      # Manpower shortfall penalties
│   ├── dashboard/          # Main app (protected)
│   └── layout.jsx
├── components/
│   └── RailPayOBHS.jsx     # Core payroll UI
└── lib/
    ├── supabase-browser.js
    ├── supabase-server.js
    └── api-helper.js

supabase/
└── migrations/
    └── 001_schema.sql      # Run this in Supabase SQL Editor
```

---

## Features

- **Multi-tenant** — har contractor ka alag alag data
- **Auth** — Supabase email/password authentication
- **Staff management** — Excel import supported
- **Trip log** — per employee, per train, per date
- **Manpower planning** — scheduled trains ka calendar view
- **Hours & Penalty** — EHK/janitor shortfall penalty calculator
- **Salary sheet** — monthly, with payslip generation
- **Excel export** — salary sheets download karo
