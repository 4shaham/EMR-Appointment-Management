# Enterprise EMR Appointment Management System — Frontend

A responsive web application built with **React**, **TypeScript**, **Tailwind CSS**, and **Socket.IO Client** for real-time appointment scheduling and operations.

### Quick Start:
```bash
# 1. Install dependencies
npm install

# 2. Configure .env
cp .env.example .env

# 3. Start development server (Port 3000)
npm run dev
```

### Build & Typecheck:
```bash
npm run build
npm run preview
```

### Role-Based Access:
- **Super Admin** (`admin@emr.com` / `Admin@1234`): Access to Dashboard, Scheduler, Book Appointment, All Appointments, and Super Admin Suite (Physician Onboarding, Schedule Configuration, Staff Management, Audit Trail).
- **Receptionist** (`receptionist@emr.com` / `Recept@1234`): Search Patients, Book Appointments, View Scheduler, Mark Patients as Arrived, Cancel Appointments.
- **Doctor** (`dr.arjun@emr.com` / `Doctor@1234`): View strictly personal appointments, view patient info, update clinical consultation notes, complete consultations.
