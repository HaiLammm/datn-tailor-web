---
workflowType: 'prd'
workflow: 'edit'
classification:
  domain: 'Fashion & Manufacturing (Heritage Customization + E-commerce)'
  projectType: 'SaaS B2B / E-commerce Platform'
  complexity: 'High'
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-tailor_project-2026-02-17.md'
  - '_bmad-output/planning-artifacts/research/technical-semantic-to-geometric-translation-architecture-2026-02-17.md'
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-10.md'
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-26.md'
stepsCompleted: ['step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
lastEdited: '2026-03-26'
editHistory:
  - date: '2026-03-26'
    changes: 'Added Epic 10 (Unified Order Workflow). 9 new FRs (FR82-FR90): bespoke measurement gate, service-type checkout (Buy/Rent/Bespoke), owner order approval, auto-routing, preparation sub-steps, remaining payment, rental security return. Updated Product Scope, User Journeys (Linh + Cô Lan).'
  - date: '2026-03-10'
    changes: 'Major pivot: Expanded MVP from AI Bespoke Tool to E-commerce + Booking + AI Bespoke Platform. Added 53 new FRs (FR29-FR81), 9 new NFRs, expanded user journeys, overhauled product scope. Fixed validation report findings: information density, measurement methods, implementation leakage.'
---

# Product Requirements Document - tailor_project

## Table of Contents

- [Product Requirements Document - tailor_project](#table-of-contents)
  - [Executive Summary](./executive-summary.md)
  - [Success Criteria](./success-criteria.md)
    - [User Success](./success-criteria.md#user-success)
    - [Business Success](./success-criteria.md#business-success)
    - [Technical Success](./success-criteria.md#technical-success)
    - [Measurable Outcomes](./success-criteria.md#measurable-outcomes)
  - [Product Scope](./product-scope.md)
    - [MVP - Minimum Viable Product (Phase 1)](./product-scope.md#mvp---minimum-viable-product-phase-1)
    - [Growth Features (Phase 2)](./product-scope.md#growth-features-phase-2)
    - [Vision (Phase 3)](./product-scope.md#vision-phase-3)
  - [User Journeys](./user-journeys.md)
    - [Journey 1: Linh - "From Browsing to Bespoke" (Customer)](./user-journeys.md#journey-1-linh---from-browsing-to-bespoke-customer)
    - [Journey 2: Minh (F2) - "Digital Craftsmanship" (Tailor)](./user-journeys.md#journey-2-minh-f2---digital-craftsmanship-tailor)
    - [Journey 3: Cô Lan - "Digital Command Center" (Owner/Founder)](./user-journeys.md#journey-3-cô-lan---digital-command-center-ownerfounder)
  - [Domain-Specific Requirements](./domain-specific-requirements.md)
    - [Bespoke Constraints & Legacy Digitization](./domain-specific-requirements.md#bespoke-constraints--legacy-digitization)
    - [Internal Governance & "The Vault"](./domain-specific-requirements.md#internal-governance--the-vault)
    - [Physical-Digital Integration](./domain-specific-requirements.md#physical-digital-integration)
    - [E-commerce & Payment Compliance](./domain-specific-requirements.md#e-commerce--payment-compliance)
    - [Innovation & Novel Patterns](./domain-specific-requirements.md#innovation--novel-patterns)
    - [Market Context & Competitive Landscape](./domain-specific-requirements.md#market-context--competitive-landscape)
    - [Risk Mitigation](./domain-specific-requirements.md#risk-mitigation)
  - [Technical & Project-Type Requirements](./technical-project-type-requirements.md)
    - [Technical Architecture](./technical-project-type-requirements.md#technical-architecture)
    - [API Capabilities](./technical-project-type-requirements.md#api-capabilities)
    - [Data Schema & Knowledge Base](./technical-project-type-requirements.md#data-schema--knowledge-base)
  - [Functional Requirements](./functional-requirements.md)
    - [1. Style & Semantic Interpretation](./functional-requirements.md#1-style--semantic-interpretation)
    - [2. Geometric Transformation Engine](./functional-requirements.md#2-geometric-transformation-engine)
    - [3. Deterministic Guardrails & Validation](./functional-requirements.md#3-deterministic-guardrails--validation)
    - [4. Tailor Collaboration & Production](./functional-requirements.md#4-tailor-collaboration--production)
    - [5. Measurement & Profile Management](./functional-requirements.md#5-measurement--profile-management)
    - [6. Rental Catalog & Status (Digital Showroom)](./functional-requirements.md#6-rental-catalog--status-digital-showroom)
    - [7. Authentication & Security](./functional-requirements.md#7-authentication--security)
    - [8. Product & Inventory Management](./functional-requirements.md#8-product--inventory-management)
    - [9. E-commerce: Cart & Checkout](./functional-requirements.md#9-e-commerce-cart--checkout)
    - [10. Appointment Booking](./functional-requirements.md#10-appointment-booking)
    - [11. Order & Payment Management](./functional-requirements.md#11-order--payment-management)
    - [12. Operations Dashboard](./functional-requirements.md#12-operations-dashboard)
    - [13. Tailor Dashboard](./functional-requirements.md#13-tailor-dashboard)
    - [14. Customer Management](./functional-requirements.md#14-customer-management)
    - [15. CRM & Marketing](./functional-requirements.md#15-crm--marketing)
    - [16. Unified Order Workflow](./functional-requirements.md#16-unified-order-workflow)
  - [Non-Functional Requirements (NFRs)](./non-functional-requirements-nfrs.md)
    - [1. Performance & Scalability](./non-functional-requirements-nfrs.md#1-performance--scalability)
    - [2. Accuracy & Reliability](./non-functional-requirements-nfrs.md#2-accuracy--reliability)
    - [3. Security & Privacy](./non-functional-requirements-nfrs.md#3-security--privacy)
    - [4. Maintainability & Usability](./non-functional-requirements-nfrs.md#4-maintainability--usability)
