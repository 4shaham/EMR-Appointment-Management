# Enterprise EMR Appointment Management System — Backend

> A production-grade Appointment Management module for an Enterprise Electronic Medical Record (EMR) system built with **Node.js**, **Express**, **TypeScript**, and **MongoDB (Mongoose)**, architected using strict **Clean Architecture** principles and real-time **Socket.IO** synchronization.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Architecture Overview](#architecture-overview)
4. [Database Design & Schema](#database-design--schema)
5. [API Documentation](#api-documentation)
6. [Environment Variables](#environment-variables)
7. [Installation Instructions](#installation-instructions)
8. [Running the Project](#running-the-project)
9. [Concurrency & Double-Booking Strategy](#concurrency--double-booking-strategy)
10. [Real-Time Socket.IO Synchronization](#real-time-socketio-synchronization)
11. [Assumptions Made](#assumptions-made)
12. [Known Limitations](#known-limitations)
13. [Future Improvements](#future-improvements)

---

## Project Overview

The Enterprise EMR Appointment Management System powers mission-critical clinical scheduling workflows. It is engineered with high reliability, data integrity, and strict access boundaries across three user roles:
- **Super Admin:** Staff onboarding, doctor profile & schedule administration, department taxonomy management, system-wide appointment oversight, and audit trail inspection.
- **Receptionist:** Patient registration, patient search (by ID, name, mobile), appointment scheduling, appointment updates, patient arrival check-in, and cancellations.
- **Doctor:** Strictly scoped access to personal appointments, patient demographic/clinical information, and consultation notes completion.

---

## Folder Structure

The repository follows a clean, layered directory structure where responsibilities are separated deterministically:

```
c:/work/ERM/backend/
├── src/
│   ├── config/               # App configuration & bootstrap
│   │   ├── database.ts       # Mongoose connection with error handling & events
│   │   ├── env.ts            # Environment variable validation (fails fast)
│   │   └── socket.ts         # Socket.IO initialization and room management
│   │
│   ├── models/               # Mongoose schema definitions & indexes
│   │   ├── Appointment.model.ts  # Appointments collection + partial unique index
│   │   ├── AuditLog.model.ts     # System audit trail
│   │   ├── Department.model.ts   # Clinical specialty departments
│   │   ├── Doctor.model.ts       # Doctor profiles linked to Users
│   │   ├── Patient.model.ts      # Patient registry with auto PAT-xxxxxx IDs
│   │   ├── RefreshToken.model.ts # Refresh token storage with TTL index
│   │   ├── Schedule.model.ts     # Doctor weekly working days, sessions, breaks
│   │   └── User.model.ts         # User auth accounts with bcrypt hashing
│   │
│   ├── repositories/         # Data Access Layer (Repository Pattern)
│   │   ├── interfaces/       # Pure TypeScript interfaces for DIP
│   │   │   ├── IAppointmentRepository.ts
│   │   │   ├── IAuditLogRepository.ts
│   │   │   ├── IDepartmentRepository.ts
│   │   │   ├── IDoctorRepository.ts
│   │   │   ├── IPatientRepository.ts
│   │   │   ├── IRefreshTokenRepository.ts
│   │   │   ├── IScheduleRepository.ts
│   │   │   └── IUserRepository.ts
│   │   └── implementations/  # Concrete Mongoose implementations
│   │       ├── AppointmentRepository.ts
│   │       ├── AuditLogRepository.ts
│   │       ├── DepartmentRepository.ts
│   │       ├── DoctorRepository.ts
│   │       ├── PatientRepository.ts
│   │       ├── RefreshTokenRepository.ts
│   │       ├── ScheduleRepository.ts
│   │       └── UserRepository.ts
│   │
│   ├── usecases/             # Application Business Logic Layer
│   │   ├── appointments/     # Book, List, Update, Cancel, MarkArrived, Complete
│   │   ├── auth/             # Login, Logout, RefreshTokens
│   │   ├── doctors/          # CreateDoctorUseCase
│   │   ├── schedule/         # UpsertScheduleUseCase
│   │   ├── slots/            # GetSlotsUseCase (dynamic slot generator)
│   │   └── users/            # CreateUserUseCase
│   │
│   ├── controllers/          # HTTP request handlers (Thin controllers)
│   │   ├── appointment.controller.ts
│   │   ├── auditLog.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── department.controller.ts
│   │   ├── doctor.controller.ts
│   │   ├── patient.controller.ts
│   │   ├── slot.controller.ts
│   │   └── user.controller.ts
│   │
│   ├── routes/               # Express route declarations with middleware wiring
│   │   ├── appointment.routes.ts
│   │   ├── auditLog.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── department.routes.ts
│   │   ├── doctor.routes.ts
│   │   ├── patient.routes.ts
│   │   ├── slot.routes.ts
│   │   └── user.routes.ts
│   │
│   ├── middlewares/          # Express middleware pipeline
│   │   ├── authenticate.ts   # JWT access token verification
│   │   ├── authorize.ts      # Role-Based Access Control (RBAC) guard
│   │   ├── errorHandler.ts   # Centralized error mapping & status codes
│   │   └── validate.ts       # Zod schema validation middleware
│   │
│   ├── validators/           # Zod schema definitions
│   │   ├── appointment.validator.ts
│   │   ├── auth.validator.ts
│   │   ├── doctor.validator.ts
│   │   ├── schedule.validator.ts
│   │   └── user.validator.ts
│   │
│   ├── utils/                # Helper utilities
│   │   ├── AppError.ts       # Operational HTTP error class
│   │   ├── jwt.ts            # JWT signing and verification helpers
│   │   ├── response.ts       # Standardized API response formatters
│   │   └── slotGenerator.ts  # Dynamic slot math, breaks & past-time filtering
│   │
│   ├── types/                # Global domain types & Express augmentations
│   │   └── index.ts
│   │
│   ├── app.ts                # Express application factory & middleware setup
│   ├── server.ts             # HTTP + Socket.IO server entry point
│   └── seed.ts               # Database seeder with sample demo data
│
├── .env.example              # Template environment variables
├── .gitignore                # Git ignore rules
├── package.json              # Dependencies and execution scripts
├── tsconfig.json             # TypeScript compiler configuration
└── ENGINEERING_DECISIONS.md  # Deep dive into architectural decisions
```

---

## Architecture Overview

The system strictly follows **Clean Architecture**:
1. **Domain & Models:** Define data schemas, data constraints, and database indexes.
2. **Repository Layer:** Abstract data persistence behind interfaces (`IRepository`), completely isolating database queries from business rules.
3. **Use Case Layer:** Encapsulates all application logic, transactional flows, audit logging, and real-time socket dispatches. Contains zero HTTP-specific concepts.
4. **Presentation Layer:** Controllers parse HTTP requests, invoke use cases, and return uniform JSON envelopes. Routes apply authentication (`authenticate`), authorization (`authorize`), and request validation (`validate`).

### Standard API Response Envelope
All endpoints follow a uniform JSON response format:
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": { ... },
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 10,
    "totalPages": 12
  }
}
```

---

## Database Design & Schema

### Data Model Relationships

```
              ┌──────────────────────────┐
              │          User            │
              │  _id, email, password,   │
              │  role: admin/rec/doc     │
              └────────────┬─────────────┘
                           │ 1:1
                           ▼
┌──────────────┐      ┌──────────────────────────┐      ┌──────────────┐
│  Department  │◄─────┤         Doctor           │      │   Schedule   │
│  _id, name   │ 1:N  │  _id, userId, deptId,    ├─────►│  workingDays │
└──────────────┘      │  specialization, phone   │ 1:1  │  breaks      │
                      └────────────┬─────────────┘      └──────────────┘
                                   │ 1:N
                                   ▼
┌──────────────┐      ┌──────────────────────────┐
│   Patient    │◄─────┤       Appointment        │
│  PAT-000001  │ 1:N  │  patientId, doctorId,    │
│  name, mobile│      │  appointmentDate, slot,  │
└──────────────┘      │  status, notes, bookedBy │
                      └──────────────────────────┘
```

### Essential Database Indexes
- **Atomic Concurrency Index:**
  `appointments.createIndex({ doctorId: 1, appointmentDate: 1, slotTime: 1 }, { unique: true, partialFilterExpression: { status: { $ne: "cancelled" } } })`
- **Scheduler & List Indexes:**
  `appointments.createIndex({ appointmentDate: 1, doctorId: 1, status: 1 })`
- **Patient Lookup & Text Search:**
  `patients.createIndex({ patientId: 1 }, { unique: true })`, `patients.createIndex({ mobile: 1 })`, `patients.createIndex({ name: "text" })`
- **Automatic Token Cleanup:**
  `refresh_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })` (TTL)

---

## API Documentation

All routes are prefixed with `/api/v1`.

### 1. Authentication & Identity
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Authenticates user; returns access token & refresh token. |
| `POST` | `/api/v1/auth/refresh` | Public | Rotates tokens using valid refresh token. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revokes refresh token in DB & logs audit event. |
| `GET` | `/api/v1/auth/me` | Authenticated | Returns logged-in user profile (and doctor profile if role=doctor). |

### 2. User & Staff Management
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/users` | `super_admin` | Creates a new user (receptionist, admin). |
| `GET` | `/api/v1/users` | `super_admin` | Lists staff users filtered by role. |

### 3. Department Management
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/departments` | Authenticated | Retrieves all active departments for scheduler filters. |
| `POST` | `/api/v1/departments` | `super_admin` | Creates a new medical department. |

### 4. Doctor & Schedule Management
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/doctors` | Authenticated | Lists all active doctors (optional filter by `departmentId`). |
| `POST` | `/api/v1/doctors` | `super_admin` | Onboards doctor (creates user account + doctor profile atomically). |
| `GET` | `/api/v1/doctors/:id/schedule` | Authenticated | Retrieves doctor's configured weekly schedule. |
| `PUT` | `/api/v1/doctors/:id/schedule` | `super_admin` | Configures working days, session hours, slot duration & breaks. |

### 5. Dynamic Slot Generation
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/slots` | Authenticated | Generates dynamic slots based on doctor's schedule for `date` (YYYY-MM-DD). Flags `isAvailable`, `isBooked`, and `isPast`. |

### 6. Patient Management
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/patients` | `super_admin`, `receptionist` | Searches patients by `patientId`, `mobile`, or `name`. |
| `POST` | `/api/v1/patients` | `super_admin`, `receptionist` | Registers a new patient with auto-generated `patientId`. |
| `GET` | `/api/v1/patients/:id` | All Roles | Retrieves detailed patient profile. |

### 7. Appointment Lifecycle Management
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/appointments` | `super_admin`, `receptionist` | Books an appointment for an existing patient or automatically creates a new patient. Protected against double-booking. |
| `GET` | `/api/v1/appointments` | All Roles | Lists appointments with server-side pagination, sorting, status/date/dept filters, and search across patient & doctor. Doctors see only their own appointments. |
| `GET` | `/api/v1/appointments/:id` | All Roles | Fetches single appointment. Doctors can only view their own. |
| `PUT` | `/api/v1/appointments/:id` | `super_admin`, `receptionist`, `doctor` | Updates appointment purpose or consultation notes. Doctors can only update notes on their own appointments. |
| `DELETE` | `/api/v1/appointments/:id` | `super_admin`, `receptionist` | Cancels appointment with mandatory reason and frees up the slot immediately. |
| `POST` | `/api/v1/appointments/:id/arrive` | `super_admin`, `receptionist` | Updates status: `scheduled` → `arrived`. |
| `POST` | `/api/v1/appointments/:id/complete` | `super_admin`, `receptionist`, `doctor` | Completes consultation: `arrived` → `completed`. Doctors can only complete their own. |

### 8. Audit Trail
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/audit-logs` | `super_admin` | Inspects system audit logs (logins, bookings, updates, cancellations). |

---

---

## Environment Variables

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Port for Express & Socket.IO server. |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`). |
| `MONGO_URL` | **Yes** | — | MongoDB connection string (never committed or printed). |
| `JWT_ACCESS_SECRET` | **Yes** | — | Secret key for signing access tokens. |
| `JWT_REFRESH_SECRET` | **Yes** | — | Secret key for signing refresh tokens. |
| `JWT_ACCESS_EXPIRES_IN`| No | `15m` | Lifetime of access token. |
| `JWT_REFRESH_EXPIRES_IN`| No | `7d` | Lifetime of refresh token. |
| `CLIENT_URL` | No | `http://localhost:3000` | Allowed client origin for CORS. |

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Yes | `http://localhost:5000/api/v1` | Backend REST API base URL. |
| `VITE_WS_URL` | Yes | `http://localhost:5000` | Backend Socket.IO server URL for live sync. |

---

## Installation Instructions

### Prerequisites
- **Node.js** (v18.0.0 or higher, tested on Node v22.14)
- **npm** (v9.0.0 or higher)
- **MongoDB** (v5.0+ local instance or MongoDB Atlas cluster)

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

## Running the Project

### Step 1: Seed Initial Database (One-time Setup)
Seeds initial Super Admin, Receptionist, 2 Departments, 2 Doctors with full working schedules:
```bash
cd backend
npm run seed
```

**Pre-configured Seed Credentials:**
| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Super Admin** | `admin@emr.com` | `Admin@1234` | Full access (Staff, Doctors, Schedules, All Appointments, Audit Logs) |
| **Receptionist** | `receptionist@emr.com` | `Recept@1234` | Search Patients, Book Appointments, Mark Arrived, Cancel |
| **Doctor (Cardiology)** | `dr.arjun@emr.com` | `Doctor@1234` | Personal appointment ledger, patient notes, complete consultation |
| **Doctor (Orthopedics)** | `dr.priya@emr.com` | `Doctor@1234` | Personal appointment ledger, patient notes, complete consultation |

> **Note for Quick Interview Demo:** The Login page includes one-click demo profile buttons to immediately populate credentials for any role!

---

### Step 2: Start the Backend Server
```bash
cd backend
npm run dev
```
- Backend runs on `http://localhost:5000`
- Health check available at `http://localhost:5000/health`
- Real-time WebSocket listening for live scheduler sync

### Step 3: Start the Frontend Application (In a new terminal)
```bash
cd frontend
npm run dev
```
- Frontend starts at `http://localhost:3000`
- Connects automatically to `http://localhost:5000` via Axios and Socket.IO

---

### Production Build & Type-Checking

To build both services for production:

```bash
# Build Backend
cd backend
npm run build
npm start

# Build Frontend
cd ../frontend
npm run build
npm run preview
```

---

## Concurrency & Double-Booking Strategy

To satisfy Requirement 7, the system applies an atomic database-level constraint:

```typescript
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, slotTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: "cancelled" } },
  }
);
```

- When two concurrent users request the same slot at the exact same millisecond, MongoDB's WiredTiger engine serializes the write on the unique index.
- The first write succeeds with `201 Created`.
- The second write triggers MongoDB error code `11000`, which `BookAppointmentUseCase` catches and translates to HTTP `409 Conflict`:
  > *"This slot has just been booked by another user. Please select a different slot."*
- If an appointment is subsequently cancelled, the partial index expression (`status != 'cancelled'`) ensures the slot is instantly reusable.

---

## Real-Time Socket.IO Synchronization

Satisfying the Engineering Challenge:
- The HTTP server attaches a `Socket.IO` instance.
- Clients viewing a scheduler join room: `${doctorId}:${appointmentDate}`.
- Whenever an appointment is **created**, **updated**, **cancelled**, or **arrived**, the server broadcasts:
  - `appointment:created`
  - `appointment:updated`
  - `appointment:cancelled`
  - `appointment:arrived`
  - `appointment:completed`
- Clients update their UI state instantaneously without manual browser refreshes.

---

## Assumptions Made
1. **Calendar Timezone:** Dates are normalized to UTC midnight (`YYYY-MM-DD` -> `YYYY-MM-DDT00:00:00.000Z`) to prevent timezone drift across different client machines.
2. **Patient Identifier:** Patient IDs follow the sequence format `PAT-000001`, `PAT-000002` based on database document sequence count.
3. **Doctor Isolation:** A doctor may view all doctors to see colleague profiles, but appointment records are strictly filtered by their own `doctorId`.
4. **Cancelled Slots:** Cancelled appointments are kept in the database with `status: "cancelled"`, `cancelledAt`, and `cancelReason` for legal/audit compliance, but are excluded from active slot contention via partial indexing.

---

## Known Limitations
1. **Single-Region Socket Server:** Socket.IO currently runs on an in-memory adapter; for multi-instance horizontal scaling, the `@socket.io/redis-adapter` is required (documented in `ENGINEERING_DECISIONS.md`).
2. **MongoDB Replica Set for Transactions:** The unique compound index handles concurrency atomically in standalone MongoDB; multi-document ACID transactions across patients + appointments can be toggled on when connected to a replica set cluster.

---

## Future Improvements
1. **SMS & Email Notifications:** Integration with Twilio / SendGrid for appointment confirmation and reminder triggers.
2. **Patient Self-Service Portal:** Additional patient role for direct booking via mobile application.
3. **Telehealth Integration:** WebRTC / Zoom integration for virtual consultations attached to slots.
4. **Automated Queue Management:** Display boards showing patient token numbers based on arrival time.
