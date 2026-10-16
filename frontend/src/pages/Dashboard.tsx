import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services/dashboard.service";
import { appointmentService } from "../services/appointment.service";
import {
  DashboardData,
  SuperAdminDashboardData,
  DoctorDashboardData,
  ReceptionistDashboardData,
  Appointment,
} from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner, Spinner, ButtonLoader } from "../components/LoadingSpinner";
import { Alert } from "../components/Alert";
import { Modal } from "../components/Modal";
import { getSocket } from "../services/socket";
import {
  Calendar,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  PlusCircle,
  Activity,
  Shield,
  Stethoscope,
  ChevronRight,
  Building,
  UserCheck,
  FileText,
  Phone,
  RefreshCw,
  AlertCircle,
  HeartPulse,
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Doctor Quick Complete Consultation Modal
  const [completingAppt, setCompletingAppt] = useState<Appointment | null>(null);
  const [consultationNotes, setConsultationNotes] = useState("");
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const loadDashboardData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      setError(null);
      try {
        const data = await dashboardService.getStats(todayStr);
        setDashboardData(data);
      } catch (err: unknown) {
        console.error("Dashboard data load error:", err);
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Failed to load dashboard data. Please try again.";
        setError(msg);
      } finally {
        if (!isBackground) setIsLoading(false);
      }
    },
    [todayStr]
  );

  useEffect(() => {
    loadDashboardData();

    // Listen for real-time events to refresh role metrics & table seamlessly
    const socket = getSocket();
    const handleUpdate = () => {
      loadDashboardData(true);
    };

    socket.on("appointment:created", handleUpdate);
    socket.on("appointment:updated", handleUpdate);
    socket.on("appointment:cancelled", handleUpdate);
    socket.on("appointment:arrived", handleUpdate);
    socket.on("appointment:completed", handleUpdate);

    return () => {
      socket.off("appointment:created", handleUpdate);
      socket.off("appointment:updated", handleUpdate);
      socket.off("appointment:cancelled", handleUpdate);
      socket.off("appointment:arrived", handleUpdate);
      socket.off("appointment:completed", handleUpdate);
    };
  }, [loadDashboardData]);

  // Receptionist Action: Mark Arrived
  const handleMarkArrived = async (appointmentId: string) => {
    try {
      setRowActionId(appointmentId);
      await appointmentService.markArrived(appointmentId);
      setActionSuccess("Patient arrival recorded. Waiting room queue updated.");
      setTimeout(() => setActionSuccess(null), 4000);
      await loadDashboardData(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to record patient arrival.";
      setError(msg);
    } finally {
      setRowActionId(null);
    }
  };

  // Doctor Action: Complete Consultation
  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingAppt) return;
    const targetId = completingAppt._id;
    const notesValue = consultationNotes;
    try {
      setIsSubmittingComplete(true);
      await appointmentService.complete(targetId, notesValue);
      setCompletingAppt(null);
      setConsultationNotes("");
      setActionSuccess("Consultation concluded and marked completed.");
      setTimeout(() => setActionSuccess(null), 4000);

      setDashboardData((prev) => {
        if (!prev) return prev;
        const mapAppt = (a: Appointment) =>
          a._id === targetId ? { ...a, status: "completed" as const, notes: notesValue } : a;

        if (prev.role === "doctor") {
          return {
            ...prev,
            todayAppointmentsList: prev.todayAppointmentsList.map(mapAppt),
            upcomingAppointments: prev.upcomingAppointments.map(mapAppt),
            today: {
              ...prev.today,
              completed: prev.today.completed + 1,
            },
          };
        }

        if (prev.role === "super_admin") {
          return {
            ...prev,
            recentAppointments: prev.recentAppointments.map(mapAppt),
            today: {
              ...prev.today,
              completed: prev.today.completed + 1,
            },
          };
        }

        if (prev.role === "receptionist") {
          return {
            ...prev,
            todayAppointmentsList: prev.todayAppointmentsList.map(mapAppt),
            bookingStatistics: {
              ...prev.bookingStatistics,
              completed: prev.bookingStatistics.completed + 1,
            },
          };
        }

        return prev;
      });

      await loadDashboardData(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to complete consultation.";
      setError(msg);
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingSpinner
        minHeight="min-h-[400px]"
        message="Loading clinical workspace and role metrics..."
        size="lg"
      />
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 shadow-xs text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Unable to load dashboard</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => loadDashboardData()}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer inline-flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Loading
        </button>
      </div>
    );
  }

  if (!dashboardData) return null;

  // ───────────────────────────────────────────────────────────────────────────
  // SUPER ADMIN DASHBOARD
  // ───────────────────────────────────────────────────────────────────────────
  if (dashboardData.role === "super_admin") {
    const adminData = dashboardData as SuperAdminDashboardData;
    const { totals, today, allTimeStatus, recentAppointments } = adminData;

    return (
      <div className="space-y-6">
        {actionSuccess && (
          <Alert type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
        )}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Super Admin Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="relative z-10">
            <span className="inline-flex items-center px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 backdrop-blur-md rounded-full text-xs font-semibold mb-3 tracking-wide">
              <Shield className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
              Super Administrator Console
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Hospital Operations Overview
            </h1>
            <p className="mt-2 text-slate-300 max-w-2xl text-sm md:text-base">
              Hospital-wide summary of clinical departments, active staff, receptionists, and
              live appointment pipelines.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/book"
                className="inline-flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold shadow-md transition-all"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Book Appointment
              </Link>
              <Link
                to="/scheduler"
                className="inline-flex items-center px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold border border-slate-700 transition-all"
              >
                <Clock className="w-4 h-4 mr-2 text-sky-400" />
                Slot Timetables
              </Link>
              <Link
                to="/departments"
                className="inline-flex items-center px-4 py-2 bg-indigo-900/50 hover:bg-indigo-800 text-indigo-100 rounded-lg text-sm font-semibold border border-indigo-700/50 transition-all"
              >
                <Building className="w-4 h-4 mr-2 text-indigo-300" />
                Manage Departments
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center px-4 py-2 bg-purple-900/60 hover:bg-purple-800 text-purple-100 rounded-lg text-sm font-semibold border border-purple-700/50 transition-all"
              >
                <Users className="w-4 h-4 mr-2 text-purple-300" />
                Admin Suite
              </Link>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-60 -top-10 w-48 h-48 bg-sky-600/15 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Organization Scope Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Doctors
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totals.doctors}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {totals.activeDoctors} active on duty
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Reception Staff
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totals.receptionists}</p>
              <p className="text-xs text-slate-400 mt-1">Authorized receptionists</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Departments
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totals.departments}</p>
              <p className="text-xs text-slate-400 mt-1">Clinical specialty units</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Appointments
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totals.appointments}</p>
              <p className="text-xs text-slate-400 mt-1">Lifetime booking ledger</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Today's Appointments & Status Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center">
                <Activity className="w-5 h-5 text-sky-600 mr-2" />
                Today's Appointment Pipeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time breakdown of appointments scheduled for {todayStr}
              </p>
            </div>
            <span className="inline-flex items-center px-3 py-1 bg-sky-50 text-sky-700 text-xs font-bold rounded-lg border border-sky-100">
              Total Today: {today.total}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold uppercase text-slate-500">Scheduled</span>
              <p className="text-2xl font-bold text-sky-700 mt-1">{today.scheduled}</p>
              <p className="text-xs text-slate-400 mt-0.5">Awaiting arrival</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-xs font-semibold uppercase text-amber-800">Arrived</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">{today.arrived}</p>
              <p className="text-xs text-amber-700/80 mt-0.5">In waiting room</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-xs font-semibold uppercase text-emerald-800">Completed</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{today.completed}</p>
              <p className="text-xs text-emerald-700/80 mt-0.5">Consultations done</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
              <span className="text-xs font-semibold uppercase text-rose-800">Cancelled</span>
              <p className="text-2xl font-bold text-rose-700 mt-1">{today.cancelled}</p>
              <p className="text-xs text-rose-700/80 mt-0.5">Cancelled today</p>
            </div>
          </div>

          {/* All-time status chips */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 border-t border-slate-100">
            <span className="font-semibold text-slate-700">All-Time Status Totals:</span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
              Scheduled: {allTimeStatus.scheduled}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-medium">
              Arrived: {allTimeStatus.arrived}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-medium">
              Completed: {allTimeStatus.completed}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-medium">
              Cancelled: {allTimeStatus.cancelled}
            </span>
          </div>
        </div>

        {/* Recent Appointments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center">
                <Calendar className="w-5 h-5 text-sky-600 mr-2" />
                Recent Hospital Appointments
              </h2>
              <p className="text-xs text-slate-500">Most recent appointments recorded across clinic</p>
            </div>
            <Link
              to="/appointments"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center"
            >
              View Full Ledger <ChevronRight className="w-4 h-4 ml-0.5" />
            </Link>
          </div>

          {recentAppointments.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">No appointments recorded yet.</p>
              <Link
                to="/book"
                className="inline-flex items-center text-xs font-bold text-sky-600 hover:underline"
              >
                Book your first appointment <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Time & Date</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentAppointments.map((appt) => (
                    <tr key={appt._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 font-mono text-xs">
                          {appt.slotTime}
                        </div>
                        <div className="text-xs text-slate-400">
                          {appt.appointmentDate ? new Date(appt.appointmentDate).toISOString().split("T")[0] : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {appt.patientId?.name || "Patient"}
                        </div>
                        <div className="text-xs text-slate-400">
                          ID: {appt.patientId?.patientId || "N/A"} • {appt.patientId?.mobile || ""}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{appt.doctorId?.name}</div>
                        <div className="text-xs text-slate-400">
                          {appt.doctorId?.specialization}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">
                        {appt.departmentId?.name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/appointments?search=${appt.patientId?.patientId || ""}`}
                          className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                        >
                          View Ledger
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DOCTOR DASHBOARD
  // ───────────────────────────────────────────────────────────────────────────
  if (dashboardData.role === "doctor") {
    const docData = dashboardData as DoctorDashboardData;
    const { doctorProfile, totalAppointments, today, upcomingAppointments, todayAppointmentsList } =
      docData;

    return (
      <div className="space-y-6">
        {actionSuccess && (
          <Alert type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
        )}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Doctor Personalized Header Banner */}
        <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-cyan-700 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-3 tracking-wide">
              <Stethoscope className="w-3.5 h-3.5 mr-1.5 text-cyan-200" />
              Physician Consultation Workspace
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Dr. {doctorProfile.name}
            </h1>
            <p className="mt-1 text-sky-100 text-sm md:text-base font-medium">
              {doctorProfile.specialization}{" "}
              {doctorProfile.departmentName && `• ${doctorProfile.departmentName}`}
            </p>
            <p className="mt-2 text-sky-200 text-xs max-w-2xl">
              Restricted exclusively to your patient consultations. Organization-wide records are
              hidden for clinical privacy and data isolation.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/scheduler"
                className="inline-flex items-center px-4 py-2 bg-white text-sky-800 hover:bg-sky-50 rounded-lg text-sm font-bold shadow-md transition-all"
              >
                <Clock className="w-4 h-4 mr-2 text-sky-600" />
                View Timetable & Slots
              </Link>
              <Link
                to="/appointments"
                className="inline-flex items-center px-4 py-2 bg-sky-900/60 hover:bg-sky-900 text-white rounded-lg text-sm font-semibold border border-white/20 transition-all"
              >
                <Calendar className="w-4 h-4 mr-2" />
                All My Consultations
              </Link>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Doctor Personal KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Consultations
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totalAppointments}</p>
              <p className="text-xs text-slate-400 mt-1">Assigned to your profile</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Today's Patients
              </p>
              <p className="text-2xl font-bold text-sky-600 mt-1">{today.total}</p>
              <p className="text-xs text-slate-400 mt-1">Scheduled for {todayStr}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Waiting / Arrived
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{today.arrived}</p>
              <p className="text-xs text-slate-400 mt-1">Ready in waiting room</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Finished Today
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{today.completed}</p>
              <p className="text-xs text-slate-400 mt-1">Consultations completed</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Doctor's Today Queue & Clinical Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HeartPulse className="w-5 h-5 text-sky-600" />
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Today's Consultation Queue ({todayAppointmentsList.length})
                </h2>
                <p className="text-xs text-slate-400">Patients scheduled with you today</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">{todayStr}</span>
          </div>

          {todayAppointmentsList.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">No patient consultations scheduled for today.</p>
              <p className="text-xs text-slate-400">
                You can review upcoming appointments below or check your slot timetable.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Patient Profile</th>
                    <th className="py-3 px-4">Clinical Purpose</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Consultation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayAppointmentsList.map((appt) => (
                    <tr
                      key={appt._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        appt.status === "arrived" ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900 text-xs">
                        <span className="px-2 py-1 bg-slate-100 rounded text-slate-800">
                          {appt.slotTime}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {appt.patientId?.name || "Patient"}
                        </div>
                        <div className="text-xs text-slate-400">
                          ID: {appt.patientId?.patientId} •{" "}
                          {appt.patientId?.age ? `${appt.patientId.age}y` : ""}{" "}
                          {appt.patientId?.gender ? `(${appt.patientId.gender})` : ""}{" "}
                          {appt.patientId?.bloodGroup ? `• Blood: ${appt.patientId.bloodGroup}` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {appt.purpose || "General Consultation"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {appt.status !== "completed" && appt.status !== "cancelled" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCompletingAppt(appt);
                              setConsultationNotes(appt.notes || "");
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Complete Consultation
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">Concluded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Doctor's Upcoming Appointments List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center">
                <Clock className="w-5 h-5 text-sky-600 mr-2" />
                Upcoming Patient Consultations
              </h2>
              <p className="text-xs text-slate-400">Upcoming booked slots assigned to you</p>
            </div>
            <Link
              to="/appointments"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center"
            >
              View Full Schedule <ChevronRight className="w-4 h-4 ml-0.5" />
            </Link>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No upcoming appointments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Clinical Purpose</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upcomingAppointments.map((appt) => (
                    <tr key={appt._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 text-xs">
                          {appt.appointmentDate ? new Date(appt.appointmentDate).toISOString().split("T")[0] : ""}
                        </span>
                        <span className="ml-2 font-mono text-xs text-sky-700 font-bold">
                          {appt.slotTime}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{appt.patientId?.name}</div>
                        <div className="text-xs text-slate-400">ID: {appt.patientId?.patientId}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {appt.patientId?.mobile || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {appt.purpose || "Consultation"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={appt.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Doctor Complete Consultation Modal */}
        <Modal
          isOpen={!!completingAppt}
          onClose={() => !isSubmittingComplete && setCompletingAppt(null)}
          title="Conclude Patient Consultation"
          maxWidth="md"
          preventCloseOnBackdrop={isSubmittingComplete}
        >
          {completingAppt && (
            <form onSubmit={handleCompleteConsultation} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-600 border border-slate-200">
                <p>
                  <strong className="text-slate-800">Patient:</strong> {completingAppt.patientId?.name} (
                  {completingAppt.patientId?.patientId})
                </p>
                <p>
                  <strong className="text-slate-800">Time:</strong> {completingAppt.slotTime}
                </p>
                <p>
                  <strong className="text-slate-800">Chief Complaint:</strong>{" "}
                  {completingAppt.purpose || "Routine visit"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Examination & Prescription Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={consultationNotes}
                  disabled={isSubmittingComplete}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  placeholder="Enter diagnosis, prescription summary, or follow-up instructions..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingComplete}
                  onClick={() => setCompletingAppt(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplete}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center justify-center min-w-[170px] cursor-pointer disabled:opacity-50"
                  aria-busy={isSubmittingComplete}
                >
                  <ButtonLoader isLoading={isSubmittingComplete} loadingText="Concluding...">
                    Mark Consultation Complete
                  </ButtonLoader>
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RECEPTIONIST DASHBOARD
  // ───────────────────────────────────────────────────────────────────────────
  if (dashboardData.role === "receptionist") {
    const recData = dashboardData as ReceptionistDashboardData;
    const { totals, bookingStatistics, todayAppointmentsList, activeDoctorsList } = recData;

    return (
      <div className="space-y-6">
        {actionSuccess && (
          <Alert type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
        )}
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Receptionist Header Banner */}
        <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-600 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-3 tracking-wide">
              <UserCheck className="w-3.5 h-3.5 mr-1.5 text-cyan-100" />
              Reception Desk Console
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Front Desk & Patient Flow
            </h1>
            <p className="mt-2 text-sky-100 max-w-2xl text-sm md:text-base">
              Manage patient check-ins, record arrivals, book new appointments, and view on-duty
              physician rosters.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/book"
                className="inline-flex items-center px-4 py-2 bg-white text-sky-700 hover:bg-sky-50 rounded-lg text-sm font-bold shadow-md transition-all"
              >
                <PlusCircle className="w-4 h-4 mr-2 text-sky-600" />
                Book New Appointment
              </Link>
              <Link
                to="/scheduler"
                className="inline-flex items-center px-4 py-2 bg-sky-800/80 hover:bg-sky-800 text-white rounded-lg text-sm font-semibold border border-white/20 transition-all"
              >
                <Clock className="w-4 h-4 mr-2" />
                Live Slot Timetables
              </Link>
              <Link
                to="/appointments"
                className="inline-flex items-center px-4 py-2 bg-sky-900/60 hover:bg-sky-900 text-white rounded-lg text-sm font-semibold border border-white/20 transition-all"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Appointments Ledger
              </Link>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Receptionist Scope Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Doctors
              </p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{totals.doctors}</p>
              <p className="text-xs text-slate-400 mt-1">Available for consultation</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Departments
              </p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{totals.departments}</p>
              <p className="text-xs text-slate-400 mt-1">Clinical specialty units</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Today's Patients
              </p>
              <p className="text-2xl font-bold text-sky-600 mt-1">{bookingStatistics.todayTotal}</p>
              <p className="text-xs text-slate-400 mt-1">Appointments on {todayStr}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Booked Volume
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {bookingStatistics.totalBooked}
              </p>
              <p className="text-xs text-slate-400 mt-1">Lifetime clinic bookings</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Today's Reception Flow Status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold uppercase text-slate-500">Scheduled</span>
            <p className="text-2xl font-bold text-sky-700 mt-1">{bookingStatistics.scheduled}</p>
            <p className="text-xs text-slate-400 mt-0.5">Not yet arrived</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-xs">
            <span className="text-xs font-semibold uppercase text-amber-700">Waiting / Arrived</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{bookingStatistics.arrived}</p>
            <p className="text-xs text-slate-400 mt-0.5">Checked-in patients</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-xs">
            <span className="text-xs font-semibold uppercase text-emerald-700">Completed</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{bookingStatistics.completed}</p>
            <p className="text-xs text-slate-400 mt-0.5">Consultations done</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-xs">
            <span className="text-xs font-semibold uppercase text-rose-700">Cancelled</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{bookingStatistics.cancelled}</p>
            <p className="text-xs text-slate-400 mt-0.5">Cancelled today</p>
          </div>
        </div>

        {/* Main Reception Content Grid: Today's Appointments & Doctor Directory */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Appointments Check-in Queue (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-sky-600" />
                <h2 className="text-base font-bold text-slate-800">
                  Today's Appointments Queue ({todayAppointmentsList.length})
                </h2>
              </div>
              <Link
                to="/appointments"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center"
              >
                Full Ledger <ChevronRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>

            {todayAppointmentsList.length === 0 ? (
              <div className="p-10 text-center text-slate-500 space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">No appointments scheduled for today.</p>
                <Link
                  to="/book"
                  className="inline-flex items-center text-xs font-bold text-sky-600 hover:underline"
                >
                  Book an appointment now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Doctor & Dept</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Check-In Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todayAppointmentsList.map((appt) => (
                      <tr key={appt._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100">{appt.slotTime}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{appt.patientId?.name}</div>
                          <div className="text-xs text-slate-400">
                            ID: {appt.patientId?.patientId} • {appt.patientId?.mobile}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{appt.doctorId?.name}</div>
                          <div className="text-xs text-slate-400">{appt.departmentId?.name}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={appt.status} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {appt.status === "scheduled" ? (
                            <button
                              type="button"
                              disabled={rowActionId === appt._id}
                              onClick={() => handleMarkArrived(appt._id)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center min-w-[105px] justify-center"
                            >
                              <ButtonLoader
                                isLoading={rowActionId === appt._id}
                                loadingText="Saving..."
                              >
                                Mark Arrived
                              </ButtonLoader>
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">Checked In</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Doctors Roster (1 col) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center">
                  <Stethoscope className="w-5 h-5 text-purple-600 mr-2" />
                  On-Duty Physicians ({activeDoctorsList.length})
                </h3>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {activeDoctorsList.map((doc) => (
                  <div
                    key={doc._id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">{doc.name}</h4>
                      <p className="text-xs text-slate-500">{doc.specialization}</p>
                      <span className="inline-block mt-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {(doc.departmentId as { name?: string })?.name || "General"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Link
                        to={`/scheduler?doctorId=${doc._id}`}
                        className="p-1.5 text-slate-400 hover:text-sky-600 transition-colors rounded-md hover:bg-white"
                        title="View Slot Timetable"
                      >
                        <Clock className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/book?doctorId=${doc._id}`}
                        className="p-1.5 text-slate-400 hover:text-purple-600 transition-colors rounded-md hover:bg-white"
                        title="Book with Doctor"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
