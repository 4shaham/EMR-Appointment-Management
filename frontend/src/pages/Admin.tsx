import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { doctorService } from "../services/doctor.service";
import { departmentService } from "../services/department.service";
import { adminService } from "../services/admin.service";
import {
  Doctor,
  Department,
  Schedule,
  DaySchedule,
  TimeRange,
  AuditLog,
  User,
  UserRole,
  DayOfWeek,
} from "../types";
import { LoadingSpinner, Spinner, ButtonLoader } from "../components/LoadingSpinner";
import { Alert } from "../components/Alert";
import { Modal } from "../components/Modal";

import {
  Shield,
  UserPlus,
  Clock,
  Users,
  FileSpreadsheet,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Building2,
  Edit2,
  AlertTriangle,
  Stethoscope,
} from "lucide-react";

export const Admin: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<
    "doctors" | "schedule" | "staff" | "audit"
  >("doctors");

  // Shared metadata
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Field-level errors for Staff creation
  const [staffErrors, setStaffErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  // Field-level errors for Doctor onboarding
  const [docErrors, setDocErrors] = useState<Record<string, string | undefined>>({});

  // Tab 1: Doctor Onboarding State
  const [docName, setDocName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docPassword, setDocPassword] = useState("");
  const [docDeptId, setDocDeptId] = useState("");
  const [docSpecialization, setDocSpecialization] = useState("");
  const [docQualification, setDocQualification] = useState("MBBS, MD");
  const [docExperience, setDocExperience] = useState<number>(5);
  const [docPhone, setDocPhone] = useState("");
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  // Doctor Editing State
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editDocName, setEditDocName] = useState("");
  const [editDocDeptId, setEditDocDeptId] = useState("");
  const [editDocSpecialization, setEditDocSpecialization] = useState("");
  const [editDocQualification, setEditDocQualification] = useState("");
  const [editDocExperience, setEditDocExperience] = useState<number>(0);
  const [editDocPhone, setEditDocPhone] = useState("");
  const [editDocIsActive, setEditDocIsActive] = useState(true);
  const [isUpdatingDoc, setIsUpdatingDoc] = useState(false);
  const [editDocError, setEditDocError] = useState<string | null>(null);


  // Tab 2: Schedule State
  const [selectedDocId, setSelectedDocId] = useState("");
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Tab 3: Staff State
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<UserRole>("receptionist");
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Tab 4: Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Load initial metadata
  useEffect(() => {
    const init = async () => {
      try {
        const [depts, docs] = await Promise.all([
          departmentService.getAll(),
          doctorService.getAll(),
        ]);
        setDepartments(depts);
        setDoctors(docs);
        if (depts.length > 0) setDocDeptId(depts[0]._id);
        if (docs.length > 0) setSelectedDocId(docs[0]._id);
      } catch (err) {
        console.error("Failed to load admin metadata:", err);
      }
    };
    init();
  }, []);

  // Clear stale notifications and errors when tab or route changes
  useEffect(() => {
    setError(null);
    setSuccess(null);
    setStaffErrors({});
    setDocErrors({});
  }, [activeTab, location.pathname]);

  // Fetch Doctor Schedule when doctor selected
  useEffect(() => {
    if (!selectedDocId || activeTab !== "schedule") return;

    const loadSchedule = async () => {
      try {
        setIsLoadingSchedule(true);
        const sched = await doctorService.getSchedule(selectedDocId);
        // Ensure every session and break has a stable id for UI editing
        const withKeys: Schedule = {
          ...sched,
          workingDays: sched.workingDays.map((d) => ({
            ...d,
            sessions: d.sessions.map((s) => ({
              ...s,
              id: s.id || Math.random().toString(36).substring(2, 9),
            })),
            breaks: (d.breaks || []).map((b) => ({
              ...b,
              id: b.id || Math.random().toString(36).substring(2, 9),
            })),
          })),
        };
        setCurrentSchedule(withKeys);
      } catch (err) {
        // If doctor has no schedule yet, initialize default with stable keys
        const createDefaultDays = () =>
          (["monday", "tuesday", "wednesday", "thursday", "friday"] as DayOfWeek[]).map(
            (day) => ({
              day,
              sessions: [
                {
                  id: Math.random().toString(36).substring(2, 9),
                  start: "09:00",
                  end: "13:00",
                  label: "Morning",
                },
                {
                  id: Math.random().toString(36).substring(2, 9),
                  start: "14:00",
                  end: "17:00",
                  label: "Evening",
                },
              ],
              breaks: [
                {
                  id: Math.random().toString(36).substring(2, 9),
                  start: "13:00",
                  end: "14:00",
                },
              ],
              slotDurationMinutes: 15,
            })
          );

        setCurrentSchedule({
          _id: "",
          doctorId: selectedDocId,
          isActive: true,
          workingDays: createDefaultDays(),
        });
      } finally {
        setIsLoadingSchedule(false);
      }
    };
    loadSchedule();
  }, [selectedDocId, activeTab]);

  // Load Staff Users when staff tab selected
  useEffect(() => {
    if (activeTab === "staff") {
      adminService.getUsers().then(setStaffUsers).catch(console.error);
    }
  }, [activeTab]);

  // Load Audit Logs when audit tab selected
  useEffect(() => {
    if (activeTab === "audit") {
      setIsLoadingAudit(true);
      adminService
        .getAuditLogs(auditPage)
        .then((res) => {
          setAuditLogs(res.data);
          if (res.meta) setAuditTotalPages(res.meta.totalPages);
        })
        .catch(console.error)
        .finally(() => setIsLoadingAudit(false));
    }
  }, [activeTab, auditPage]);

  // Handle: Onboard Doctor
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setDocErrors({});

    const selectedDept = docDeptId || (departments.length > 0 ? departments[0]._id : "");
    if (!selectedDept) {
      setError("Please select a valid clinical department for this physician.");
      setDocErrors({ departmentId: "Please select a department" });
      return;
    }

    try {
      setIsCreatingDoc(true);
      const newDoc = await doctorService.create({
        name: docName.trim(),
        email: docEmail.trim(),
        password: docPassword,
        departmentId: selectedDept,
        specialization: docSpecialization.trim(),
        qualification: docQualification.trim() || undefined,
        experience: docExperience ? Number(docExperience) : undefined,
        phone: docPhone.trim() || undefined,
      });

      setSuccess(`Doctor "${newDoc.name}" onboarded successfully! You can now configure their schedule in the Schedule Manager tab.`);
      // Refresh doctors
      const updatedDocs = await doctorService.getAll();
      setDoctors(updatedDocs);
      if (newDoc?._id) {
        setSelectedDocId(newDoc._id);
      }
      // Reset form
      setDocName("");
      setDocEmail("");
      setDocPassword("");
      setDocSpecialization("");
      setDocQualification("MBBS, MD");
      setDocExperience(5);
      setDocPhone("");
    } catch (err: unknown) {
      const errRes = (err as { response?: { data?: { message?: string; errors?: Array<{ field: string; message: string }> } } })?.response?.data;
      if (errRes?.errors && Array.isArray(errRes.errors)) {
        const fieldErrors: Record<string, string> = {};
        errRes.errors.forEach((e) => {
          const key = e.field.replace(/^body\./, "");
          fieldErrors[key] = e.message;
        });
        setDocErrors(fieldErrors);
      }
      setError(
        errRes?.message || "Failed to create doctor account."
      );
    } finally {
      setIsCreatingDoc(false);
    }
  };

  // Handle: Open Edit Doctor Modal
  const openEditDoctorModal = (doc: Doctor) => {
    setEditingDoctor(doc);
    setEditDocName(doc.name);
    const deptId =
      typeof doc.departmentId === "object" && doc.departmentId !== null
        ? doc.departmentId._id
        : String(doc.departmentId);
    setEditDocDeptId(deptId);
    setEditDocSpecialization(doc.specialization);
    setEditDocQualification(doc.qualification || "");
    setEditDocExperience(doc.experience || 0);
    setEditDocPhone(doc.phone || "");
    setEditDocIsActive(doc.isActive);
    setEditDocError(null);
  };

  // Handle: Update Doctor
  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setEditDocError(null);

    if (!editDocDeptId) {
      setEditDocError("Please select a department for this physician.");
      return;
    }

    try {
      setIsUpdatingDoc(true);
      const updated = await doctorService.update(editingDoctor._id, {
        name: editDocName.trim(),
        departmentId: editDocDeptId,
        specialization: editDocSpecialization.trim(),
        qualification: editDocQualification.trim() || undefined,
        experience: Number(editDocExperience),
        phone: editDocPhone.trim() || undefined,
        isActive: editDocIsActive,
      });

      setSuccess(`Doctor "${updated.name}" updated successfully.`);
      setEditingDoctor(null);
      const updatedDocs = await doctorService.getAll();
      setDoctors(updatedDocs);
    } catch (err: unknown) {
      setEditDocError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update doctor profile."
      );
    } finally {
      setIsUpdatingDoc(false);
    }
  };


  // Validate working sessions and breaks
  const validateSchedule = (workingDays: DaySchedule[]): string | null => {
    if (!workingDays || workingDays.length === 0) {
      return "Please select at least one active working day.";
    }

    const seenDays = new Set<string>();
    for (const day of workingDays) {
      if (seenDays.has(day.day)) {
        return `Day ${day.day.toUpperCase()} is duplicated in schedule.`;
      }
      seenDays.add(day.day);

      if (!day.sessions || day.sessions.length === 0) {
        return `Please add at least one working session for ${day.day.toUpperCase()}.`;
      }

      for (const sess of day.sessions) {
        if (!sess.start || !sess.end) {
          return `Please fill in both start and end time for all sessions on ${day.day.toUpperCase()}.`;
        }
        if (sess.start >= sess.end) {
          return `On ${day.day.toUpperCase()}, session start time (${sess.start}) must be before end time (${sess.end}).`;
        }
        const [sh, sm] = sess.start.split(":").map(Number);
        const [eh, em] = sess.end.split(":").map(Number);
        const sessMinutes = eh * 60 + em - (sh * 60 + sm);
        if (sessMinutes < day.slotDurationMinutes) {
          return `On ${day.day.toUpperCase()}, working session (${sess.start}-${sess.end}) duration must be at least ${day.slotDurationMinutes} minutes.`;
        }
      }

      // Check for overlapping sessions
      const sortedSessions = [...day.sessions].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 0; i < sortedSessions.length - 1; i++) {
        if (sortedSessions[i].end > sortedSessions[i + 1].start) {
          return `On ${day.day.toUpperCase()}, working sessions (${sortedSessions[i].start}-${sortedSessions[i].end}) and (${sortedSessions[i + 1].start}-${sortedSessions[i + 1].end}) overlap.`;
        }
      }

      // Check breaks
      if (day.breaks && day.breaks.length > 0) {
        for (const brk of day.breaks) {
          if (!brk.start || !brk.end) {
            return `Please fill in both start and end time for all breaks on ${day.day.toUpperCase()}.`;
          }
          if (brk.start >= brk.end) {
            return `On ${day.day.toUpperCase()}, break start time (${brk.start}) must be before end time (${brk.end}).`;
          }
        }

        // Check for overlapping breaks
        const sortedBreaks = [...day.breaks].sort((a, b) => a.start.localeCompare(b.start));
        for (let i = 0; i < sortedBreaks.length - 1; i++) {
          if (sortedBreaks[i].end > sortedBreaks[i + 1].start) {
            return `On ${day.day.toUpperCase()}, breaks (${sortedBreaks[i].start}-${sortedBreaks[i].end}) and (${sortedBreaks[i + 1].start}-${sortedBreaks[i + 1].end}) overlap.`;
          }
        }

        // Ensure each break falls within the overall daily working hours
        const earliestStart = sortedSessions[0].start;
        const latestEnd = sortedSessions[sortedSessions.length - 1].end;
        for (const brk of day.breaks) {
          if (brk.start < earliestStart || brk.end > latestEnd) {
            return `On ${day.day.toUpperCase()}, break (${brk.start} - ${brk.end}) must fall within working hours (${earliestStart} - ${latestEnd}).`;
          }
        }
      }
    }
    return null;
  };

  // Handle: Save Schedule
  const handleSaveSchedule = async () => {
    if (!selectedDocId || !currentSchedule) return;

    const validationError = validateSchedule(currentSchedule.workingDays);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSavingSchedule(true);
      setError(null);
      // Strip temporary UI IDs before sending to API
      const cleanWorkingDays: DaySchedule[] = currentSchedule.workingDays.map((d) => ({
        day: d.day,
        slotDurationMinutes: d.slotDurationMinutes,
        sessions: d.sessions.map((s) => ({
          start: s.start,
          end: s.end,
          label: s.label,
        })),
        breaks: (d.breaks || []).map((b) => ({
          start: b.start,
          end: b.end,
        })),
      }));

      const updated = await doctorService.upsertSchedule(selectedDocId, cleanWorkingDays);
      setSuccess("Doctor schedule updated successfully!");
      // Re-attach UI IDs and update currentSchedule so state is fresh
      setCurrentSchedule({
        ...updated,
        workingDays: updated.workingDays.map((d) => ({
          ...d,
          sessions: d.sessions.map((s) => ({
            ...s,
            id: s.id || Math.random().toString(36).substring(2, 9),
          })),
          breaks: (d.breaks || []).map((b) => ({
            ...b,
            id: b.id || Math.random().toString(36).substring(2, 9),
          })),
        })),
      });
    } catch (err: unknown) {
      const errRes = (err as { response?: { data?: { message?: string; errors?: Array<{ field: string; message: string }> } } })?.response?.data;
      if (errRes?.errors && Array.isArray(errRes.errors) && errRes.errors.length > 0) {
        const detail = errRes.errors.map((e) => e.message).join(". ");
        setError(`${errRes.message || "Schedule validation failed"}: ${detail}`);
      } else {
        setError(errRes?.message || "Failed to update doctor schedule.");
      }
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Handle: Create Staff (Receptionist)
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setStaffErrors({});

    // Client-side quick checks
    const errors: typeof staffErrors = {};
    if (!staffName.trim() || staffName.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters.";
    }
    if (!staffEmail.trim() || !/^\S+@\S+\.\S+$/.test(staffEmail.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!staffPassword || staffPassword.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setStaffErrors(errors);
      setError("Please fix the errors in the form before submitting.");
      return;
    }

    try {
      setIsCreatingStaff(true);
      const user = await adminService.createUser({
        name: staffName.trim(),
        email: staffEmail.trim(),
        password: staffPassword,
        role: staffRole,
      });

      setSuccess(`Staff user "${user.name}" (${user.role}) created successfully!`);
      setStaffErrors({});
      setStaffName("");
      setStaffEmail("");
      setStaffPassword("");

      // Refresh staff users list
      const updated = await adminService.getUsers();
      setStaffUsers(updated);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            errors?: Array<{ field?: string; message?: string }>;
          };
        };
      };

      const status = axiosErr.response?.status;
      const data = axiosErr.response?.data;
      const fieldErrors: typeof staffErrors = {};

      if (status === 422 && Array.isArray(data?.errors)) {
        data.errors.forEach((issue) => {
          const field = issue.field?.replace(/^body\./, "");
          if (field === "name") fieldErrors.name = issue.message;
          else if (field === "email") fieldErrors.email = issue.message;
          else if (field === "password") fieldErrors.password = issue.message;
        });
      } else if (status === 409) {
        fieldErrors.email = data?.message || "A user with this email already exists.";
      }

      setStaffErrors(fieldErrors);
      setError(
        data?.message ||
          (Object.values(fieldErrors)[0] ?? "Failed to create staff user account.")
      );
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const allDays: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <Shield className="w-6 h-6 mr-2 text-purple-600" />
          Super Admin Management Suite
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Physician onboarding, schedule configuration, staff access, and audit log inspection
        </p>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab("doctors")}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center ${
            activeTab === "doctors"
              ? "border-purple-600 text-purple-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Onboard Doctor
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center ${
            activeTab === "schedule"
              ? "border-purple-600 text-purple-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Clock className="w-4 h-4 mr-2" />
          Schedule Manager
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center ${
            activeTab === "staff"
              ? "border-purple-600 text-purple-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Staff & Receptionists
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center ${
            activeTab === "audit"
              ? "border-purple-600 text-purple-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Audit Trail
        </button>
      </div>

      {/* TAB 1: ONBOARD DOCTOR & DOCTOR DIRECTORY */}
      {activeTab === "doctors" && (
        <div className="space-y-6 max-w-4xl">
          {/* Onboarding Form Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <UserPlus className="w-5 h-5 text-purple-600 mr-2" />
                Register New Physician Profile
              </h2>
              <Link
                to="/departments"
                className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                Manage Departments
              </Link>
            </div>

            {/* Warning if no departments exist */}
            {departments.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-800">
                    No Clinical Departments Available
                  </h4>
                  <p className="text-xs text-amber-700 mt-1">
                    Physicians must be assigned to an active clinical department. Please create at least one department first.
                  </p>
                  <Link
                    to="/departments"
                    className="inline-flex items-center mt-2.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                  >
                    <Building2 className="w-3.5 h-3.5 mr-1.5" />
                    Go to Department Management
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={departments.length === 0}
                    value={docName}
                    onChange={(e) => {
                      setDocName(e.target.value);
                      if (docErrors.name) setDocErrors({ ...docErrors, name: undefined });
                    }}
                    placeholder="e.g. Dr. Rajesh Kumar"
                    className={`w-full p-2.5 border rounded-lg text-sm disabled:bg-slate-100 ${
                      docErrors.name ? "border-rose-400 focus:ring-rose-500" : "border-slate-300"
                    }`}
                  />
                  {docErrors.name && (
                    <p className="mt-1 text-xs text-rose-500">{docErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={departments.length === 0}
                    value={docEmail}
                    onChange={(e) => {
                      setDocEmail(e.target.value);
                      if (docErrors.email) setDocErrors({ ...docErrors, email: undefined });
                    }}
                    placeholder="rajesh@emr.com"
                    className={`w-full p-2.5 border rounded-lg text-sm disabled:bg-slate-100 ${
                      docErrors.email ? "border-rose-400 focus:ring-rose-500" : "border-slate-300"
                    }`}
                  />
                  {docErrors.email && (
                    <p className="mt-1 text-xs text-rose-500">{docErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    disabled={departments.length === 0}
                    value={docPassword}
                    onChange={(e) => {
                      setDocPassword(e.target.value);
                      if (docErrors.password) setDocErrors({ ...docErrors, password: undefined });
                    }}
                    placeholder="•••••••• (min 8 chars)"
                    className={`w-full p-2.5 border rounded-lg text-sm disabled:bg-slate-100 ${
                      docErrors.password ? "border-rose-400 focus:ring-rose-500" : "border-slate-300"
                    }`}
                  />
                  {docErrors.password && (
                    <p className="mt-1 text-xs text-rose-500">{docErrors.password}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={docDeptId}
                    onChange={(e) => {
                      setDocDeptId(e.target.value);
                      if (docErrors.departmentId) setDocErrors({ ...docErrors, departmentId: undefined });
                    }}
                    disabled={departments.length === 0}
                    className={`w-full p-2.5 border rounded-lg text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400 ${
                      docErrors.departmentId ? "border-rose-400 focus:ring-rose-500" : "border-slate-300"
                    }`}
                  >
                    {departments.length === 0 ? (
                      <option value="">No departments available</option>
                    ) : (
                      departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))
                    )}
                  </select>
                  {docErrors.departmentId && (
                    <p className="mt-1 text-xs text-rose-500">{docErrors.departmentId}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={departments.length === 0}
                    value={docSpecialization}
                    onChange={(e) => {
                      setDocSpecialization(e.target.value);
                      if (docErrors.specialization) setDocErrors({ ...docErrors, specialization: undefined });
                    }}
                    placeholder="e.g. Cardiology"
                    className={`w-full p-2.5 border rounded-lg text-sm disabled:bg-slate-100 ${
                      docErrors.specialization ? "border-rose-400 focus:ring-rose-500" : "border-slate-300"
                    }`}
                  />
                  {docErrors.specialization && (
                    <p className="mt-1 text-xs text-rose-500">{docErrors.specialization}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    disabled={departments.length === 0}
                    value={docQualification}
                    onChange={(e) => setDocQualification(e.target.value)}
                    placeholder="MBBS, MD, DM"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={departments.length === 0}
                    value={docExperience}
                    onChange={(e) => setDocExperience(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  disabled={departments.length === 0}
                  value={docPhone}
                  onChange={(e) => {
                    setDocPhone(e.target.value);
                    if (docErrors.phone) setDocErrors({ ...docErrors, phone: undefined });
                  }}
                  placeholder="9876543210"
                  className={`w-full p-2.5 border rounded-lg text-sm disabled:bg-slate-100 ${
                    docErrors.phone ? "border-rose-400 focus:ring-rose-500" : "border-slate-300"
                  }`}
                />
                {docErrors.phone && (
                  <p className="mt-1 text-xs text-rose-500">{docErrors.phone}</p>
                )}
              </div>

              <div className="pt-2 flex items-center space-x-4">
                <button
                  type="submit"
                  disabled={isCreatingDoc || departments.length === 0}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[170px] inline-flex items-center justify-center"
                  aria-busy={isCreatingDoc}
                >
                  <ButtonLoader
                    isLoading={isCreatingDoc}
                    loadingText="Registering Physician..."
                  >
                    {departments.length === 0
                      ? "Create Department First"
                      : "Onboard Physician"}
                  </ButtonLoader>
                </button>
                {departments.length === 0 && (
                  <span className="text-xs text-amber-700 font-medium">
                    ← Department setup required before onboarding
                  </span>
                )}
              </div>

            </form>
          </div>

          {/* Doctor Directory Table */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center">
                  <Stethoscope className="w-5 h-5 text-sky-600 mr-2" />
                  Physician Directory & Department Assignment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  View all registered clinical staff and reassign departments as needed
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {doctors.length} Registered
              </span>
            </div>

            {doctors.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No physicians registered yet. Use the onboarding form above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Physician</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Specialization</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {doctors.map((doc) => {
                      const deptName =
                        typeof doc.departmentId === "object" && doc.departmentId !== null
                          ? doc.departmentId.name
                          : departments.find((d) => d._id === doc.departmentId)?.name || "Unknown";
                      return (
                        <tr key={doc._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                            Dr. {doc.name}
                            {doc.qualification && (
                              <span className="block text-[11px] text-slate-400 font-normal">
                                {doc.qualification}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                              <Building2 className="w-3 h-3 mr-1 text-sky-500" />
                              {deptName}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                            {doc.specialization}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                            {doc.phone || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                doc.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {doc.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => openEditDoctorModal(doc)}
                              className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* EDIT DOCTOR MODAL */}
          <Modal
            isOpen={!!editingDoctor}
            onClose={() => !isUpdatingDoc && setEditingDoctor(null)}
            title={editingDoctor ? `Edit Physician Profile: Dr. ${editingDoctor.name}` : "Edit Physician Profile"}
            maxWidth="lg"
            preventCloseOnBackdrop={isUpdatingDoc}
          >
            {editingDoctor && (
              <div>
                {editDocError && (
                  <div className="mb-4">
                    <Alert
                      type="error"
                      message={editDocError}
                      onClose={() => setEditDocError(null)}
                    />
                  </div>
                )}

                <form onSubmit={handleUpdateDoctor} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isUpdatingDoc}
                        value={editDocName}
                        onChange={(e) => setEditDocName(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Department *
                      </label>
                      <select
                        value={editDocDeptId}
                        disabled={isUpdatingDoc}
                        onChange={(e) => setEditDocDeptId(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100"
                      >
                        {departments.length === 0 ? (
                          <option value="">No departments available</option>
                        ) : (
                          departments.map((d) => (
                            <option key={d._id} value={d._id}>
                              {d.name} {d.isActive ? "" : "(Inactive)"}
                            </option>
                          ))
                        )}
                      </select>
                      {departments.length === 0 && (
                        <Link
                          to="/departments"
                          className="text-[11px] text-amber-600 hover:underline mt-1 block"
                        >
                          + Create a department first
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Specialization *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isUpdatingDoc}
                        value={editDocSpecialization}
                        onChange={(e) => setEditDocSpecialization(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Qualification
                      </label>
                      <input
                        type="text"
                        disabled={isUpdatingDoc}
                        value={editDocQualification}
                        onChange={(e) => setEditDocQualification(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={isUpdatingDoc}
                        value={editDocExperience}
                        onChange={(e) => setEditDocExperience(Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        disabled={isUpdatingDoc}
                        value={editDocPhone}
                        onChange={(e) => setEditDocPhone(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="block text-xs font-semibold text-slate-700">
                        Physician Status
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Active doctors appear in the scheduling calendar and booking form
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={isUpdatingDoc}
                        checked={editDocIsActive}
                        onChange={(e) => setEditDocIsActive(e.target.checked)}
                        className="sr-only peer disabled:cursor-not-allowed"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isUpdatingDoc}
                      onClick={() => setEditingDoctor(null)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingDoc || departments.length === 0}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center justify-center min-w-[170px] cursor-pointer disabled:opacity-50"
                      aria-busy={isUpdatingDoc}
                    >
                      <ButtonLoader isLoading={isUpdatingDoc} loadingText="Saving Changes...">
                        Save Profile Changes
                      </ButtonLoader>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </Modal>
        </div>
      )}



      {/* TAB 2: SCHEDULE MANAGER */}
      {activeTab === "schedule" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Configure Physician Weekly Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set working days, multiple daily sessions, slot durations, and break periods
              </p>
            </div>

            {/* Doctor Picker */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-600 uppercase">Select Doctor:</label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="py-1.5 px-3 border border-slate-300 rounded-lg text-sm bg-white font-medium"
              >
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingSchedule ? (
            <LoadingSpinner message="Loading doctor schedule..." />
          ) : !currentSchedule ? (
            <p className="text-sm text-slate-500">No schedule found.</p>
          ) : (
            <div className="space-y-4">
              {allDays.map((day) => {
                const dayIndex = currentSchedule.workingDays.findIndex((d) => d.day === day);
                const isDayActive = dayIndex !== -1;
                const daySched = isDayActive
                  ? currentSchedule.workingDays[dayIndex]
                  : {
                      day,
                      sessions: [{ start: "09:00", end: "13:00" }],
                      breaks: [{ start: "13:00", end: "14:00" }],
                      slotDurationMinutes: 15,
                    };

                return (
                  <div
                    key={day}
                    className={`p-4 rounded-xl border transition-all ${
                      isDayActive ? "border-slate-200 bg-slate-50/50" : "border-slate-100 bg-slate-100/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isDayActive}
                          onChange={(e) => {
                            const newWorkingDays = [...currentSchedule.workingDays];
                            if (e.target.checked) {
                              newWorkingDays.push(daySched);
                            } else {
                              newWorkingDays.splice(dayIndex, 1);
                            }
                            setCurrentSchedule({
                              ...currentSchedule,
                              workingDays: newWorkingDays,
                            });
                          }}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="font-bold uppercase tracking-wider text-sm text-slate-800">
                          {day}
                        </span>
                      </div>

                      {isDayActive && (
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-slate-500">Slot Duration:</span>
                          <select
                            value={daySched.slotDurationMinutes}
                            onChange={(e) => {
                              const newWorkingDays = [...currentSchedule.workingDays];
                              newWorkingDays[dayIndex].slotDurationMinutes = Number(
                                e.target.value
                              );
                              setCurrentSchedule({
                                ...currentSchedule,
                                workingDays: newWorkingDays,
                              });
                            }}
                            className="p-1 border border-slate-300 rounded bg-white text-xs font-semibold"
                          >
                            <option value={10}>10 min</option>
                            <option value={15}>15 min</option>
                            <option value={20}>20 min</option>
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>60 min</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {isDayActive && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pt-2 border-t border-slate-200/60 text-xs">
                        {/* Working Sessions */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="font-semibold text-slate-700">
                              Working Sessions (Start — End)
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const newWorkingDays = [...currentSchedule.workingDays];
                                const currentSessions = newWorkingDays[dayIndex].sessions || [];
                                const newSession = {
                                  id: Math.random().toString(36).substring(2, 9),
                                  start: "14:00",
                                  end: "17:00",
                                  label: `Session ${currentSessions.length + 1}`,
                                };
                                newWorkingDays[dayIndex].sessions = [...currentSessions, newSession];
                                setCurrentSchedule({
                                  ...currentSchedule,
                                  workingDays: newWorkingDays,
                                });
                              }}
                              className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 inline-flex items-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3 mr-0.5" />
                              Add Session
                            </button>
                          </div>
                          <div className="space-y-2">
                            {daySched.sessions.map((sess, sIdx) => {
                              const sessKey = sess.id || `sess-${sIdx}`;
                              return (
                                <div key={sessKey} className="flex items-center space-x-2">
                                  <input
                                    type="time"
                                    required
                                    value={sess.start}
                                    onChange={(e) => {
                                      const newWorkingDays = [...currentSchedule.workingDays];
                                      newWorkingDays[dayIndex].sessions = newWorkingDays[
                                        dayIndex
                                      ].sessions.map((s, idx) =>
                                        (s.id && s.id === sess.id) || idx === sIdx
                                          ? { ...s, start: e.target.value }
                                          : s
                                      );
                                      setCurrentSchedule({
                                        ...currentSchedule,
                                        workingDays: newWorkingDays,
                                      });
                                    }}
                                    className="p-1.5 border border-slate-300 rounded bg-white text-xs font-mono"
                                  />
                                  <span className="text-slate-400">to</span>
                                  <input
                                    type="time"
                                    required
                                    value={sess.end}
                                    onChange={(e) => {
                                      const newWorkingDays = [...currentSchedule.workingDays];
                                      newWorkingDays[dayIndex].sessions = newWorkingDays[
                                        dayIndex
                                      ].sessions.map((s, idx) =>
                                        (s.id && s.id === sess.id) || idx === sIdx
                                          ? { ...s, end: e.target.value }
                                          : s
                                      );
                                      setCurrentSchedule({
                                        ...currentSchedule,
                                        workingDays: newWorkingDays,
                                      });
                                    }}
                                    className="p-1.5 border border-slate-300 rounded bg-white text-xs font-mono"
                                  />
                                  {daySched.sessions.length > 1 && (
                                    <button
                                      type="button"
                                      title="Remove working session"
                                      onClick={() => {
                                        const newWorkingDays = [...currentSchedule.workingDays];
                                        newWorkingDays[dayIndex].sessions = newWorkingDays[
                                          dayIndex
                                        ].sessions.filter((s, idx) =>
                                          sess.id ? s.id !== sess.id : idx !== sIdx
                                        );
                                        setCurrentSchedule({
                                          ...currentSchedule,
                                          workingDays: newWorkingDays,
                                        });
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Break Intervals */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="font-semibold text-slate-700">
                              Break Intervals (No slots generated)
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const newWorkingDays = [...currentSchedule.workingDays];
                                const currentBreaks = newWorkingDays[dayIndex].breaks || [];
                                const newBreak = {
                                  id: Math.random().toString(36).substring(2, 9),
                                  start: "13:00",
                                  end: "14:00",
                                };
                                newWorkingDays[dayIndex].breaks = [...currentBreaks, newBreak];
                                setCurrentSchedule({
                                  ...currentSchedule,
                                  workingDays: newWorkingDays,
                                });
                              }}
                              className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3 mr-0.5" />
                              Add Break
                            </button>
                          </div>
                          <div className="space-y-2">
                            {daySched.breaks.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-1">
                                No break periods configured for {day}.
                              </p>
                            ) : (
                              daySched.breaks.map((brk, bIdx) => {
                                const brkKey = brk.id || `brk-${bIdx}`;
                                return (
                                  <div key={brkKey} className="flex items-center space-x-2">
                                    <input
                                      type="time"
                                      required
                                      value={brk.start}
                                      onChange={(e) => {
                                        const newWorkingDays = [...currentSchedule.workingDays];
                                        newWorkingDays[dayIndex].breaks = newWorkingDays[
                                          dayIndex
                                        ].breaks.map((b, idx) =>
                                          (b.id && b.id === brk.id) || idx === bIdx
                                            ? { ...b, start: e.target.value }
                                            : b
                                        );
                                        setCurrentSchedule({
                                          ...currentSchedule,
                                          workingDays: newWorkingDays,
                                        });
                                      }}
                                      className="p-1.5 border border-amber-200 bg-amber-50 rounded text-xs font-mono text-amber-900"
                                    />
                                    <span className="text-slate-400">to</span>
                                    <input
                                      type="time"
                                      required
                                      value={brk.end}
                                      onChange={(e) => {
                                        const newWorkingDays = [...currentSchedule.workingDays];
                                        newWorkingDays[dayIndex].breaks = newWorkingDays[
                                          dayIndex
                                        ].breaks.map((b, idx) =>
                                          (b.id && b.id === brk.id) || idx === bIdx
                                            ? { ...b, end: e.target.value }
                                            : b
                                        );
                                        setCurrentSchedule({
                                          ...currentSchedule,
                                          workingDays: newWorkingDays,
                                        });
                                      }}
                                      className="p-1.5 border border-amber-200 bg-amber-50 rounded text-xs font-mono text-amber-900"
                                    />
                                    <button
                                      type="button"
                                      title="Remove break period"
                                      onClick={() => {
                                        const newWorkingDays = [...currentSchedule.workingDays];
                                        newWorkingDays[dayIndex].breaks = newWorkingDays[
                                          dayIndex
                                        ].breaks.filter((b, idx) =>
                                          brk.id ? b.id !== brk.id : idx !== bIdx
                                        );
                                        setCurrentSchedule({
                                          ...currentSchedule,
                                          workingDays: newWorkingDays,
                                        });
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={isSavingSchedule}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm shadow-md transition-all cursor-pointer min-w-[210px] inline-flex items-center justify-center disabled:opacity-50"
                  aria-busy={isSavingSchedule}
                >
                  <ButtonLoader
                    isLoading={isSavingSchedule}
                    loadingText="Saving Schedule..."
                  >
                    Save Schedule Configuration
                  </ButtonLoader>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STAFF MANAGEMENT */}
      {activeTab === "staff" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs h-fit">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center">
              <UserPlus className="w-5 h-5 text-purple-600 mr-2" />
              Add Staff / Receptionist
            </h2>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={isCreatingStaff}
                  value={staffName}
                  onChange={(e) => {
                    setStaffName(e.target.value);
                    if (staffErrors.name) setStaffErrors({ ...staffErrors, name: undefined });
                  }}
                  placeholder="e.g. Sarah Miller"
                  className={`w-full p-2.5 border rounded-lg text-sm disabled:bg-slate-100 ${
                    staffErrors.name
                      ? "border-rose-400 bg-rose-50/20 focus:ring-rose-400"
                      : "border-slate-300"
                  }`}
                />
                {staffErrors.name && (
                  <p className="text-xs text-rose-600 font-medium mt-1">{staffErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  disabled={isCreatingStaff}
                  value={staffEmail}
                  onChange={(e) => {
                    setStaffEmail(e.target.value);
                    if (staffErrors.email) setStaffErrors({ ...staffErrors, email: undefined });
                  }}
                  placeholder="sarah@emr.com"
                  className={`w-full p-2.5 border rounded-lg text-sm disabled:bg-slate-100 ${
                    staffErrors.email
                      ? "border-rose-400 bg-rose-50/20 focus:ring-rose-400"
                      : "border-slate-300"
                  }`}
                />
                {staffErrors.email && (
                  <p className="text-xs text-rose-600 font-medium mt-1">{staffErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  disabled={isCreatingStaff}
                  value={staffPassword}
                  onChange={(e) => {
                    setStaffPassword(e.target.value);
                    if (staffErrors.password) setStaffErrors({ ...staffErrors, password: undefined });
                  }}
                  placeholder="••••••••"
                  className={`w-full p-2.5 border rounded-lg text-sm disabled:bg-slate-100 ${
                    staffErrors.password
                      ? "border-rose-400 bg-rose-50/20 focus:ring-rose-400"
                      : "border-slate-300"
                  }`}
                />
                {staffErrors.password && (
                  <p className="text-xs text-rose-600 font-medium mt-1">{staffErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role Permission *
                </label>
                <select
                  value={staffRole}
                  disabled={isCreatingStaff}
                  onChange={(e) => setStaffRole(e.target.value as UserRole)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100"
                >
                  <option value="receptionist">Receptionist</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  To create doctor accounts, use the Doctor Onboarding tab.
                </p>
              </div>

              <button
                type="submit"
                disabled={isCreatingStaff}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 min-h-[42px] flex items-center justify-center"
                aria-busy={isCreatingStaff}
              >
                <ButtonLoader
                  isLoading={isCreatingStaff}
                  loadingText="Creating Staff Account..."
                >
                  Create Staff Account
                </ButtonLoader>
              </button>
            </form>
          </div>


          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Registered Staff Directory</h3>
              <span className="text-xs text-slate-500 font-semibold">
                {staffUsers.length} staff users
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800">{u.name}</td>
                      <td className="py-3 px-4 text-xs">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-purple-50 text-purple-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-emerald-600 font-semibold">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center">
              <FileSpreadsheet className="w-4 h-4 text-purple-600 mr-2" />
              System Audit Trail Ledger
            </h3>
            <span className="text-xs text-slate-500">Append-only compliance log</span>
          </div>

          {isLoadingAudit ? (
            <LoadingSpinner message="Fetching audit logs..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Entity</th>
                    <th className="py-2.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                        {log.userId?.name || "System"}
                      </td>
                      <td className="py-2.5 px-4 uppercase text-[10px] font-bold">
                        {log.userRole}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans">{log.entity}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-500 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
