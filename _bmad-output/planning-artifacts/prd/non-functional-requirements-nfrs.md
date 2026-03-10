# Non-Functional Requirements (NFRs)

## 1. Performance & Scalability
- **NFR1 (AI Latency):** Average LangGraph inference cycle response time Lavg < 15 seconds, measured by APM monitoring over 100 consecutive requests in staging environment.
- **NFR2 (AI Throughput):** System supports at least 5 concurrent inference requests, verified by load testing in staging environment.
- **NFR3 (Page Load):** Product listing and detail pages load in < 2 seconds for 95th percentile users, measured by Real User Monitoring (RUM) tools.
- **NFR4 (API Response):** Non-inference API endpoints respond in < 300ms for 95th percentile under normal load, measured by APM monitoring.
- **NFR5 (Concurrent Users):** System supports 100 concurrent e-commerce users without performance degradation, verified by load testing with simulated user sessions.

## 2. Accuracy & Reliability
- **NFR6 (Geometric Precision):** Absolute geometric error ΔG ≤ 1mm compared to theoretical calculations, verified by coordinate comparison tool on SVG/DXF vector drawings.
- **NFR7 (Availability):** System available 99.9% during shop operating hours, monitored by cloud infrastructure uptime monitoring.
- **NFR8 (Data Integrity):** Master Geometry Specification verified via checksum (hash) before storage and transmission, validated by automated integrity tests.
- **NFR9 (Payment Reliability):** Payment processing success rate > 99.5% for valid payment attempts, measured by payment gateway transaction logs.
- **NFR10 (Order Consistency):** Order and inventory states remain consistent under concurrent access, verified by concurrent transaction testing.

## 3. Security & Privacy
- **NFR11 (Authentication):** Multi-factor authentication for all shop work sessions, verified by access audit logs.
- **NFR12 (Authorization):** Strict RBAC enforcement protecting Golden Rules knowledge and role-specific data, verified by periodic access control testing.
- **NFR13 (Data Encryption):** Customer measurements and heritage knowledge encrypted at rest using AES-256 standard, verified by storage encryption audit.
- **NFR14 (Payment Security):** Payment processing complies with PCI DSS requirements — no raw card data stored on system, verified by PCI compliance audit.
- **NFR15 (Session Security):** JWT tokens stored in HttpOnly, Secure, SameSite cookies — no token storage in localStorage or sessionStorage, verified by security review.

## 4. Maintainability & Usability
- **NFR16 (AI Logging):** 100% of AI decisions and tailor overrides logged in detail for Atelier Academy training, verified by log completeness audit.
- **NFR17 (UI Responsiveness):** Adaptive Canvas UI responds visually within < 200ms when users drag Sliders, measured by browser DevTools performance profiling.
- **NFR18 (Terminology):** 100% Vietnamese professional tailoring terminology in all UI labels and outputs, validated against artisan-approved Terminology Glossary.
- **NFR19 (Mobile Responsiveness):** E-commerce pages (Homepage, Product List, Cart, Checkout) fully functional on mobile devices (viewport ≥ 375px), verified by responsive design testing across 3 device sizes.
- **NFR20 (Accessibility):** E-commerce pages meet WCAG 2.1 Level A compliance, verified by automated accessibility testing tools.
