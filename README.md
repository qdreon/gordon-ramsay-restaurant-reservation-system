# Gordon Ramsay Restaurant Reservation System (GRRRS)

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

A single-tenant Minimum Viable Product (MVP) web application designed to replace manual reservation logbooks for a high-end, fine-dining restaurant. Built as a capstone project for **CPE 2201 - Software Design and Development**.

## Comprehensive Documentation

**Note to Evaluators and Team Members:** 
The complete architectural blueprint, database schema (3NF), Row Level Security (RLS) matrix, and CPE 2201 compliance mapping are located in the dedicated documentation folder. 

### Academic Documents (CPE 2201)
- **[Software Project Management (SPM) Project Charter](Documents/SPM_ProjectCharter_GRRRS_Qdreon.pdf)**
- **[Software Requirements Specification (SRS)](Documents/SRS_Qdreon.pdf)**
- **[Software Design Document (SWDD)](Documents/SWDD_Qdreon.pdf)**

### Technical Implementation
- **[View Technical Documentation (Schema, RLS, & Compliance Matrix)](Documents/documentation.md)**
- **[View Master Development Roadmap](Documents/MASTER_TODO.md)**

## Tech Stack & Architecture

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Shadcn UI
- **Backend (BaaS):** Supabase (PostgreSQL Database, Auth, Real-Time WebSockets, RPCs)
- **Architecture Patterns:** MVC (Model-View-Controller) & Repository Pattern
- **Database Design:** Strictly normalized to Third Normal Form (3NF) with UUID primary keys and strict UTC (`TIMESTAMPTZ`) standards.

## Key Features

- **Real-Time Floor Plan:** Admin dashboard utilizing the Observer Pattern via WebSockets to visually display table availability (Green, Yellow, Red, Grey) instantly.
- **Concurrency Control:** PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) to prevent double-booking conflicts.
- **Simulated Checkout:** 5-minute timeout window with a tokenized payment interface.
- **Waitlist Automation:** Automatic promotion of waitlisted guests upon cancellations, bounded by operating shift constraints.
- **Data Privacy Compliance:** Automated cascade deletion of Personal Identifiable Information (PII) complying with RA 10173 (Data Privacy Act).


