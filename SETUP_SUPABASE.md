# 🚀 Setting Up Your Supabase Backend for Qwalify

This guide walks you through setting up Supabase in under 3 minutes so Qwalify connects to your live PostgreSQL database with Row Level Security (RLS).

---

## Step 1: Create a Free Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and log in or create a free account.
2. Click **"New Project"**.
3. Fill in:
   - **Name**: `Qwalify` (or your preferred workspace name)
   - **Database Password**: Choose a strong password and save it
   - **Region**: Select the region closest to your target audience
   - **Pricing Plan**: Free Tier
4. Click **"Create new project"** and wait ~1–2 minutes for initialization.

---

## Step 2: Run Database Migrations

Open your Supabase dashboard, click **"SQL Editor"** in the left sidebar, and run these 3 files in order:

### 1. Schema Migration
- Open [`supabase/migrations/001_schema.sql`](./supabase/migrations/001_schema.sql) in this repository.
- Copy all the SQL content and paste it into the Supabase SQL Editor.
- Click **"Run"** (Ctrl+Enter / Cmd+Enter).
- *This creates all 12 tables (`tenants`, `leads`, `conversations`, `messages`, `bookings`, etc.) with indexes and constraints.*

### 2. Row Level Security & Triggers
- Open [`supabase/migrations/002_rls.sql`](./supabase/migrations/002_rls.sql).
- Copy all SQL content and paste it into a new SQL query in Supabase.
- Click **"Run"**.
- *This activates multi-tenant security policies and sets up auto-provisioning for signups.*

### 3. Demo Seed Data (Recommended)
- Open [`supabase/migrations/003_seed.sql`](./supabase/migrations/003_seed.sql).
- Copy all SQL content and paste it into a new SQL query in Supabase.
- Click **"Run"**.
- *This populates Acme Corp demo tenant, 12 realistic leads, conversation histories, score history, and demo appointments.*

---

## Step 3: Copy Your API Keys

1. In your Supabase dashboard, navigate to **Project Settings** (gear icon at the bottom left) -> **API**.
2. Find the **Project URL** and copy it (e.g. `https://xyzprojectid.supabase.co`).
3. Find the **Project API Keys** -> `anon` / `public` key and copy it (starts with `eyJ...`).

---

## Step 4: Configure Qwalify Frontend

1. Open `frontend/.env` (or copy from `frontend/.env.example`).
2. Paste your credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file. The Vite dev server will automatically reload.

---

## Step 5: Verify Live Connection

1. Open `http://localhost:5173` in your browser.
2. Go to **Dashboard** (`/dashboard`).
3. Look at the top right of the Overview section:
   - You should see a green badge: **"● Live Database"**.
4. Test by adding a new lead on the **Leads** page (`/leads`) or modifying workspace settings in **Settings** (`/settings`) — all changes will persist directly to your Supabase PostgreSQL database!

---

## 🔒 Security Note on Multi-Tenancy

Every query in Qwalify is protected by PostgreSQL Row Level Security. Even if multiple companies sign up on `qwalify.online`, tenant $A$ will never be able to view, query, or modify tenant $B$'s leads or conversation transcripts.
