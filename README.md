# Payment Reminder & Invoicing System

A full-stack, invoicing and payment reminder system designed to help small businesses track receivables, handle follow-ups, and analyze cash flow.

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

### 1. Analytics & Dashboard
Instead of just dumping the data, the dashboard acts as a true control center, focusing on analytics as well as priority actions.
* **Action Required Engine:** An isolated table to remind the user about overdue invoices.
* **Data Visualizations:** Built with Recharts to provide instant business insights. Includes a Status Breakdown (Doughnut), Monthly Cash Flow tracking Billed vs. Paid (Bar), and Invoice Volume Trends (Line).

### 2. Intelligent Data Management
* **Relational Integrity:** Implemented a strict normalized PostgreSQL schema (`Customers` 1:N `Invoices` 1:N `Line Items`) to ensure ACID compliance for financial records.
* **Server-Side Search & Highlight:** Implemented URL-state driven search with a custom React component that parses and visually highlights matched text streams via Regex, so users can better navigate the search results.
* **Inline Status Mutations:** Built UI dropdowns directly into the data table status badges, allowing users to instantly update state (e.g., Pending -> Paid) without unnecessary page routing.

### 3. "Gmail-Wrapper" Preview & Templating
Designed for better understanding of users, the Invoice Preview page (`/invoices/[id]`) places the rendered invoice directly inside a simulated email client UI.
* **Temolates for invoices:** Users can dynamically toggle between three distinct CSS templates (*Classic, Minimalist, Trendy*) and inject external logo URLs, with changes reflecting instantly via React state before committing to the database.
* **Email-Safe Templates:** The Next.js backend compiles the React templates into pure inline-CSS HTML strings specifically for strict email clients (Outlook, Gmail) before passing the payload to Resend.

### 4. Automated Cron Tasks
* Built a serverless API route (`/api/cron`) triggered automatically by Vercel Cron at midnight daily.
* The script authenticates the request, calculates the current date strictly in **Indian Standard Time (IST)**, and executes a batch SQL update to handle the state of all the invoices whose due date has passed.

---

## 🧠 Engineering Decisions

1. **Server Actions over API Routes:** Utilized Next.js Server Actions (`lib/actions.ts`) for data mutation. Avoided using manual API route creation, completely eliminates the risk of exposing Supabase or Resend keys to the client bundle.
2. **Client/Server Component Isolation:** Pushed `use client` directives as far down the component tree as possible (e.g., keeping the dashboard page a Server Component and only making the `DashboardCharts` a Client Component). This greatly reduces the JavaScript payload sent to the browser.
3. **IST Timezone Enforcement:** JavaScript's native Date objects default to the user's local system time, which causes critical bugs in financial software. Enforced strict `Asia/Kolkata` timezone calculations across both the client UI and server automated tasks to guarantee chronological accuracy.

---

## 🛡️ Security Posture & Intentional Trade-offs

Because this is a time-boxed take-home assignment, the focus was placed heavily on core business logic, UX, and data flow.

### Key Handling:
* **API Key Protection:** The Resend API key and Supabase Service Role keys are completely isolated and protected on Vercel's Node environment.
* **Cron Job Protection:** The automated sweep endpoint expects a strict `Bearer` token matching the environment's `CRON_SECRET`, which prevents malicious internet scraping or DDoS database exhaustion.

### Trade-offs (Roadmap to Production):
* **No Session Authentication:** The application currently bypasses user login. Anyone with the URL can view the dashboard.
* **Disabled Row Level Security (RLS):** To facilitate rapid development without session tokens, Supabase RLS is currently set to `Public Access`. 

**Next Steps for V2:** If preparing this application for a live production environment, the immediate first step would be integrating **NextAuth** or **Supabase Auth** for user authentication, and rewriting the PostgreSQL RLS policies to strictly scope all `SELECT` and `UPDATE` commands to the authenticated users.

---
*Developed as an engineering assignment.*
