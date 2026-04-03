---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd/index.md'
  - '_bmad-output/planning-artifacts/prd/executive-summary.md'
  - '_bmad-output/planning-artifacts/prd/product-scope.md'
  - '_bmad-output/planning-artifacts/prd/functional-requirements.md'
  - '_bmad-output/planning-artifacts/prd/non-functional-requirements-nfrs.md'
  - '_bmad-output/planning-artifacts/prd/domain-specific-requirements.md'
  - '_bmad-output/planning-artifacts/prd/technical-project-type-requirements.md'
  - '_bmad-output/planning-artifacts/prd/user-journeys.md'
  - '_bmad-output/planning-artifacts/prd/success-criteria.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# tailor_project - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for tailor_project, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Section 1: Style & Semantic Interpretation**
FR1: Users can select predefined Style Pillars.
FR2: Users can adjust style intensity via Sliders.
FR3: System translates style selections into Ease Delta parameter sets.
FR4: System suggests fabrics based on the compatibility matrix between Ease Delta and materials (configured by artisan, matching criteria: stretch coefficient, weight class, and weave type).

**Section 2: Geometric Transformation Engine**
FR5: System applies Ease Delta to the standard pattern (Golden Base Pattern).
FR6: System calculates new (x,y) coordinates based on customer body measurements.
FR7: System generates a Master Geometry Specification containing post-transformation geometric parameters.
FR8: System exports a Blueprint drawing (SVG) for visual display.

**Section 3: Deterministic Guardrails & Validation**
FR9: System automatically checks physical constraints (e.g., armhole circumference vs. bicep).
FR10: System blocks Blueprint export if Golden Rules geometric constraints are violated.
FR11: System issues a technical warning when geometric parameters fall within ±5% of the fabric's physical limit threshold.
FR12: Tailors can manually override AI suggestions.

**Section 4: Tailor Collaboration & Production**
FR13: Users can view the Overlay comparing standard and custom patterns.
FR14: Tailors can use the Sanity Check Dashboard to cross-reference customer measurements with AI suggestions.
FR15: Tailors receive a detailed list of adjustment parameters (+/- cm) for each cut position to execute production.
FR16: System manages and secures access to internal Golden Rules knowledge.

**Section 5: Measurement & Profile Management**
FR17: Tailors can input and store detailed measurement sets (per standard parameter catalog: Bust, Waist, Hip, Shoulder Width, Arm Length, Body Length, Neck Circumference) for each customer.
FR18: System links customer measurements to corresponding custom pattern versions in history.

**Section 6: Rental Catalog & Status (Digital Showroom)**
FR22: System displays rental Ao dai list with images, description, and actual size specifications (Bust/Waist/Hip in cm).
FR23: System displays real-time status: Available, Rented, Maintenance.
FR24: System displays expected return date for each rented garment.
FR25: Owner updates inventory status in maximum 3 touch actions.

**Section 7: Authentication & Security**
FR26: System allows password recovery requests by reusing the Registration OTP infrastructure.
FR27: System uses a dedicated OTP email template for password recovery; other logic resources are shared with the Registration system.
FR28: System allows password update only after successful OTP verification.

**Section 8: Product & Inventory Management**
FR29: System displays all Ao dai products with server-side pagination (20 items per page).
FR30: Users can filter products by Season, Color, Material, and Size — filters are combinable and return results within 500ms.
FR31: System displays product detail with HD images (zoom support), full description, and size chart.
FR32: Users can select "Buy" or "Rent" on product detail — Rent mode shows a calendar for borrow/return date selection.
FR33: Owner can create, read, update, and delete Ao dai product entries.
FR34: Owner can update inventory quantity and status (Available, Rented, Maintenance, Retired).
FR35: Owner can assign seasonal tags to products for catalog filtering.
FR36: System displays the expected return date for each rented item, visible to both Owner and Customer.
FR37: System sends automated reminders to customers 3 days and 1 day before the rental return deadline.

