# Enterprise EMR Appointment Management — REST API Documentation

Base URL: `http://localhost:5000/api/v1`  
WebSocket URL: `ws://localhost:5000`  
Standard Content-Type: `application/json`

---

## 1. Overview & Authentication

All private API routes require a valid JWT Bearer access token in the `Authorization` request header:
```http
Authorization: Bearer <access_token>
```

### Role-Based Access Control (RBAC) Matrix

| Resource / Action | Super Admin | Receptionist | Doctor |
|---|:---:|:---:|:---:|
| Staff / User Management (`/users`) | Full Access | No Access | No Access |
| Department Management (`/departments`) | Full CRUD | Read-Only | Read-Only |
| Doctor Profiles & Onboarding (`/doctors`) | Full CRUD | Read-Only | Read-Only |
| Doctor Schedule Configuration (`/doctors/:id/schedule`) | Full Update | Read-Only | Update Own |
| Dynamic Slot Engine (`/slots`) | Full Access | Full Access | Full Access |
| Patient Search & Registration (`/patients`) | Full CRUD | Full CRUD | Read-Only |
| Book Appointments (`/appointments`) | Full Create | Full Create | No Access |
| View Appointments List (`/appointments`) | All Appointments | All Appointments | Scoped to Self |
| Patient Arrival Check-In (`/appointments/:id/arrive`) | Yes | Yes | No Access |
| Complete Consultation (`/appointments/:id/complete`) | Yes | Yes | Own Appointments |
| Cancel Appointment (`/appointments/:id`) | Yes | Yes | No Access |
| System Audit Trail (`/audit-logs`) | Full Access | No Access | No Access |
| Analytics Dashboard (`/dashboard`) | Hospital-Wide | Front-Desk Scope | Doctor Queue Scope |

---

## 2. Standard JSON Response Formats

### 2.1. Standard Success Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "total": 54,
    "page": 1,
    "limit": 10,
    "totalPages": 6
  }
}
```

### 2.2. Standard Error Envelope
```json
{
  "success": false,
  "message": "Detailed error message describing cause of failure",
  "statusCode": 400,
  "errors": [
    {
      "field": "slotTime",
      "message": "Slot time must be in HH:MM format"
    }
  ]
}
```

### Standard HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Payload validation error or invalid business state transition.
- `401 Unauthorized`: Missing, expired, or invalid JWT token.
- `403 Forbidden`: Authenticated user lacks RBAC role permissions.
- `404 Not Found`: Requested document does not exist.
- `409 Conflict`: Concurrency conflict (e.g. slot has just been booked by another user).
- `500 Internal Server Error`: Unexpected server exception.

---

## 3. Endpoints Documentation

### 3.1. Authentication (`/auth`)

#### 1. Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@emr.com",
    "password": "Admin@1234"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "user": {
        "id": "6ad1f180da392ea049356b43",
        "name": "System Admin",
        "email": "admin@emr.com",
        "role": "super_admin"
      }
    }
  }
  ```

#### 2. Rotate Tokens
- **Endpoint**: `POST /api/v1/auth/refresh`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Tokens refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

#### 3. Current User Profile
- **Endpoint**: `GET /api/v1/auth/me`
- **Access**: Authenticated (All Roles)
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Profile retrieved successfully",
    "data": {
      "user": {
        "id": "6ad1f182da392ea049356b45",
        "name": "Dr. Arjun Sharma",
        "email": "dr.arjun@emr.com",
        "role": "doctor"
      },
      "doctorProfile": {
        "id": "6ad1f182da392ea049356b47",
        "specialization": "Interventional Cardiologist",
        "departmentId": "6ad1f180da392ea049356b40"
      }
    }
  }
  ```

#### 4. Logout
- **Endpoint**: `POST /api/v1/auth/logout`
- **Access**: Authenticated
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

### 3.2. User Management (`/users`)

#### 1. Create Staff User
- **Endpoint**: `POST /api/v1/users`
- **Access**: `super_admin`
- **Request Body**:
  ```json
  {
    "name": "Jane Receptionist",
    "email": "receptionist@emr.com",
    "password": "Recept@1234",
    "role": "receptionist"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "User created successfully",
    "data": {
      "_id": "6ad1f181da392ea049356b44",
      "name": "Jane Receptionist",
      "email": "receptionist@emr.com",
      "role": "receptionist",
      "isActive": true
    }
  }
  ```

#### 2. List Staff Users
- **Endpoint**: `GET /api/v1/users?role=receptionist`
- **Access**: `super_admin`
- **Success Response (`200 OK`)**

---

### 3.3. Department Management (`/departments`)

#### 1. List All Departments
- **Endpoint**: `GET /api/v1/departments`
- **Access**: Authenticated (All Roles)
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "6ad1f180da392ea049356b40",
        "name": "Cardiology",
        "description": "Heart and cardiovascular diseases",
        "isActive": true
      }
    ]
  }
  ```

