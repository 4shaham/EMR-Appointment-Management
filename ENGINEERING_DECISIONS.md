# Engineering Decisions: Enterprise EMR Appointment Management System

This document outlines the core architecture and engineering rationale behind the Enterprise Electronic Medical Record (EMR) Appointment Management Backend. It addresses the technical design considerations, data consistency strategies, concurrency guarantees, performance optimizations, and future scalability paths.

---

## 1. Why Did You Choose Your Project Architecture?

### Clean Architecture with Domain-Driven Separation
The system is structured following **Clean Architecture (Onion Architecture)** principles combined with **Dependency Injection (DI)**. The layers are strictly decoupled:

```
┌─────────────────────────────────────────────────────────────┐
│                    External Frameworks                      │
│            Express HTTP Server, Socket.IO, Morgan            │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Presentation Layer                       │
│    Routes, Middlewares (Auth, RBAC, Validation), Controllers │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   Application Use Cases                     │
│    BookAppointmentUseCase, GetSlotsUseCase, LoginUseCase    │
│    (Pure Business Logic, Audit Logging, Socket Events)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Persistence Layer                        │
│    Repository Interfaces (IRepository) & Implementations    │
│    Mongoose ODM Models (Appointment, Schedule, Patient, etc)│
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Rationale:
1. **Isolation of Business Rules:**
   - Business operations (such as validating that a doctor doesn't work on holidays or breaks, ensuring slots don't overlap, and computing state transitions `scheduled -> arrived -> completed`) live exclusively inside **Use Cases**.
   - Controllers remain lean: they only extract request inputs, invoke the corresponding use case, and map outputs to standard HTTP JSON envelopes.
2. **Inversion of Control (DIP):**
   - Use cases depend on repository *interfaces* (`IAppointmentRepository`, `IDoctorRepository`, `IScheduleRepository`, etc.), not concrete database implementations.
   - This makes business logic 100% testable using in-memory or mock repositories without spinning up a live MongoDB instance.
3. **Explicit Dependency Injection:**
   - All repositories, use cases, and controllers are instantiated and wired explicitly at the router layer. No magical global service locators or hidden singletons are used, ensuring deterministic lifecycle management.

---

## 2. How Did You Design Your MongoDB Schema?

The database schema is organized across 7 core collections designed for relational integrity while taking advantage of MongoDB document capabilities:

### Collections & Roles:
- **`users`**: Central authentication & RBAC identity store (`super_admin`, `receptionist`, `doctor`). Passwords hashed via bcrypt (`12` rounds) with selective exclusion (`select: false`) on queries.
- **`doctors`**: 1-to-1 linkage to `users` collection via `userId`, plus clinical metadata (department, specialization, qualifications, experience, phone).
- **`departments`**: Clinical specialty taxonomy (`Cardiology`, `Orthopedics`, `Neurology`, etc.) used for multi-tier filtering.
- **`schedules`**: Configurable weekly schedule for each doctor. Embeds working days (`monday`–`sunday`), multi-session time ranges (`start`, `end`), break intervals, and customizable slot duration (e.g., 15, 30, or 45 minutes).
- **`patients`**: Unified demographic registry with auto-incrementing/padded human-readable ID (`PAT-000001`), mobile index, and compound search index.
- **`appointments`**: Central transactional ledger linking `patientId`, `doctorId`, `departmentId`, `appointmentDate`, `slotTime`, status lifecycle (`scheduled`, `arrived`, `completed`, `cancelled`), and audit timestamps.
- **`audit_logs`**: Append-only compliance trail recording every security, state change, and booking transaction (`userId`, `userRole`, `action`, `entity`, `entityId`, `details`, `timestamp`).
- **`refresh_tokens`**: Rotating cryptographically hashed refresh token storage with expiration TTL index for automatic cleanup.

### Embedding vs. Referencing Rationale:
- **Referencing for High-Velocity Entities (`appointments`, `patients`, `doctors`):**
  Appointments grow indefinitely into millions of records. Embedding appointments inside doctor or patient documents would quickly breach MongoDB's 16MB document cap and trigger excessive document rewriting. Therefore, appointments reference patients and doctors by `ObjectId`.
- **Embedding for Bounded Day Schedules (`schedules.workingDays`):**
  A doctor's weekly calendar is naturally bounded to at most 7 days with 2–3 sessions and breaks per day. Embedding this hierarchy in a single document ensures atomic schedule reads and updates in a single disk I/O operation.

---

## 3. How Did You Prevent Double Booking?

Double booking prevention is the primary concurrency challenge in appointment systems.

### The Strategy: Two-Tier Defense Guard

```
User A (09:00 Slot) ──┐
                      ├──▶ [Step 1: In-Memory / Application Validation]
