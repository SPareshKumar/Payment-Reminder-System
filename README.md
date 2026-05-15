# Payment Reminder & Invoicing System

A full-stack, automated invoicing and payment reminder system designed to help small businesses track receivables, automate follow-ups, and analyze cash flow.

## 🚀 Live Demo
*https://payment-reminder-system-gold.vercel.app/dashboard*

---

## 🏗 System Architecture & Tech Stack

This application was engineered with a strong emphasis on efficiency, server-centric rendering, and relational data integrity.

* **Framework:** Next.js 14
* **Language:** TypeScript
* **Database:** PostgreSQL (via Supabase)
* **Styling & UI:** Tailwind CSS, shadcn/ui
* **Data Visualization:** Recharts
* **Background Jobs:** Vercel Cron
* **Transactional Email:** Resend API

---

## ✨ Core Features & Product Thinking

### 1. Analytics & Actionable Dashboard
Instead of a standard data dump, the dashboard acts as a true operational control center, splitting focus 50/50 between immediate actions and historical trends.
* **Action Required Engine:** An isolated table strictly bubbling up `overdue` invoices for immediate attention.
* **Data Visualizations:** Built with Recharts to provide instant business intelligence. Includes a Status Breakdown (Doughnut), Monthly Cash Flow tracking Billed vs. Paid (Bar), and Invoice Volume Trends (Line).

### 2. Intelligent Data Management
* **Relational Integrity:** Implemented a strict normalized PostgreSQL schema (`Customers` 1:N `Invoices` 1:N `Line Items`) to ensure ACID compliance for financial records.
* **Server-Side Search & Highlight:** Implemented URL-state driven search with a custom React component that parses and visually highlights matched text streams via Regex, improving data navigability.
* **Inline Status Mutations:** Built optimistic UI dropdowns directly into the data table status badges, allowing users to rapidly update state (e.g., Pending -> Paid) without unnecessary page routing.

### 3. Contextual "Gmail-Wrapper" Preview & Templating
Designed with deep product empathy, the Invoice Preview page (`/invoices/[id]`) places the rendered invoice directly inside a simulated email client UI.
* **Live Templating Engine:** Users can dynamically toggle between three distinct CSS templates (*Classic, Minimalist, Trendy/Aesthetic*) and inject external logo URLs, with changes reflecting instantly via React state before committing to the database.
* **Email-Safe Compilation:** The Next.js backend compiles the React templates into pure inline-CSS HTML strings specifically optimized for strict email clients (Outlook, Gmail) before passing the payload to Resend.

### 4. Automated Cron Sweeps
* Built a serverless API route (`/api/cron`) triggered automatically by Vercel Cron at midnight daily.
* The script authenticates the request, calculates the current date strictly in **Indian Standard Time (IST)**, and executes a batch SQL update to seamlessly transition elapsed `pending` invoices to `overdue` while generating automated audit logs.

---

## 🧠 Engineering Decisions

1. **Server Actions over API Routes:** Utilized Next.js Server Actions (`lib/actions.ts`) for data mutation. This bypasses the need for manual API route creation, strictly couples database logic to the server, and completely eliminates the risk of exposing Supabase or Resend keys to the client bundle.
2. **Client/Server Component Isolation:** Pushed `use client` directives as far down the component tree as possible (e.g., keeping the dashboard page a Server Component and only making the `DashboardCharts` a Client Component). This dramatically reduces the JavaScript payload sent to the browser.
3. **IST Timezone Enforcement:** JavaScript's native Date objects default to the user's local system time, which causes critical bugs in financial software. Enforced strict `en-IN` locales and explicit `Asia/Kolkata` timezone calculations across both the client UI and server automated tasks to guarantee chronological accuracy.

---

## 🛡️ Security Posture & Intentional Trade-offs

Because this is a time-boxed take-home assignment, the focus was placed heavily on core business logic, UX, and data flow. As a result, specific architectural trade-offs were made regarding the authentication layer:

### What IS Secured:
* **API Key Protection:** The Resend API key and Supabase Service Role keys are completely isolated on Vercel's Node environment.
* **Cron Job Protection:** The automated sweep endpoint expects a strict `Bearer` token matching the environment's `CRON_SECRET`, preventing malicious internet scraping or DDoS database exhaustion.

### Trade-offs (Roadmap to Production):
* **No Session Authentication:** The application currently bypasses user login. Anyone with the URL can view the dashboard.
* **Disabled Row Level Security (RLS):** To facilitate rapid development without session tokens, Supabase RLS is currently set to `Public Access`. 

**Next Steps for V2:** If preparing this application for a live production environment, the immediate first step would be integrating **NextAuth** or **Supabase Auth**, wrapping the Next.js layout in an authentication middleware, and rewriting the PostgreSQL RLS policies to strictly scope all `SELECT` and `UPDATE` commands to the authenticated user's `tenant_id`.

---
*Developed as an engineering assignment.*
