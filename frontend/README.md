# Thankyou For Calling — Next.js 16 Frontend

The frontend for **Thankyou For Calling (TFC)** is built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS**. It provides a role-based user interface with dedicated portals for Admin, Caller (Advisor), Team Leader, and Senior Director roles.

---

## 📁 Frontend File Structure

```text
frontend/
├── public/                         # Static Assets & Media
│   ├── admin_avatar.png            # Avatar graphic for Admin Gateway
│   ├── caller_avatar.png           # Avatar graphic for Caller (Advisor) Gateway
│   ├── teamleader_avatar.png       # Avatar graphic for Team Leader Gateway
│   └── director_avatar.png         # Avatar graphic for Senior Director Gateway
├── src/
│   ├── api/                        # Axios API Client & Route Config
│   │   ├── client.js               # Axios instance with JWT auth interceptors & base URL config
│   │   └── endpoints.js            # API endpoint definitions mapping to FastAPI backend
│   ├── app/                        # Next.js App Router Structure
│   │   ├── admin/
│   │   │   └── page.jsx            # Admin Portal: User provisioning, role roster & call staging
│   │   ├── caller/
│   │   │   └── page.jsx            # Advisor Portal: Personal call history, scores, transcript viewer & disputes
│   │   ├── director/
│   │   │   └── page.jsx            # Director Portal: Enterprise KPIs, global average, team rankings & dispute log
│   │   ├── login/
│   │   │   └── page.jsx            # Login Page with quick role selection and JWT authentication
│   │   ├── teamleader/
│   │   │   └── page.jsx            # Team Leader Portal: Pod operations, call quality donut & dispute resolution inbox
│   │   ├── favicon.ico             # Application favicon
│   │   ├── globals.css             # Tailwind CSS directives, glassmorphic card styles & animations
│   │   ├── layout.jsx              # Root layout wrapping application with AuthProvider & Geist font
│   │   └── page.jsx                # Landing Page with role gateway cards
│   ├── components/                 # Reusable UI Components
│   │   ├── Header.jsx              # Application header bar with user profile info & logout button
│   │   ├── RoleCard.jsx            # Interactive gateway card used on landing page
│   │   └── icons/                  # Custom SVG icon components
│   └── context/                    # State Management Contexts
│       └── AuthContext.jsx         # React Context managing JWT token, user auth state & session storage
├── .env.local                      # Frontend environment variables (API URL setting)
├── eslint.config.mjs               # ESLint code style configuration
├── jsconfig.json                   # JavaScript alias mappings (@/* -> ./src/*)
├── next.config.mjs                 # Next.js configuration settings
├── package.json                    # Frontend dependencies & npm scripts (Recharts, Axios, Tailwind)
├── postcss.config.js               # PostCSS config for Tailwind CSS processing
└── tailwind.config.js              # Tailwind CSS theme customization & custom color tokens
```

---

## 🔑 Key Architectural Components

### 1. **App Router Pages (`src/app/`)**
- **Landing Page (`/`)**: Main role selector presenting gateway cards for Admin, Caller, Team Leader, and Senior Director.
- **Login Page (`/login`)**: Authenticates users against FastAPI backend, stores JWT token, and redirects to designated portal.
- **Admin Portal (`/admin`)**: Provision user accounts and stage raw call audio files (`.m4a`, `.mp3`, `.wav`) for background AI analysis.
- **Caller Portal (`/caller`)**: Review personal call evaluation cards, inspect transcript files, and contest compliance markers.
- **Team Leader Portal (`/teamleader`)**: Operational dashboard displaying pod call distribution (Recharts Donut), expandable evaluation cards, and a active **Disputes Inbox**.
- **Director Portal (`/director`)**: Executive overview with high-level KPI cards, top/bottom advisor highlights, and pod leaderboards.

### 2. **Authentication State (`src/context/AuthContext.jsx`)**
- Provides a centralized `AuthContext` managing user login status, JWT token storage in `localStorage`, and logout cleanup.
- Exposes `useAuth()` hook consumed across all portal pages for route guarding.

### 3. **API Client Layer (`src/api/`)**
- `client.js`: Custom Axios instance that automatically injects the `Authorization: Bearer <token>` header into all outbound REST requests. Handles `401 Unauthorized` responses by redirecting to `/login`.
- `endpoints.js`: Centralized endpoint mapping targeting the FastAPI backend (default port `5112`).

---

## 🚀 Running the Frontend Development Server

```bash
# 1. Install dependencies
npm install

# 2. Start Next.js development server (runs on http://localhost:5111)
npm run dev
```