**Section 9: E-commerce: Cart & Checkout**
FR38: System maintains a shopping cart listing products with quantity, unit price, and buy/rent classification.
FR39: Users can update quantities, remove items, and view a running total — cart state persists across sessions for authenticated users.
FR40: Users can enter shipping address and select payment method (COD, bank transfer, e-wallet) during checkout.
FR41: System creates an order record upon checkout confirmation and sends a confirmation notification (email).

**Section 10: Appointment Booking**
FR42: Users can select a date and time slot for an in-store visit via a visual calendar interface.
FR43: Users submit personal information and special requests as part of the booking.
FR44: System confirms the appointment and sends a notification (email/SMS) to both customer and owner.

**Section 11: Order & Payment Management**
FR45: Owner can view all orders with filtering by status (Pending, Confirmed, In Production, Shipped, Delivered, Cancelled).
FR46: Owner and Customer can view full order details including items, quantities, prices, shipping info, and payment status.
FR47: Owner can update order status through the defined workflow (Pending > Confirmed > In Production > Shipped > Delivered).
FR48: Owner can view all active rentals with expected return dates and current condition status.
FR49: Owner can log the condition of returned rental items (Good, Damaged, Lost).
FR50: System sends automated notifications to customers with overdue rental returns.
FR51: System processes payments through an integrated payment gateway supporting COD, bank transfer, and e-wallet.
FR52: System tracks and displays payment status (Pending, Paid, Failed, Refunded) for each order.
FR53: Customers can view their complete order and rental history with status tracking.
FR54: Customers can download invoices for completed orders in PDF format.

**Section 12: Operations Dashboard**
FR55: Owner dashboard displays total revenue summary (daily, weekly, monthly) with trend indicators.
FR56: Owner dashboard displays revenue visualization charts (line/bar) with date range selection.
FR57: Dashboard displays order count breakdown: buy vs. rent, by status.
FR58: Dashboard displays alerts for garments with production deadlines within 7 days.
FR59: Owner can view real-time list of booked appointments with customer info and status.
FR60: Owner can filter appointments by date and status (Upcoming, Completed, Cancelled).
FR61: Owner can assign production tasks to specific tailors with deadline and notes.

**Section 13: Tailor Dashboard**
FR62: Tailors can view their list of assigned tasks with deadlines, order details, and priority.
FR63: Tailors can view completed garments with associated pricing for income calculation.
FR64: Tailors can view monthly income breakdown by garment type, with comparison to previous months.
FR65: Tailors can update task status (Assigned > In Progress > Completed).

**Section 14: Customer Management**
FR66: Owner can view customer profiles including measurements, purchase/rental history.
FR67: Owner can search customers by name, phone number, or email.
FR68: System maintains a versioned history of customer measurement changes.

**Section 15: CRM & Marketing**
FR69: Owner can view a list of potential customers (leads) with contact info and interest level.
FR70: Owner can manually add new leads with contact details and source.
FR71: Owner can classify leads by interest level (Hot, Warm, Cold).
FR72: Owner can convert a qualified lead into a registered customer account.
FR73: Owner can create, edit, and deactivate vouchers.
FR74: System supports percentage-based and fixed-amount discount vouchers.
FR75: Owner can set usage conditions: minimum order value, validity period, single/multi-use.
FR76: System tracks voucher usage count, redemption rate, and associated revenue.
FR77: Owner can send voucher codes to customer segments via email.
FR78: Owner can create and send bulk messages to customer segments.
FR79: System supports outreach via Zalo and Facebook messaging APIs.
FR80: Owner can use and customize pre-built message templates for campaigns.
FR81: System tracks message open rate, click-through rate, and voucher redemption per campaign.