User B (09:00 Slot) ──┘    Checks schedule hours, past dates, break periods
                                       │
                                       ▼
                           [Step 2: Database Atomic Guard]
                           MongoDB Compound Partial Unique Index:
                           { doctorId: 1, appointmentDate: 1, slotTime: 1 }
                           where: { status: { $ne: "cancelled" } }
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
              [Winner: Created]                [Loser: Error 11000]
              201 Created                      AppError(409 Conflict)
              Real-time WebSocket Broadcast    "Slot has just been booked..."
```

1. **Layer 1: Pre-validation in `BookAppointmentUseCase`:**
   - Validates that the requested slot is within doctor working hours.
   - Ensures the slot does not collide with configured break times.
   - Disallows bookings for past calendar dates or past time slots on today's date.
   - Queries existing booked appointments (`findBookedSlots`) to fail fast before attempting a write.

2. **Layer 2: Atomic Compound Unique Index with Partial Filter Expression:**
   ```typescript
   appointmentSchema.index(
     { doctorId: 1, appointmentDate: 1, slotTime: 1 },
     {
       unique: true,
       partialFilterExpression: { status: { $ne: "cancelled" } },
     }
   );
   ```
   - **Why this works:** Even if two concurrent HTTP requests pass Layer 1 at the exact same millisecond, MongoDB's storage engine (WiredTiger) serializes the write on the unique index. The first request succeeds; the second request throws a MongoDB duplicate key error (`E11000`).
   - **Why Partial Filter (`status != 'cancelled'`):** If an appointment is cancelled, that slot immediately becomes available again for other patients without index collision!
   - The use case catches error code `11000` and gracefully maps it to HTTP status `409 Conflict` with a user-friendly message: *"This slot has just been booked by another user. Please select a different slot."*

---

## 4. Which Database Indexes Did You Create and Why?

| Collection | Index Fields | Type / Option | Engineering Rationale |
|---|---|---|---|
| `appointments` | `{ doctorId: 1, appointmentDate: 1, slotTime: 1 }` | **Unique** (`partialFilterExpression: { status: { $ne: "cancelled" } }`) | Atomic double-booking concurrency prevention; guarantees single booking per slot while allowing cancelled slots to be reused. |
| `appointments` | `{ appointmentDate: 1, doctorId: 1, status: 1 }` | Compound Secondary | Powers the daily appointment scheduler view and doctor slot lookup in `O(log N)` time. |
| `appointments` | `{ patientId: 1, status: 1 }` | Compound Secondary | Accelerates patient history queries and duplicate booking checks. |
| `appointments` | `{ departmentId: 1, appointmentDate: 1 }` | Compound Secondary | Facilitates department-level schedule dashboards and analytics. |
| `patients` | `{ patientId: 1 }` | Unique | Enforces uniqueness of public hospital identifiers (`PAT-000001`). |
| `patients` | `{ mobile: 1 }` | Sparse / Single | Rapid lookup for patient check-in via mobile number. |
| `patients` | `{ name: "text" }` | Text Index | Enables efficient fuzzy case-insensitive full-text search across patient names. |
| `doctors` | `{ userId: 1 }` | Unique | Enforces strict 1-to-1 relationship between User account and Doctor profile. |
| `doctors` | `{ departmentId: 1 }` | Single Secondary | Fast filtering of doctors by specialty department in the scheduler. |
| `schedules` | `{ doctorId: 1 }` | Unique | One active schedule document per physician for `O(1)` schedule retrieval. |
| `refresh_tokens`| `{ tokenHash: 1 }` | Unique | Fast lookup during token rotation. |
| `refresh_tokens`| `{ expiresAt: 1 }` | **TTL Index** (`expireAfterSeconds: 0`) | MongoDB daemon automatically purges expired refresh tokens from disk without scheduled jobs. |
| `audit_logs` | `{ createdAt: -1 }` | Descending | Optimized for descending audit trail inspection and compliance reporting. |

---

## 5. What Security Measures Did You Implement?

1. **Password Hashing:** Passwords hashed with `bcryptjs` using a cost factor of `12` rounds with salt generation. Passwords are never returned in JSON responses via custom `toJSON` serialization transforms.
2. **Dual-Token JWT Architecture:**
   - **Access Token:** Short-lived (`15m`), signed with `JWT_ACCESS_SECRET`, transported via `Authorization: Bearer <token>` header. Contains minimal payload (`userId`, `role`).
   - **Refresh Token:** Long-lived (`7d`), signed with `JWT_REFRESH_SECRET`, hashed with SHA-256 before storage in MongoDB.
   - **Token Invalidation on Logout:** Calling `POST /api/v1/auth/logout` explicitly removes the refresh token document from the database, preventing replay attacks.
3. **Role-Based Access Control (RBAC):**
   - Declarative authorization middleware `authorize("super_admin", "receptionist", "doctor")`.
   - **Doctor Data Isolation:** Doctors are strictly isolated at both controller and use case levels; a doctor cannot query, view, or update appointments belonging to another physician.
4. **Input Validation & Sanitization:**
   - Every input payload, query parameter, and route param is validated against strict **Zod schemas**. Invalid inputs are rejected with `400 Bad Request` and structured field-level error messages before reaching use cases.
   - Request body limit set to `10kb` to protect against denial-of-service memory exhaustion.
5. **CORS & Environment Defense:**
   - Strictly configured `cors` origin matching `CLIENT_URL`.
   - Mandatory environment validation at application startup (`validateEnv()`). Fails fast if `MONGO_URL` or JWT secrets are undefined.

---

## 6. What Performance Optimizations Did You Apply?

1. **Lean Queries with Selective Projection:**
   - When fetching booked slots for slot generation, `.select("slotTime").lean()` is used to bypass Mongoose document hydration overhead, returning lightweight plain JavaScript objects.
2. **Server-Side Pagination & Bounded Limits:**
   - The appointments list endpoint enforces default `page=1, limit=10`, capped at a maximum of `100` items to eliminate memory bloat.
3. **Parallel Query Execution with `Promise.all`:**
   - In pagination queries, data retrieval and total count calculation (`countDocuments`) are dispatched concurrently in parallel, reducing HTTP latency by roughly 50%.
4. **Targeted Room-Based Socket.IO Broadcasting:**
   - Instead of blindly broadcasting all appointment mutations to every connected user, real-time events are emitted both to targeted rooms (e.g., `room: doctorId:YYYY-MM-DD`) and globally. Clients viewing a specific doctor's schedule on a specific date only receive pertinent events.

---

## 7. Scaling to Millions of Appointments: Architectural Evolution

If this EMR appointment system grows to process **10,000,000+ appointments** across hundreds of healthcare facilities, the following architectural transformations would be executed:

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    Cloudflare CDN                      │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                               ┌───────────────────────────▼────────────────────────────┐
                               │               HAProxy / NGINX Load Balancer            │
                               └─────────────┬───────────────────────────┬──────────────┘
                                             │                           │
                               ┌─────────────▼─────────────┐   ┌─────────▼──────────────┐
                               │   Stateless Express Pod   │   │   Stateless Express Pod│
                               └─────────────┬─────────────┘   └─────────┬──────────────┘
                                             │                           │
                   ┌─────────────────────────┴───────────────────────────┴──────────────────────────┐
                   │                                                                                │
┌──────────────────▼──────────────────────┐                                    ┌────────────────────▼────────────────────┐
│          Redis Enterprise Cluster       │                                    │           Apache Kafka / RabbitMQ       │
│  - Distributed Locks (Redlock) for      │                                    │  - Asynchronous Audit Trail Processing  │
│    sub-millisecond concurrency check    │                                    │  - SMS / Email / WhatsApp Notifications │
│  - Socket.IO Redis Adapter for pub/sub  │                                    │  - Read Model Synchronizer              │
└─────────────────────────────────────────┘                                    └────────────────────┬────────────────────┘
                                                                                                    │
┌───────────────────────────────────────────────────────────────────────────────────────────────────▼────────────────────┐
│                                       MongoDB Sharded Cluster (WiredTiger)                                             │
│                                                                                                                        │
│  • Shard Key: { departmentId: 1, appointmentDate: 1 }                                                                  │
│  • Read-Write Splitting (Primary for writes, Secondary Replicas with causal consistency for listing/reporting)         │
│  • Time-Series / Cold Storage Archival (Move completed/cancelled appointments > 1 year old to S3 / Parquet)            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Distributed Concurrency Lock with Redis (`Redlock`):**
   - At extreme scale, offload initial double-booking serialization from MongoDB to Redis using `SET key token NX PX 5000` (distributed lock). This relieves database lock contention and resolves booking contests in <2ms.
2. **Database Sharding Strategy:**
   - Partition the `appointments` collection using a **compound shard key**: `{ departmentId: 1, appointmentDate: 1 }` or `{ hospitalId: 1, appointmentDate: 1 }`.
   - Prevents hotspotting on current dates while keeping queries for a specific department and date local to a single shard.
3. **CQRS (Command Query Responsibility Segregation) & Read Replicas:**
   - Route write operations (`POST`, `PUT`, `DELETE`) to MongoDB Primary replica.
   - Route high-volume listing, search, and dashboard read traffic to Secondary replicas (`readPreference: "secondaryPreferred"`).
   - Sync searchable patient/appointment indexes into **Elasticsearch / OpenSearch** for complex multi-attribute fuzzy search at scale.
4. **Asynchronous Audit and Notification Processing with Message Broker:**
   - Decouple audit log insertion and external notifications (SMS, WhatsApp, email) into an **Apache Kafka** or **RabbitMQ** event stream. Workers process audit logs asynchronously, reducing HTTP response time to <15ms.
5. **Horizontal Socket.IO Scaling with Redis Streams Adapter:**
   - Use `@socket.io/redis-adapter` so multiple Node.js server pods share real-time appointment update events across connected clients seamlessly.
