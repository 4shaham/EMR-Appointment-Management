import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { appointmentService } from "../services/appointment.service";
import { departmentService } from "../services/department.service";
import { Appointment, Department, AppointmentStatus } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner, Spinner, ButtonLoader } from "../components/LoadingSpinner";
import { Alert } from "../components/Alert";
import { Modal } from "../components/Modal";

import { getSocket } from "../services/socket";
import {
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Edit3,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Stethoscope,
  Clock,
  Radio,
} from "lucide-react";

export const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Action Modals State
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Load Departments
  useEffect(() => {
    departmentService.getAll().then(setDepartments).catch(console.error);
  }, []);

  // 2. Fetch Appointments
  const fetchAppointments = useCallback(
    async (isBackground = false) => {
      try {
        if (isBackground) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);
        const res = await appointmentService.list({
          page,
          limit,
          search: search.trim() || undefined,
          status: status || undefined,
          departmentId: departmentId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sortBy: "appointmentDate",
          sortOrder: "asc",
        });
        setAppointments(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages);
          setTotalCount(res.meta.total);
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Failed to load appointments.";
        if (!isBackground) {
          setError(msg);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, search, status, departmentId, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // 3. Socket.IO Real-Time Synchronization
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => {
      fetchAppointments(true);
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
  }, [fetchAppointments]);

  // Action: Mark Arrived
  const handleMarkArrived = async (appt: Appointment) => {
    try {
      setRowActionId(appt._id);
      await appointmentService.markArrived(appt._id);
      setSuccess(`Patient ${appt.patientId?.name} marked as Arrived.`);
      setTimeout(() => setSuccess(null), 3000);
      await fetchAppointments(true);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to mark as arrived."
      );
    } finally {
      setRowActionId(null);
    }
  };


  // Action: Cancel Appointment
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !cancelReason.trim()) return;

    try {
      setIsSubmittingAction(true);
      await appointmentService.cancel(selectedAppointment._id, cancelReason);
      setIsCancelModalOpen(false);
      setCancelReason("");
      setSelectedAppointment(null);
      setSuccess("Appointment cancelled successfully. Slot is now free.");
      setTimeout(() => setSuccess(null), 3000);
      fetchAppointments();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to cancel appointment."
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action: Update Notes / Purpose
  const handleUpdateNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    try {
      setIsSubmittingAction(true);
      await appointmentService.update(selectedAppointment._id, {
        purpose,
        notes,
      });
      setIsNotesModalOpen(false);
      setSelectedAppointment(null);
      setSuccess("Appointment updated successfully.");
      setTimeout(() => setSuccess(null), 3000);
      fetchAppointments();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update appointment."
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action: Complete Consultation
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    const targetId = selectedAppointment._id;
    const notesValue = completionNotes;

    try {
      setIsSubmittingAction(true);
      await appointmentService.complete(targetId, notesValue);
      setIsCompleteModalOpen(false);
      setCompletionNotes("");
      setSelectedAppointment(null);
      setSuccess("Consultation marked as completed.");
      setTimeout(() => setSuccess(null), 3000);

      // Immediately update local appointments list
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === targetId
            ? { ...a, status: "completed" as const, notes: notesValue }
            : a
        )
      );

      await fetchAppointments(true);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to complete consultation."
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const openCancelModal = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setCancelReason("");
    setIsCancelModalOpen(true);
  };

  const openNotesModal = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setPurpose(appt.purpose || "");
    setNotes(appt.notes || "");
    setIsNotesModalOpen(true);
  };

  const openCompleteModal = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setCompletionNotes(appt.notes || "");
    setIsCompleteModalOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-sky-600" />
            Appointments Master Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, track patient arrival check-ins, and complete consultations
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Radio className="w-3.5 h-3.5 mr-1.5 animate-pulse text-emerald-600" />
            Live Synced
          </span>
          <span className="text-xs font-bold text-slate-500">
            Total Records: {totalCount}
          </span>
        </div>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Patient Name, Patient ID (PAT-xxxx), Mobile Number, or Doctor Name..."
            className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="arrived">Arrived</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Fetching appointments ledger..." />
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No appointments found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search criteria, dates, or status filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor & Specialty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Chief Complaint / Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appt) => (
                  <tr key={appt._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date & Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {formatDate(appt.appointmentDate)}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 mt-0.5 rounded bg-sky-50 text-sky-800 text-xs font-mono font-semibold">
                        <Clock className="w-3 h-3 mr-1" />
                        {appt.slotTime}
                      </span>
                    </td>

                    {/* Patient */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {appt.patientId?.name || "Patient"}
                      </div>
                      <div className="text-xs text-slate-500">
                        ID:{" "}
                        <span className="font-mono font-semibold text-slate-700">
                          {appt.patientId?.patientId || "N/A"}
                        </span>{" "}
                        • {appt.patientId?.mobile}
                      </div>
                    </td>

                    {/* Doctor */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 flex items-center">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400 mr-1" />
                        {appt.doctorId?.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {appt.departmentId?.name}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={appt.status} />
                    </td>

                    {/* Purpose / Notes */}
                    <td className="py-3 px-4 max-w-xs truncate">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {appt.purpose || "—"}
                      </div>
                      {appt.notes && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5 italic">
                          Notes: {appt.notes}
                        </div>
                      )}
                      {appt.cancelReason && (
                        <div className="text-[11px] text-rose-600 truncate mt-0.5">
                          Reason: {appt.cancelReason}
                        </div>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* 1. Mark Arrived (Receptionist / Admin) */}
                        {appt.status === "scheduled" && user?.role !== "doctor" && (
                          <button
                            type="button"
                            disabled={rowActionId === appt._id || isSubmittingAction}
                            onClick={() => handleMarkArrived(appt)}
                            className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors min-w-[95px] inline-flex items-center justify-center disabled:opacity-60 cursor-pointer"
                            title="Mark Patient as Arrived"
                            aria-busy={rowActionId === appt._id}
                          >
                            <ButtonLoader
                              isLoading={rowActionId === appt._id}
                              loadingText="Marking..."
                              spinnerSize="xs"
                              spinnerColor="current"
                            >
                              Mark Arrived
                            </ButtonLoader>
                          </button>
                        )}

                        {/* 2. Complete Consultation (Doctor or Receptionist/Admin) */}
                        {(appt.status === "arrived" ||
                          (user?.role === "doctor" && appt.status === "scheduled")) && (
                          <button
                            type="button"
                            disabled={rowActionId === appt._id || isSubmittingAction}
                            onClick={() => openCompleteModal(appt)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                            title="Complete Consultation"
                          >
                            Complete
                          </button>
                        )}

                        {/* 3. Edit Notes / Purpose */}
                        {appt.status !== "cancelled" && (
                          <button
                            type="button"
                            disabled={rowActionId === appt._id || isSubmittingAction}
                            onClick={() => openNotesModal(appt)}
                            className="p-1 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Edit Purpose & Notes"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {/* 4. Cancel (Receptionist / Admin) */}
                        {appt.status !== "cancelled" &&
                          appt.status !== "completed" &&
                          user?.role !== "doctor" && (
                            <button
                              type="button"
                              disabled={rowActionId === appt._id || isSubmittingAction}
                              onClick={() => openCancelModal(appt)}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Cancel Appointment"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing Page <span className="font-bold text-slate-800">{page}</span> of{" "}
            <span className="font-bold text-slate-800">{totalPages || 1}</span> (
            {totalCount} total)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-slate-300 rounded-md hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-700">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-300 rounded-md hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Cancel Appointment with Reason */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Appointment"
        maxWidth="md"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to cancel the appointment for{" "}
            <strong>{selectedAppointment?.patientId?.name}</strong> on{" "}
            <strong>
              {selectedAppointment && formatDate(selectedAppointment.appointmentDate)}
            </strong>{" "}
            at <strong>{selectedAppointment?.slotTime}</strong>?
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Cancellation Reason *
            </label>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Patient called to reschedule, Doctor emergency"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              disabled={isSubmittingAction}
              onClick={() => setIsCancelModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-40"
            >
              Keep Appointment
            </button>
            <button
              type="submit"
              disabled={isSubmittingAction || !cancelReason.trim()}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 min-w-[160px] inline-flex items-center justify-center cursor-pointer"
              aria-busy={isSubmittingAction}
            >
              <ButtonLoader isLoading={isSubmittingAction} loadingText="Cancelling...">
                Confirm Cancellation
              </ButtonLoader>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Purpose & Notes */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => !isSubmittingAction && setIsNotesModalOpen(false)}
        title="Update Purpose & Consultation Notes"
        maxWidth="md"
        preventCloseOnBackdrop={isSubmittingAction}
      >
        <form onSubmit={handleUpdateNotesSubmit} className="space-y-4">
          {user?.role !== "doctor" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Chief Complaint / Purpose
              </label>
              <input
                type="text"
                disabled={isSubmittingAction}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Clinical Consultation Notes
            </label>
            <textarea
              rows={4}
              disabled={isSubmittingAction}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter consultation observations, prescriptions, or follow-up instructions..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              disabled={isSubmittingAction}
              onClick={() => setIsNotesModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAction}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 min-w-[130px] inline-flex items-center justify-center cursor-pointer"
              aria-busy={isSubmittingAction}
            >
              <ButtonLoader isLoading={isSubmittingAction} loadingText="Saving...">
                Save Changes
              </ButtonLoader>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Complete Consultation */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => !isSubmittingAction && setIsCompleteModalOpen(false)}
        title="Complete Patient Consultation"
        maxWidth="md"
        preventCloseOnBackdrop={isSubmittingAction}
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">
            Mark consultation as completed for{" "}
            <strong>{selectedAppointment?.patientId?.name}</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Final Consultation Summary / Prescriptions (Optional)
            </label>
            <textarea
              rows={4}
              disabled={isSubmittingAction}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Diagnosis, treatment administered, follow-up advice..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              disabled={isSubmittingAction}
              onClick={() => setIsCompleteModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAction}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 min-w-[170px] inline-flex items-center justify-center cursor-pointer"
              aria-busy={isSubmittingAction}
            >
              <ButtonLoader isLoading={isSubmittingAction} loadingText="Completing...">
                Complete Consultation
              </ButtonLoader>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