**Section 16: Unified Order Workflow**
FR82: When a customer selects "Bespoke Order", the system checks the customer's measurement profile. If no measurements exist, the system redirects to the Appointment Booking page. If measurements exist, the system displays the measurement summary with last-updated timestamp for customer confirmation or re-measurement request.
FR83: System supports 3 payment modes by service type: Buy (100% upfront payment), Rent (Deposit + CCCD or Security Deposit), Bespoke (Deposit only).
FR84: Rental orders require recording either a government-issued ID (CCCD) or a cash security deposit, plus scheduled pickup and return dates at checkout.
FR85: Owner must approve pending orders before they enter production or preparation. Order transitions from pending to confirmed upon Owner approval.
FR86: Upon Owner confirmation, the system automatically creates a TailorTask with attached measurement data for bespoke orders, or routes to warehouse preparation queue for rent/buy orders.
FR87: Preparation sub-steps are differentiated by service type: Rent (Cleaning > Altering > Ready), Buy (QC > Packaging). Bespoke follows existing production sub-steps (Cutting > Sewing > Fitting > Finishing).
FR88: System marks orders as ready_to_ship or ready_for_pickup when all preparation sub-steps are complete, and notifies the customer.
FR89: For deposit-based orders, customers pay the remaining balance (order total minus deposit) before product handover.
FR90: For rental orders, the system returns the security deposit (cash) or CCCD to the customer after the returned product passes Owner's condition inspection (Good/Damaged/Lost).

**Section 17: Technical Pattern Generation & Production Export**
FR91: Owner creates a pattern session by selecting a customer profile; system auto-fills 10 body measurements from the customer's measurement record.
FR92: System generates 3 technical pattern pieces (front bodice, back bodice, sleeve) from 10 body measurements using deterministic formulas. Geometric deviation from tailor-validated reference patterns < 1mm.
FR93: System generates armhole curves (1/4 ellipse arc) and sleeve cap curves (1/2 ellipse arc) matching tailor-validated contours.
FR94: System exports each pattern piece as SVG at 1:1 scale — printed output matches physical measurements within +/-0.5mm tolerance.
FR95: System exports pattern pieces as G-code for laser cutting with closed paths, cut sequence, and configurable speed/power parameters.
FR96: System displays real-time SVG preview in split-pane layout (measurement input left, pattern preview right) — preview updates within 500ms of measurement change.
FR97: Owner attaches a completed pattern session to an order when assigning a tailor task. Tailor receives order with linked pattern pieces.
FR98: Tailor views attached pattern pieces in order/task detail page with zoom and pan interaction.
FR99: System validates all 10 measurements against min/max ranges before pattern generation. Invalid measurements display specific error messages with acceptable range.

### NonFunctional Requirements

**Performance & Scalability**
NFR1: Average LangGraph inference cycle response time Lavg < 15 seconds, measured by APM monitoring over 100 consecutive requests in staging environment.
NFR2: System supports at least 5 concurrent inference requests, verified by load testing in staging environment.
NFR3: Product listing and detail pages load in < 2 seconds for 95th percentile users, measured by Real User Monitoring (RUM) tools.
NFR4: Non-inference API endpoints respond in < 300ms for 95th percentile under normal load, measured by APM monitoring.
NFR5: System supports 100 concurrent e-commerce users without performance degradation, verified by load testing with simulated user sessions.

**Accuracy & Reliability**
NFR6: Absolute geometric error dG <= 1mm compared to theoretical calculations, verified by coordinate comparison tool on SVG/DXF vector drawings.
NFR7: System available 99.9% during shop operating hours, monitored by cloud infrastructure uptime monitoring.
NFR8: Master Geometry Specification verified via checksum (hash) before storage and transmission, validated by automated integrity tests.
NFR9: Payment processing success rate > 99.5% for valid payment attempts, measured by payment gateway transaction logs.
NFR10: Order and inventory states remain consistent under concurrent access, verified by concurrent transaction testing.

**Security & Privacy**
NFR11: Multi-factor authentication for all shop work sessions, verified by access audit logs.
NFR12: Strict RBAC enforcement protecting Golden Rules knowledge and role-specific data, verified by periodic access control testing.
NFR13: Customer measurements and heritage knowledge encrypted at rest using AES-256 standard, verified by storage encryption audit.
NFR14: Payment processing complies with PCI DSS requirements — no raw card data stored on system, verified by PCI compliance audit.
NFR15: JWT tokens stored in HttpOnly, Secure, SameSite cookies — no token storage in localStorage or sessionStorage, verified by security review.