#### 2. Create Department
- **Endpoint**: `POST /api/v1/departments`
- **Access**: `super_admin`
- **Request Body**:
  ```json
  {
    "name": "Neurology",
    "description": "Brain and nervous system disorders"
  }
  ```
- **Success Response (`201 Created`)**

---

### 3.4. Doctor Management (`/doctors`)

#### 1. List Doctors
- **Endpoint**: `GET /api/v1/doctors?departmentId=6ad1f180da392ea049356b40`
- **Access**: Authenticated (All Roles)
- **Success Response (`200 OK`)**

#### 2. Onboard Doctor (Atomic User + Profile Creation)
- **Endpoint**: `POST /api/v1/doctors`
- **Access**: `super_admin`
- **Request Body**:
  ```json
  {
    "name": "Dr. Arjun Sharma",
    "email": "dr.arjun@emr.com",
    "password": "Doctor@1234",
    "departmentId": "6ad1f180da392ea049356b40",
    "specialization": "Interventional Cardiologist",
    "qualification": "MBBS, MD, DM",
    "experience": 12,
    "phone": "9876543210"
  }
  ```
- **Success Response (`201 Created`)**

#### 3. Get Doctor Weekly Schedule
- **Endpoint**: `GET /api/v1/doctors/:id/schedule`
- **Access**: Authenticated (All Roles)
- **Success Response (`200 OK`)**

#### 4. Configure Doctor Schedule
- **Endpoint**: `PUT /api/v1/doctors/:id/schedule`
- **Access**: `super_admin`, `doctor` (Doctors can only update own schedule)
- **Request Body**:
  ```json
  {
    "workingDays": [
      {
        "day": "monday",
        "sessions": [
          { "label": "Morning", "start": "09:00", "end": "12:00" },
          { "label": "Evening", "start": "13:00", "end": "17:00" }
        ],
        "breaks": [
          { "start": "12:00", "end": "13:00" }
        ],
        "slotDurationMinutes": 15
      }
    ],
    "isActive": true
  }
  ```
- **Success Response (`200 OK`)**

---

### 3.5. Dynamic Slot Generation Engine (`/slots`)

- **Endpoint**: `GET /api/v1/slots`
- **Access**: Authenticated (All Roles)
- **Query Parameters**:
  - `doctorId` (`String`, required): Doctor ID
  - `date` (`String`, required): Format `YYYY-MM-DD`
- **Slot Status Rules**:
  - `isBooked: true`: Slot is taken by an active appointment.
  - `isPast: true`: Slot time has already passed for today.
  - `isAvailable: true`: `!isBooked && !isPast` (eligible for booking).
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Slots generated successfully",
    "data": {
      "doctor": { "id": "6ad1f182...", "name": "Dr. Arjun Sharma" },
      "date": "2026-10-16",
      "totalSlots": 28,
      "availableSlots": 24,
      "bookedSlots": 4,
      "slots": [
        { "time": "09:00", "isBooked": false, "isAvailable": true, "isPast": false },
        { "time": "09:15", "isBooked": true, "isAvailable": false, "isPast": false }
      ]
    }
  }
  ```

---

### 3.6. Patient Registry (`/patients`)

#### 1. Search Patients
- **Endpoint**: `GET /api/v1/patients?query=9876543210`
- **Access**: `super_admin`, `receptionist`
- **Searches by**: Patient Name, Mobile Number, or `PAT-xxxxxx` ID.
- **Success Response (`200 OK`)**

#### 2. Register Patient
- **Endpoint**: `POST /api/v1/patients`
- **Access**: `super_admin`, `receptionist`
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "mobile": "9876543210",
    "email": "jane@example.com",
    "age": 32,
    "gender": "female",
    "bloodGroup": "O+",
    "address": "42 Park Avenue"
  }
  ```
- **Success Response (`201 Created`)**

---

### 3.7. Appointments Management (`/appointments`)

#### 1. Book Appointment
- **Endpoint**: `POST /api/v1/appointments`
- **Access**: `super_admin`, `receptionist`
- **Request Body (Existing Patient)**:
  ```json
  {
    "patientId": "6ad1f181da392ea049356b50",
    "doctorId": "6ad1f182da392ea049356b47",
    "departmentId": "6ad1f180da392ea049356b40",
    "appointmentDate": "2026-10-16",
    "slotTime": "09:30",
    "purpose": "Routine Cardiology Consultation"
  }
  ```
