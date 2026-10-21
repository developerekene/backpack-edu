# Backpack Learning & Payout Platform

Backpack is a modern, full-stack educational and institutional management platform built with React, TypeScript, Vite, Tailwind CSS, and Node.js (Express backend). It provides a robust ecosystem for organizations, instructors, and students to create courses, manage live classes, track student progress, and handle automated secure payment splits and bank payouts.

---

## 🚀 Key Accomplishments & Features Built So Far

1. **Multi-Role & Organisation Management**:
   - Support for Organisation Admins, Instructors, and Students.
   - Org profile management, branding, member directories, and invitation workflows.

2. **Course Creation & Curriculum Management**:
   - Rich course builder with module management, resource attachments, and prerequisites.
   - Flexible tuition pricing models: Full Payment (One-Time) or Installment schedules (Weekly/Monthly/Custom milestones).

3. **Automated Secure Payment & Payout Splits**:
   - Integrated with secure payment gateways (Paystack test/live architecture).
   - **Revenue Split Guarantee**: Organization subaccounts receive **100% of their base tuition fee**. The platform adds a transparent 15% platform fee at student checkout and fully shoulders all payment gateway processing fees without affecting the organization's 100% base payout.
   - Instant Bank Account Name Resolution with resilient test-mode rate limit caching and fallback protection.

4. **Interactive Classroom & Live Learning**:
   - Live video classes powered by WebRTC / LiveKit integration.
   - AI grading assistant and smart learning tools.
   - Student document attachments, enrollment application workflows, and assignment tracking.

5. **Events & Community**:
   - Institutional events calendar, registration, and calendar sync.
   - Community discussions and networking.

6. **Enterprise Security & Data Integrity**:
   - In-app confirmation modals with permanent deletion warnings across all destructive actions.
   - Comprehensive audit logging and consumer protection checkout disclosures.

---

## 🛠️ Developer Guide & Setup Instructions

Follow these steps to set up, run, and develop Backpack locally.

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9+ or compatible package manager)

### 1. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` (if present) or configure your environment variables for local development:
```env
PORT=3000
VITE_PAYSTACK_TEST_PUBLIC_KEY=pk_test_...
```

### 3. Running the Development Server
Backpack runs as a full-stack application with Vite serving the frontend and Express (`server.ts`) handling backend proxy routes, payment initialization, and bank resolution APIs.

Start the development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### 4. Building for Production
To generate a production-ready build:
```bash
npm run build
```

### 5. Linting & Quality Assurance
To run TypeScript type checking and ESLint:
```bash
npm run lint
```

---

## 📁 Project Architecture

- `src/` - React frontend source code
  - `ui/pages/` - Main application pages (Dashboard, CourseDetails, AboutUs, ExploreOrgs, etc.)
  - `ui/components/` - Reusable UI components (PaystackSubaccountOnboarding, CoursePaymentModal, CustomAlert, etc.)
  - `lib/` - Client libraries, payment handlers, and API clients (`paystack.ts`, `centralApiClient.ts`, etc.)
- `server.ts` - Node.js Express backend proxy handling Paystack splits, bank resolution, and secure API routes.
- `package.json` - Dependencies and build scripts.