**Maintainability & Usability**
NFR16: 100% of AI decisions and tailor overrides logged in detail for Atelier Academy training, verified by log completeness audit.
NFR17: Adaptive Canvas UI responds visually within < 200ms when users drag Sliders, measured by browser DevTools performance profiling.
NFR18: 100% Vietnamese professional tailoring terminology in all UI labels and outputs, validated against artisan-approved Terminology Glossary.
NFR19: E-commerce pages (Homepage, Product List, Cart, Checkout) fully functional on mobile devices (viewport >= 375px), verified by responsive design testing across 3 device sizes.
NFR20: E-commerce pages meet WCAG 2.1 Level A compliance, verified by automated accessibility testing tools.

### Additional Requirements

**Starter Template & Project Initialization:**
- Architecture specifies Next.js 16 `create-next-app` (Frontend) and custom FastAPI + LangGraph boilerplate (Backend) as starter templates. Project initialization must be the first implementation story (Epic 1 Story 1).
- Frontend init: `npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
- Backend init: Custom venv setup with FastAPI, Uvicorn, Pydantic, SQLAlchemy, asyncpg, pgvector, langgraph, langchain-core

**Database & Data Architecture:**
- PostgreSQL 17 + pgvector 0.8.x via asyncpg
- Order Status Pipeline: 3 service-type flows (Buy, Rent, Bespoke) with distinct state machines
- Payment Model: Multi-transaction support (full, deposit, remaining, security_deposit) via payment_transactions table
- Extended order fields: service_type, security_type, security_value, pickup_date, return_date, deposit_amount, remaining_amount
- Pattern Engine tables: pattern_sessions (10 measurement columns), pattern_pieces (svg_data, geometry_params JSONB)
- pattern_session_id FK on orders table (nullable)
- Multi-tenancy: tenant_id on all tables for future expansion

**Authentication & Security:**
- Auth.js v5 (NextAuth) with HttpOnly Secure Cookie JWT
- Proxy pattern: Next.js Client > proxy.ts (Next Server) > Cookie Auth > FastAPI Backend
- No direct browser-to-backend API calls
- RBAC: 3 roles (Customer, Owner, Tailor) with route-based mode detection

**Frontend Architecture:**
- Zustand for Local UI State + TanStack Query for Server State Syncing
- Radix UI + Headless UI primitives with Tailwind CSS v4
- Feature-Folded Organization: Route Groups (customer) and (workplace)
- Dual-Mode UI: Boutique Mode (Customer) vs Command Mode (Owner/Tailor)
- Authoritative Server Pattern: Backend is SSOT for all validation, pricing, inventory

**Backend Architecture:**
- Layered Architecture: routers/services/agents/models/geometry/patterns
- Pattern Engine module (patterns/) fully independent from AI geometry module
- Webhook & Background Tasks for payment processing
- API Response wrapper: { data: {}, meta: {} } / { error: { code, message } }

**Infrastructure & Deployment:**
- Containerized deployment (Docker)
- Monitoring: Langfuse (AI tracing) + Prometheus (API monitoring)
- Next.js on Vercel or Docker; FastAPI on separate container with GPU/CPU optimization

**Naming & Coding Conventions:**
- Database: 100% snake_case, plural table names
- API: RESTful, plural endpoints, snake_case JSON body
- Frontend: PascalCase components/files, camelCase variables
- Vietnamese tailoring terminology required in DB columns and UI (vong_nach, ha_eo, etc.)

**Pattern Engine Architecture (Epic 11):**
- Deterministic formula-based (no AI/LLM dependency)
- 3 pattern pieces: front bodice, back bodice, sleeve
- Front bodice = Back bodice - 1cm (DRY architecture with offset param)
- Armhole curve: 1/4 ellipse arc, Sleeve cap: 1/2 ellipse arc
- Hem width: 37cm fixed constant
- Seam allowance: auto-added by engine
- SVG export: server-side rendering, 1:1 scale
- G-code export: closed paths, cut sequence, speed/power params
- Batch export: zip archive
- 6 API endpoints defined for pattern CRUD/generate/export/attach

### UX Design Requirements

UX-DR1: Implement Heritage Palette design tokens in Tailwind CSS v4 config — 10 color tokens (Primary Indigo #1A2B4C, Surface Silk Ivory #F9F7F2, Accent Heritage Gold #D4AF37, Background White #FFFFFF, Text Primary Deep Charcoal #1A1A2E, Text Secondary Warm Gray #6B7280, Success Jade Green #059669, Warning Amber #D97706, Error Ruby Red #DC2626, Info Slate Blue #3B82F6).

UX-DR2: Implement Dual-Tone Typography system — 3 font families: Cormorant Garamond (Display/H1-H3 headings), Inter (Body/Button/Caption), JetBrains Mono (Data/Numbers/Prices/KPIs). Define weights and sizes as design tokens.

UX-DR3: Implement Dual-Mode UI Architecture — Boutique Mode (Customer: Ivory bg, spacious 16-24px gaps, serif headings) vs Command Mode (Owner/Tailor: White bg, dense 8-12px gaps, sans-serif dominant). Route-based mode detection via React Context + layout wrappers.

UX-DR4: Build ProductCard custom component — product grid display with HD image, name, price, Buy/Rent badge. States: Default, Hover (zoom + shadow), Out of Stock (grayed), Loading (skeleton). Responsive: 2-col mobile, 3-col tablet, 4-col desktop.

UX-DR5: Build BookingCalendar custom component — calendar grid for appointment booking with Available (green), Booked (gray), Selected (gold outline), Today (indigo dot) states. Week view (mobile), Month view (desktop). Time slot chips (Morning/Afternoon).

UX-DR6: Build KPICard custom component — dashboard metrics with trend arrow indicators, micro-chart sparkline. Variants: Revenue (VND + chart), Orders (count + status breakdown), Appointments (count + today). Click for deep-dive.

UX-DR7: Build StatusBadge custom component — color-coded status chips for Orders, Tasks, Rentals, Appointments. States: Pending (amber), Confirmed (blue), In Progress (indigo), Completed (green), Cancelled (red), Overdue (red pulse). Quick-cycle tap for Owner/Tailor.

UX-DR8: Build TaskRow custom component — tailor task list item with task name, customer name, garment type, deadline, status badge, income preview. Quick status toggle via badge tap, swipe left for actions.

UX-DR9: Build OrderTimeline custom component — visual pipeline for order status flow. Variants: Compact (dashboard table row), Expanded (order detail page).

UX-DR10: Build LeadCard custom component — CRM lead display with name, phone, source, classification (Hot/Warm/Cold), last contact, notes. Actions: Convert to Customer, Add Note, Schedule Follow-up.

UX-DR11: Build MeasurementForm custom component — 10-field form for body measurements with Customer Combobox search auto-fill. Fields: body length, waist drop, neck/armhole/bust/waist/hip circumference, sleeve length, bicep/wrist circumference. Error messages in Vietnamese tailoring terminology.

UX-DR12: Build PatternPreview custom component — SVG viewer with zoom/pan for technical pattern pieces. Toggle between 3 pieces (front/back bodice, sleeve). Variants: Full (Design Session split-pane) and Embedded (Task Detail compact). Pinch-to-zoom on mobile.

UX-DR13: Build PatternExportBar custom component — export toolbar with [Export SVG] [Export G-code] buttons + laser speed/power parameter popover. Batch export (zip) option. States: Disabled (no pattern), Ready, Exporting.

UX-DR14: Implement Customer navigation — Bottom Tab Bar for mobile (Home, Shop, Book, Profile). Breadcrumb + Back for product detail navigation.

UX-DR15: Implement Owner/Tailor navigation — Collapsible left sidebar with section grouping (Dashboard, Orders, Production, CRM). Role-based menu items.

UX-DR16: Implement responsive strategy — Mobile-first (>=375px) for E-commerce pages; Desktop/Tablet-first for Owner/Tailor dashboards. Breakpoints: Mobile 320-767px, Tablet 768-1023px, Desktop 1024+.

UX-DR17: Implement accessibility — WCAG 2.1 Level A compliance. Minimum 44x44px touch targets. Heritage Gold focus rings (2px solid). Skip links. ARIA labels via Radix UI. Contrast ratios: Indigo on Ivory 11.2:1 (AAA), Charcoal on White 16.7:1 (AAA).

UX-DR18: Implement micro-animations via Framer Motion — page transitions (fade/slide), button press/card hover interactions, loading states, layout animations (list reorder, filter results), scroll animations (Homepage hero).

UX-DR19: Implement error handling UX — natural language error messages (no technical errors), clear next-action CTAs (Retry/Contact Support), preserve form state on error, skeleton loading instead of spinners.

UX-DR20: Implement Adaptive Density spacing system — 8px base grid. Customer Mode: spacious (16-24px gaps). Dashboard Mode: dense (8-12px gaps). Border radius: 8px default, 12px cards, 24px buttons, full avatars. 3-level shadow system (sm/md/lg).

UX-DR21: Implement i18n hook — useTranslate wrapper for all UI strings, supporting Vietnamese and English. JSON locale files with lazy-loading.

### FR Coverage Map

FR1: Epic 12 (Deferred) — Style Pillar selection
FR2: Epic 12 (Deferred) — Style intensity Sliders
FR3: Epic 12 (Deferred) — Style to Ease Delta translation
FR4: Epic 12 (Deferred) — Fabric suggestion matrix
FR5: Epic 13 (Deferred) — Ease Delta application to Golden Base Pattern
FR6: Epic 13 (Deferred) — Coordinate calculation from body measurements
FR7: Epic 13 (Deferred) — Master Geometry Specification generation
FR8: Epic 13 (Deferred) — Blueprint SVG export
FR9: Epic 14 (Deferred) — Physical constraint checking
FR10: Epic 14 (Deferred) — Blueprint export blocking on rule violation
FR11: Epic 14 (Deferred) — Technical warning near physical limits
FR12: Epic 14 (Deferred) — Manual override of AI suggestions
FR13: Epic 14 (Deferred) — Overlay comparison view
FR14: Epic 14 (Deferred) — Sanity Check Dashboard
FR15: Epic 14 (Deferred) — Adjustment parameter list for production
FR16: Epic 14 (Deferred) — Golden Rules knowledge access control
FR17: Epic 6 — Tailor measurement input and storage
FR18: Epic 6 — Measurement-to-pattern version linking
FR22: Epic 2 — Rental catalog display with size specs
FR23: Epic 2 — Real-time inventory status display
FR24: Epic 2 — Return date display for rented garments
FR25: Epic 2 — Owner quick inventory status update
FR26: Epic 1 — Password recovery via OTP
FR27: Epic 1 — Dedicated OTP email template for recovery
FR28: Epic 1 — Password reset after OTP verification
FR29: Epic 2 — Product listing with server-side pagination
FR30: Epic 2 — Product filtering (Season, Color, Material, Size)
FR31: Epic 2 — Product detail with HD images and zoom
FR32: Epic 2 — Buy/Rent selection with rental calendar
FR33: Epic 2 — Product CRUD for Owner
FR34: Epic 2 — Inventory quantity and status management
FR35: Epic 2 — Seasonal tag assignment
FR36: Epic 2 — Rental return date display
FR37: Epic 2 — Automated rental return reminders
FR38: Epic 3 — Shopping cart with buy/rent classification
FR39: Epic 3 — Cart actions (update, remove, running total, persistence)
FR40: Epic 3 — Checkout shipping and payment method selection
FR41: Epic 3 — Order creation and confirmation notification
FR42: Epic 4 — Booking calendar date/time selection
FR43: Epic 4 — Booking form with personal info and requests
FR44: Epic 4 — Booking confirmation notification
FR45: Epic 5 — Owner order list with status filtering
FR46: Epic 5 — Order detail view (Owner and Customer)
FR47: Epic 5 — Order status workflow updates
FR48: Epic 5 — Active rental tracking
FR49: Epic 5 — Returned rental condition logging
FR50: Epic 5 — Overdue rental notifications
FR51: Epic 3 — Payment gateway integration
FR52: Epic 3 — Payment status tracking
FR53: Epic 5 — Customer order/rental history
FR54: Epic 5 — Invoice PDF download
FR55: Epic 7 — Revenue summary with trend indicators
FR56: Epic 7 — Revenue visualization charts
FR57: Epic 7 — Order count breakdown (buy vs rent)
FR58: Epic 7 — Production deadline alerts (7-day horizon)
FR59: Epic 7 — Real-time appointment list
FR60: Epic 7 — Appointment filtering by date/status
FR61: Epic 7 — Task assignment to tailors
FR62: Epic 8 — Tailor assigned tasks view
FR63: Epic 8 — Completed garments with pricing
FR64: Epic 8 — Monthly income breakdown
FR65: Epic 8 — Task status updates
FR66: Epic 6 — Customer profiles with measurements and history
FR67: Epic 6 — Customer search
FR68: Epic 6 — Versioned measurement history
FR69: Epic 9 — Lead list with contact info
FR70: Epic 9 — Manual lead creation
FR71: Epic 9 — Lead classification (Hot/Warm/Cold)
FR72: Epic 9 — Lead-to-customer conversion
FR73: Epic 9 — Voucher CRUD
FR74: Epic 9 — Percentage and fixed-amount vouchers
FR75: Epic 9 — Voucher usage conditions
FR76: Epic 9 — Voucher analytics
FR77: Epic 9 — Voucher distribution via email
FR78: Epic 9 — Bulk messaging to segments
FR79: Epic 9 — Zalo/Facebook channel integration
FR80: Epic 9 — Campaign message templates
FR81: Epic 9 — Campaign analytics
FR82: Epic 10 — Bespoke measurement gate
FR83: Epic 10 — Service-type payment modes
FR84: Epic 10 — Rental security requirement (CCCD/deposit)
FR85: Epic 10 — Owner order approval
FR86: Epic 10 — Auto-routing on approval (TailorTask/warehouse)
FR87: Epic 10 — Service-type preparation sub-steps
FR88: Epic 10 — Readiness status and customer notification
FR89: Epic 10 — Remaining balance payment
FR90: Epic 10 — Security return on rental close
FR91: Epic 11 — Pattern session creation with auto-fill
FR92: Epic 11 — Deterministic pattern generation (3 pieces)
FR93: Epic 11 — Armhole and sleeve cap curve generation
FR94: Epic 11 — SVG export at 1:1 scale
FR95: Epic 11 — G-code export for laser cutting
FR96: Epic 11 — Real-time SVG preview in split-pane
FR97: Epic 11 — Pattern-order attachment for tailor task
FR98: Epic 11 — Tailor pattern view with zoom/pan
FR99: Epic 11 — Measurement validation (min/max ranges)

## Epic List

### Epic 1: Project Foundation & Authentication
Users can register, login, recover password, and access role-appropriate interfaces (Customer/Owner/Tailor). Includes project initialization with Next.js 16 + FastAPI starter templates, Dual-Mode UI scaffolding (Boutique vs Command), Auth.js v5 + Proxy pattern, and PostgreSQL database setup with multi-tenancy support.
**FRs covered:** FR26, FR27, FR28

### Epic 2: Product Catalog & Digital Showroom
Customers can browse, filter, and view Ao dai products with full details including HD images, size charts, and buy/rent options. Owner manages the complete product catalog with CRUD operations, inventory status, seasonal tags, and rental timeline tracking with automated return reminders.
**FRs covered:** FR22, FR23, FR24, FR25, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37

### Epic 3: E-commerce Cart, Checkout & Payment
Customers can add products to cart with buy/rent classification, complete checkout with shipping info and payment method selection, and receive order confirmation. System integrates payment gateway (COD, bank transfer, e-wallet) with status tracking via Webhook & Background Tasks.
**FRs covered:** FR38, FR39, FR40, FR41, FR51, FR52

### Epic 4: Appointment Booking
Customers can book in-store bespoke consultations via a visual calendar interface with time slot selection, submit personal information and special requests, and receive confirmation notifications via email/SMS. Owner also receives booking notifications.
**FRs covered:** FR42, FR43, FR44

### Epic 5: Order & Rental Management
Owner manages full order lifecycle with status filtering, detail views, and status workflow updates. Owner tracks active rentals, logs return conditions, and system sends overdue notifications. Customers view complete order/rental history and download invoices in PDF format.
**FRs covered:** FR45, FR46, FR47, FR48, FR49, FR50, FR53, FR54

### Epic 6: Measurement & Customer Profiles
Tailors input and store detailed measurement sets for each customer. Owner manages customer profiles with measurement history, purchase/rental history, and customer search. System maintains versioned measurement history and links measurements to pattern versions.
**FRs covered:** FR17, FR18, FR66, FR67, FR68

### Epic 7: Operations Dashboard
Owner has a morning command center with revenue overview (daily/weekly/monthly with trend indicators), revenue visualization charts, order statistics (buy vs rent breakdown), production deadline alerts (7-day horizon), real-time appointment list with filtering, and task assignment to tailors.
**FRs covered:** FR55, FR56, FR57, FR58, FR59, FR60, FR61

### Epic 8: Tailor Dashboard
Tailors view assigned tasks with deadlines, order details, and priority. Tailors update task status (Assigned > In Progress > Completed), view completed garments with pricing, and track monthly income breakdown by garment type with month-over-month comparison.
**FRs covered:** FR62, FR63, FR64, FR65

### Epic 9: CRM & Marketing
Owner manages leads (list, create, classify Hot/Warm/Cold, convert to customer). Owner creates and manages vouchers (percentage/fixed, conditions, analytics, distribution). Owner runs outreach campaigns via email/Zalo/Facebook with templates and analytics tracking.
**FRs covered:** FR69, FR70, FR71, FR72, FR73, FR74, FR75, FR76, FR77, FR78, FR79, FR80, FR81

### Epic 10: Unified Order Workflow
Complete differentiated order processing across 3 service types. Bespoke measurement gate checks customer profile before checkout. Service-type checkout (Buy 100%, Rent deposit+CCCD, Bespoke deposit). Owner approval with auto-routing (TailorTask for bespoke, warehouse for rent/buy). Service-type preparation sub-steps. Remaining balance payment and rental security return.
**FRs covered:** FR82, FR83, FR84, FR85, FR86, FR87, FR88, FR89, FR90

### Epic 11: Technical Pattern Generation
Owner generates production-ready technical patterns from 10 customer measurements using deterministic formulas. System produces 3 pattern pieces (front bodice, back bodice, sleeve) with curve generation. Exports as SVG (1:1 scale) and G-code (laser cutting). Real-time split-pane preview. Patterns attached to orders for tailor task assignment. Tailor views patterns with zoom/pan.
**FRs covered:** FR91, FR92, FR93, FR94, FR95, FR96, FR97, FR98, FR99

### Epic 12: AI Style & Semantic Interpretation (Deferred — Post E-commerce Launch)
Users can select Style Pillars, adjust style intensity via Sliders, system translates selections into Ease Delta parameters, and suggests compatible fabrics.
**FRs covered:** FR1, FR2, FR3, FR4

### Epic 13: AI Geometric Transformation Engine (Deferred — Post E-commerce Launch)
System applies Ease Delta to Golden Base Pattern, calculates new coordinates from body measurements, generates Master Geometry Specification, and exports Blueprint SVG.
**FRs covered:** FR5, FR6, FR7, FR8

### Epic 14: AI Guardrails, Tailor Collaboration & Production (Deferred — Post E-commerce Launch)
System enforces physical constraints and Golden Rules, issues warnings near limits, allows tailor manual override. Tailors use Overlay comparison, Sanity Check Dashboard, and receive adjustment parameter lists. System secures Golden Rules knowledge access.
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16
