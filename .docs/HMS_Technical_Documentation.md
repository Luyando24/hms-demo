# HMS Technical Documentation — System Architecture & Implementation
**Tender Reference:** HMS/2026/01
**Version:** 1.0.0 (Final Release)

---

## 1. System Architecture
The Hospital Management System (HMS) is built on a modern, scalable, and secure cloud-native architecture designed for high availability and concurrent load management (500+ users).

### 1.1 Core Stack
- **Frontend**: Next.js 15+ (App Router) for high-performance server-side rendering and client-side interactivity.
- **Backend-as-a-Service**: Supabase (PostgreSQL, Auth, Realtime, Storage).
- **Styling**: Tailwind CSS with custom clinical design tokens for high-fidelity aesthetics.
- **State Management**: React Context + Server Actions for optimized data fetching and state consistency.
- **Real-time Engine**: Supabase Channels (WebSockets) for live updates in ER, Pharmacy, and Ward modules.

---

## 2. Module Implementation Details

### 2.1 Clinical Infrastructure (PACS & EMR)
- **PACS Viewer**: Custom HTML5/React DICOM simulator with support for Windowing/Leveling, Zoom, and Pan.
- **Digital Signatures**: Canvas-based secure signature capture for radiology and clinical report finalization.
- **Longitudinal Record**: Aggregated clinical history service linking encounters, prescriptions, and lab results via patient MRN.

### 2.2 Inpatient Department (IPD)
- **Bed Tracking**: Real-time grid-based occupancy monitor with status-based workflow (Vacant, Occupied, Cleaning).
- **Nurse Sheets**: Bedside observation logger for medication administration and fluid balance tracking (Intake/Output).

### 2.3 Emergency Department (ER)
- **Triage System**: 5-level international standard triage monitor (RED/ORANGE/YELLOW/GREEN/BLUE).
- **STAT Monitor**: High-priority reactive queue for critical resuscitations and ambulance arrivals.

### 2.4 Financial & Billing
- **Insurance Engine**: Integrated claims management with provider-specific distribution and status tracking.
- **EHR Audit Export**: Structured clinical data generator for insurance verification (JSON format).
- **Payroll**: Monthly batch processing engine with automated ZRA/NAPSA contribution calculations.

---

## 3. Database & Security Framework

### 3.1 Database Engine
- **PostgreSQL**: Hosted on Supabase for robust relational data management and ACID compliance.
- **Key Schemas**:
  - `patients`, `profiles`, `clinical_encounters`, `invoices`, `insurance_claims`, `blood_inventory`, `purchase_orders`, `er_visits`.

### 3.2 Security & Compliance
- **Authentication**: JWT-based secure session management via Supabase Auth.
- **Access Control**: Role-Based Access Control (RBAC) implemented via PostgreSQL **Row Level Security (RLS)**.
- **Audit Logging**: Every clinical finalization (Signatures) and financial transaction (Claims) is timestamped and linked to a verified clinician/officer profile.

---

## 4. Technical Specifications

| Feature | Specification |
| :--- | :--- |
| **Interoperability** | Structured EHR Export (Audit-ready) |
| **Real-time** | WebSocket-driven Ward and ER updates |
| **Imaging** | Integrated PACS Viewer (No external plugins) |
| **Audit** | Legally-binding Electronic Signatures |
| **Deployment** | Cloud-native (Vercel + Supabase) |

---

## 5. Deployment & Maintenance
- **CI/CD**: Automated deployment via GitHub and Vercel.
- **Backups**: Automated daily backups via Supabase Managed Services.
- **Scaling**: Horizontally scalable frontend and database compute tiers.

---
**Approved by:** Antigravity (Lead AI Architect)
**Date:** 2026-05-03
