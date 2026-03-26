# Product Scope

## MVP - Minimum Viable Product (Phase 1)
**Focus: "AI Bespoke + E-commerce + Booking + Operations Platform"**

### Core Modules

- **Authentication & User Profiles (Epic 1):**
  - Registration, login, password recovery (OTP-based).
  - Role-based profiles: Customer (order history, bookings), Owner (revenue, leads, vouchers), Tailor (tasks, income).

- **Product & Inventory Management (Epic 5):**
  - Product Listing with pagination and filters (Season, Color, Material, Size).
  - Product Detail: HD images with zoom, description, size chart, buy/rent options.
  - Product CRUD for Owner: add, edit, delete Áo dài items.
  - Inventory status management: Available, Rented, Maintenance.
  - Rental timeline: return date tracking and automated return reminders.

- **E-commerce & Booking (Epic 6):**
  - Homepage: brand introduction, new collections, promotions, CTAs.
  - Cart: item list with quantity, unit price, buy/rent classification.
  - Checkout: shipping info, payment method selection, order confirmation.
  - Appointment Booking: calendar-based date/time selection, personal info form, confirmation notification.
  - About & Contact: brand story, map, contact info.

- **Order & Payment Management (Epic 7):**
  - Order Management (Owner): order list, status filtering, detail view, status updates.
  - Rental Management (Owner): active rental tracking, return condition tracking, late return notifications.
  - Payment Integration: payment gateway, COD/bank transfer/e-wallet methods, status handling (Paid/Failed/Refunded), PCI compliance.
  - Order History (Customer): view history, download invoices.

- **Operations Dashboard & Workforce (Epic 8):**
  - Owner Dashboard: revenue overview, order statistics (buy vs. rent), revenue charts, pending production alerts (7-day horizon).
  - Appointment Management: real-time booking list, date/status filtering.
  - Task Assignment: delegate work to tailors.
  - Tailor Dashboard: assigned tasks, production list with pricing, monthly income statistics by garment type, task status updates.
  - Customer Profiles: measurement records, purchase/rental history, measurement change history.

- **CRM & Marketing (Epic 9):**
  - Lead Management: lead list, creation, interest classification, lead-to-customer conversion.
  - Voucher System: CRUD, percentage/fixed discount types, usage conditions, analytics, email/SMS distribution.
  - Outreach Campaigns: bulk messaging, Zalo/Facebook integration, message templates, campaign analytics.

- **Unified Order Workflow (Epic 10):**
  - Bespoke Measurement Gate: measurement profile verification before bespoke checkout, redirect to booking if absent.
  - Service-Type Checkout: differentiated payment flows — Buy (100%), Rent (Deposit + CCCD or Security Deposit), Bespoke (Deposit).
  - Owner Order Approval: manual confirmation before production/preparation entry, auto-routing to tailor (bespoke) or warehouse (rent/buy).
  - Service-Type Preparation: Rent (Cleaning → Altering → Ready), Buy (QC → Packaging), Bespoke (existing production sub-steps).
  - Handover & Completion: remaining balance payment, delivery tracking, rental return with condition inspection, security deposit/CCCD return.

### AI Core (Epic 2-4, deferred to post E-commerce launch)

- **Physical-Emotional Compiler:** Adjective → Geometric Delta translation.
- **Master Geometry Specification:** Single Source of Truth (SSOT) for pattern geometry.
- **Deterministic Guardrails:** Physical violation blocking at data layer.
- **Rental Management (CRUD):** Quick inventory status updates and return schedule lookup.

**Product:** Single garment type (Traditional & Modern Áo dài).
**Architecture:** Local-first system for a single heritage tailor shop.
**Tenant Model:** Data isolation between shops for future multi-tenant expansion.

## Growth Features (Phase 2)
**Focus: "Process Digitization & Knowledge Inheritance"**
- **Rule Editor UI:** Interface for artisans to adjust Smart Rules directly.
- **Body Version Control:** Customer body measurement history and change tracking.
- **Variant Expansion:** Support for more complex garment structures.
- **Advanced Analytics:** Revenue forecasting, customer segmentation, seasonal trend analysis.

## Vision (Phase 3)
**Focus: "Digital Tailoring Ecosystem"**
- **Atelier Academy:** AI self-learning and aesthetic refinement from real artisan feedback (Learning Loop).
- **CAD/CNC Integration:** Direct export of cutting instructions for automated cutting machines.
- **3D Simulation:** Virtual "Fitting" experience on personalized 3D avatar.
- **Multi-Tenant Platform:** Expand to serve multiple tailor shops as a SaaS platform.