- **Request Body (Inline New Patient Registration)**:
  ```json
  {
    "newPatient": {
      "name": "Robert Smith",
      "mobile": "9123456780",
      "gender": "male",
      "age": 45
    },
    "doctorId": "6ad1f182da392ea049356b47",
    "departmentId": "6ad1f180da392ea049356b40",
    "appointmentDate": "2026-10-16",
    "slotTime": "10:00",
    "purpose": "First visit checkup"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Appointment booked successfully",
    "data": {
      "_id": "6ad1f183da392ea049356b60",
      "patientId": { "name": "Robert Smith", "patientId": "PAT-000004" },
      "doctorId": { "name": "Dr. Arjun Sharma" },
      "slotTime": "10:00",
      "appointmentDate": "2026-10-16T00:00:00.000Z",
      "status": "scheduled"
    }
  }
  ```
- **Error Response on Double Booking Conflict (`409 Conflict`)**:
  ```json
  {
    "success": false,
    "statusCode": 409,
    "message": "This slot (10:00) has just been booked by another user. Please select an alternate slot."
  }
  ```

#### 2. List Appointments
- **Endpoint**: `GET /api/v1/appointments`
- **Access**: All Roles (Doctors automatically scoped to their personal appointments)
- **Query Parameters**:
  - `page`: Page index (default: `1`)
  - `limit`: Items per page (default: `10`)
  - `status`: `scheduled | arrived | completed | cancelled`
  - `dateFrom`: Start date filter (`YYYY-MM-DD`)
  - `dateTo`: End date filter (`YYYY-MM-DD`)
  - `departmentId`: Department ID
  - `doctorId`: Doctor ID (Super Admin & Receptionist only)
  - `search`: Search query across patient name, mobile, and patientId
- **Success Response (`200 OK`)**

#### 3. Mark Patient Arrived
- **Endpoint**: `POST /api/v1/appointments/:id/arrive`
- **Access**: `super_admin`, `receptionist`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Patient marked as arrived",
    "data": {
      "_id": "6ad1f183da392ea049356b60",
      "status": "arrived",
      "arrivedAt": "2026-10-16T09:25:00.000Z"
    }
  }
  ```

#### 4. Complete Consultation
- **Endpoint**: `POST /api/v1/appointments/:id/complete`
- **Access**: `super_admin`, `receptionist`, `doctor` (Doctors restricted to own appointments)
- **Allowed Status Transitions**:
  - `arrived` $\rightarrow$ `completed`
  - `scheduled` $\rightarrow$ `completed` (auto-records `arrivedAt`)
- **Request Body**:
  ```json
  {
    "notes": "Patient reports mild chest tightness after exercise. Prescribed medication and advised ECG."
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Appointment completed successfully",
    "data": {
      "_id": "6ad1f183da392ea049356b60",
      "status": "completed",
      "notes": "Patient reports mild chest tightness...",
      "completedAt": "2026-10-16T10:15:00.000Z"
    }
  }
  ```

#### 5. Cancel Appointment
- **Endpoint**: `DELETE /api/v1/appointments/:id`
- **Access**: `super_admin`, `receptionist`
- **Request Body**:
  ```json
  {
    "cancelReason": "Patient rescheduled for next week due to personal emergency."
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Appointment cancelled successfully"
  }
  ```

---

### 3.8. Real-Time Socket.IO Synchronization

Clients connect to `ws://localhost:5000` with standard Socket.IO client library:

#### Room Subscriptions
Doctors and receptionists join doctor-day rooms: `${doctorId}:${date}` (e.g., `6ad1f182da392ea049356b47:2026-10-16`).

#### WebSocket Events Emitted by Server:

| Event Name | Trigger | Payload |
|---|---|---|
| `appointment:created` | New appointment booked | `{ appointmentId, slotTime, doctorId, appointmentDate }` |
| `appointment:arrived` | Reception check-in | `{ appointmentId, slotTime, status: "arrived", doctorId }` |
| `appointment:completed` | Doctor concludes session | `{ appointmentId, slotTime, status: "completed", doctorId }` |
| `appointment:cancelled` | Appointment cancelled | `{ appointmentId, slotTime, status: "cancelled", doctorId }` |
| `appointment:updated` | Purpose/notes edited | `{ appointmentId, status, doctorId }` |

All connected clients update their slot availability, waiting queues, and appointment tables instantaneously without requiring manual page reload.
