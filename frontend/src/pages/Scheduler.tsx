import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { appointmentService } from "../services/appointment.service";
import { doctorService } from "../services/doctor.service";
import { departmentService } from "../services/department.service";
import { Doctor, Department, SlotInfo, SlotsResponse, Schedule, DaySchedule, DayOfWeek } from "../types";
import { LoadingSpinner, Spinner, ButtonLoader } from "../components/LoadingSpinner";
import { Alert } from "../components/Alert";
import { Modal } from "../components/Modal";
import { getSocket, joinSchedulerRoom } from "../services/socket";
import {
  Calendar,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  User,
  PlusCircle,
  Radio,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";

const allDays: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const attachUiIds = (sched: Schedule): Schedule => {
  return {
    ...sched,
    workingDays: sched.workingDays.map((d) => ({
      ...d,
      sessions: (d.sessions || []).map((s) => ({
        ...s,
        id: s.id || Math.random().toString(36).substring(2, 9),
      })),
      breaks: (d.breaks || []).map((b) => ({
        ...b,
        id: b.id || Math.random().toString(36).substring(2, 9),
      })),
    })),
  };
};

export const Scheduler: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    searchParams.get("doctorId") || ""
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get("date") || todayStr
  );

  // Slots State
  const [slotsData, setSlotsData] = useState<SlotsResponse | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Doctor Schedule Management Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState<Schedule | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleModalError, setScheduleModalError] = useState<string | null>(null);

  // Quick Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<string>("");

  // Quick Booking Form Fields
  const [patientMode, setPatientMode] = useState<"existing" | "new">("new");
  const [existingPatientSearch, setExistingPatientSearch] = useState("");
  const [selectedExistingPatientId, setSelectedExistingPatientId] = useState("");
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientMobile, setNewPatientMobile] = useState("");
  const [newPatientAge, setNewPatientAge] = useState<number>(30);
  const [newPatientGender, setNewPatientGender] = useState<"male" | "female" | "other">("male");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [purpose, setPurpose] = useState("General Consultation");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  // 1. Initial Load of Departments and Doctors
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [depts, docs] = await Promise.all([
          departmentService.getAll(),
          doctorService.getAll(),
        ]);
        setDepartments(depts);
        setDoctors(docs);

        // If user is doctor, automatically resolve doctor ID
        if (user?.role === "doctor") {
          const myDoc = docs.find((d) => {
            const uid =
              typeof d.userId === "object" && d.userId !== null
                ? (d.userId as { _id?: string })._id || d.userId
                : d.userId;
            return String(uid) === String(user._id);
          });
          const docId = myDoc ? myDoc._id : "me";
          setSelectedDoctorId(docId);
          setSearchParams({ date: selectedDate });
        } else {
          // Auto-select first doctor if none in query params
          if (!selectedDoctorId && docs.length > 0) {
            const defaultDoc = docs[0]._id;
            setSelectedDoctorId(defaultDoc);
            setSearchParams({ doctorId: defaultDoc, date: selectedDate });
          }
        }
      } catch (err) {
        console.error("Error loading scheduler metadata:", err);
        setError("Failed to load doctors or departments.");
      }
    };
    fetchMetadata();
  }, [user]);

  // Open doctor schedule modal
  const openScheduleModal = async () => {
    const targetDocId = selectedDoctorId || "me";
    try {
      setIsLoadingSchedule(true);
      setScheduleModalError(null);
      setIsScheduleModalOpen(true);
      const sched = await doctorService.getSchedule(targetDocId);
      setScheduleData(attachUiIds(sched));
    } catch (err: unknown) {
      // If doctor has no schedule yet, provide default template with stable keys
      const defaultDays: DaySchedule[] = (
        ["monday", "tuesday", "wednesday", "thursday", "friday"] as DayOfWeek[]
      ).map((day) => ({
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
      }));

      setScheduleData({
        _id: "",
        doctorId: targetDocId,
        isActive: true,
        workingDays: defaultDays,
      });
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Save doctor schedule
  const handleSaveDoctorSchedule = async () => {
    if (!scheduleData) return;
    const validationError = validateSchedule(scheduleData.workingDays);
    if (validationError) {
      setScheduleModalError(validationError);
      return;
    }

    try {
      setIsSavingSchedule(true);
      setScheduleModalError(null);

      const cleanWorkingDays: DaySchedule[] = scheduleData.workingDays.map((d) => ({
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

      const targetDocId = selectedDoctorId || "me";
      await doctorService.upsertSchedule(targetDocId, cleanWorkingDays);
      setSuccessMsg("Schedule and breaks updated successfully!");
      setIsScheduleModalOpen(false);
      fetchSlots();
    } catch (err: unknown) {
      const errRes = (err as { response?: { data?: { message?: string; errors?: Array<{ field: string; message: string }> } } })?.response?.data;
      if (errRes?.errors && Array.isArray(errRes.errors) && errRes.errors.length > 0) {
        const detail = errRes.errors.map((e) => e.message).join(". ");
        setScheduleModalError(`${errRes.message || "Validation failed"}: ${detail}`);
      } else {
        setScheduleModalError(errRes?.message || "Failed to update schedule.");
      }
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // 2. Fetch Slots for selected Doctor & Date
  const fetchSlots = useCallback(async () => {
    const docId = selectedDoctorId || (user?.role === "doctor" ? "me" : "");
    if (!docId || !selectedDate) return;

    try {
      setIsLoadingSlots(true);
      setError(null);
      const data = await appointmentService.getSlots(
        docId,
        selectedDate,
        user?.role === "doctor" ? undefined : (selectedDeptId || undefined)
      );
      setSlotsData(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to load slots for this doctor.";
      setError(msg);
      setSlotsData(null);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedDoctorId, selectedDate, selectedDeptId, user]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // 3. Socket.IO Real-Time Updates
  useEffect(() => {
    const docId = selectedDoctorId || (user?.role === "doctor" ? "me" : "");
    if (!docId || !selectedDate) return;

    // Join target room for this doctor + date
    joinSchedulerRoom(docId, selectedDate);

    const socket = getSocket();

    const handleRealtimeUpdate = (data: { doctorId?: string; date?: string }) => {
      console.log("[Scheduler] Real-time event received:", data);
      fetchSlots();
    };

    socket.on("appointment:created", handleRealtimeUpdate);
    socket.on("appointment:cancelled", handleRealtimeUpdate);
    socket.on("appointment:updated", handleRealtimeUpdate);
    socket.on("appointment:arrived", handleRealtimeUpdate);
    socket.on("appointment:completed", handleRealtimeUpdate);
    socket.on("schedule:updated", handleRealtimeUpdate);

    return () => {
      socket.off("appointment:created", handleRealtimeUpdate);
      socket.off("appointment:cancelled", handleRealtimeUpdate);
      socket.off("appointment:updated", handleRealtimeUpdate);
      socket.off("appointment:arrived", handleRealtimeUpdate);
      socket.off("appointment:completed", handleRealtimeUpdate);
      socket.off("schedule:updated", handleRealtimeUpdate);
    };
  }, [selectedDoctorId, selectedDate, fetchSlots, user]);

  // Handle department filter change
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    // If current selected doctor doesn't belong to this dept, pick first matching
    const matchingDocs = deptId
      ? doctors.filter(
          (d) =>
            (d.departmentId as { _id?: string })._id === deptId ||
            d.departmentId === deptId
        )
      : doctors;

    if (matchingDocs.length > 0) {
      const nextDocId = matchingDocs[0]._id;
      setSelectedDoctorId(nextDocId);
      setSearchParams({ doctorId: nextDocId, date: selectedDate });
    } else {
      setSelectedDoctorId("");
      setSlotsData(null);
    }
  };

  const handleDoctorChange = (docId: string) => {
    setSelectedDoctorId(docId);
    setSearchParams({ doctorId: docId, date: selectedDate });
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (user?.role === "doctor") {
      setSearchParams({ date });
    } else {
      setSearchParams({ doctorId: selectedDoctorId, date });
    }
  };

  // Open Quick Booking Modal on Slot Click
  const handleSlotClick = (slot: SlotInfo) => {
    if (!slot.isAvailable) return;
    if (user?.role === "doctor") {
      alert("Doctors cannot directly book appointments. Receptionists/Admins book appointments.");
      return;
    }
    setSelectedSlotForBooking(slot.time);
    setModalError(null);
    setIsBookingModalOpen(true);
  };

  const handleQuickBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedSlotForBooking) return;

    setIsSubmittingBooking(true);
    setModalError(null);

    const doctorObj = doctors.find((d) => d._id === selectedDoctorId);
    const deptId =
      (doctorObj?.departmentId as { _id?: string })?._id ||
      (doctorObj?.departmentId as string) ||
      "";

    try {
      const payload: Parameters<typeof appointmentService.book>[0] = {
        doctorId: selectedDoctorId,
        departmentId: deptId,
        appointmentDate: selectedDate,
        slotTime: selectedSlotForBooking,
        purpose,
      };

      if (patientMode === "existing") {
        if (!selectedExistingPatientId) {
          setModalError("Please select an existing patient.");
          setIsSubmittingBooking(false);
          return;
        }
        payload.patientId = selectedExistingPatientId;
      } else {
        if (!newPatientName || !newPatientMobile) {
          setModalError("Patient name and mobile number are required.");
          setIsSubmittingBooking(false);
          return;
        }
        payload.newPatient = {
          name: newPatientName,
          mobile: newPatientMobile,
          email: newPatientEmail || undefined,
          age: Number(newPatientAge),
          gender: newPatientGender,
        };
      }

      await appointmentService.book(payload);
      setIsBookingModalOpen(false);
      setSuccessMsg(`Appointment confirmed for ${selectedSlotForBooking}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchSlots();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Booking failed. Slot may have been taken.";
      setModalError(msg);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const filteredDoctors = selectedDeptId
    ? doctors.filter(
        (d) =>
          (d.departmentId as { _id?: string })._id === selectedDeptId ||
          d.departmentId === selectedDeptId
      )
    : doctors;

  const myDoctor = doctors.find((d) => {
    const uid =
      typeof d.userId === "object" && d.userId !== null
        ? (d.userId as { _id?: string })._id || d.userId
        : d.userId;
    return String(uid) === String(user?._id);
  });

  const myDeptName =
    typeof myDoctor?.departmentId === "object" && myDoctor?.departmentId !== null
      ? (myDoctor.departmentId as Department).name
      : departments.find((dept) => dept._id === myDoctor?.departmentId)?.name || "Clinical Department";

  return (
    <div className="space-y-6">
      {/* Title & Real-Time Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Clock className="w-6 h-6 mr-2 text-sky-600" />
            Live Appointment Scheduler
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time appointment slot generation and instant availability timetable
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Radio className="w-3.5 h-3.5 mr-1.5 animate-pulse text-emerald-600" />
            Live Sync Active
          </span>
          <button
            onClick={() => fetchSlots()}
            className="p-2 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh Slots"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {successMsg && (
        <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />
      )}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Filter Bar / Doctor Header */}
      {user?.role === "doctor" ? (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 font-bold text-lg shrink-0">
              Dr
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {myDoctor?.name || user?.name || "Dr. Schedule"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {myDoctor?.specialization || "Physician"} • {myDeptName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Appointment Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="py-1.5 px-3 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:self-end">
              <button
                type="button"
                onClick={openScheduleModal}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4 mr-1" />
                <span>Manage Working Hours & Breaks</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Department Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                1. Department Specialty
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                2. Attending Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => handleDoctorChange(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              >
                {filteredDoctors.length === 0 && <option value="">No doctors found</option>}
                {filteredDoctors.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.name} — {doc.specialization}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                3. Appointment Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slot Summary & Legend */}
      {slotsData && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-100/70 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-6 text-sm">
            <div>
              <span className="text-slate-500">Total Generated:</span>{" "}
              <span className="font-bold text-slate-800">{slotsData.totalSlots}</span>
            </div>
            <div>
              <span className="text-slate-500">Available:</span>{" "}
              <span className="font-bold text-emerald-600">
                {slotsData.availableSlots}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Booked:</span>{" "}
              <span className="font-bold text-amber-600">{slotsData.bookedSlots}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="flex items-center">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 mr-1.5" />
              Available (Click to Book)
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 rounded-sm bg-amber-500 mr-1.5" />
              Booked
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 rounded-sm bg-slate-300 mr-1.5" />
              Past Time / Break
            </span>
          </div>
        </div>
      )}

      {/* Slot Grid Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 min-h-[300px]">
        {isLoadingSlots ? (
          <LoadingSpinner
            message="Generating dynamic slots from doctor schedule..."
            minHeight="min-h-[220px]"
          />
        ) : !slotsData || slotsData.slots.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Slots Available</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              The selected doctor has no active schedule for this day of the week, or
              all working hours/sessions have concluded.
            </p>
          </div>
        ) : (

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {slotsData.slots.map((slot) => {
              let btnClass = "";
              if (slot.isAvailable) {
                btnClass =
                  "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:shadow-sm cursor-pointer";
              } else if (slot.isBooked) {
                btnClass =
                  "bg-amber-50 text-amber-800 border-amber-300 cursor-not-allowed opacity-90";
              } else {
                btnClass =
                  "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60";
              }

              return (
                <button
                  key={slot.time}
                  onClick={() => handleSlotClick(slot)}
                  disabled={!slot.isAvailable}
                  className={`p-3 rounded-lg border text-center font-mono text-sm font-bold transition-all relative flex flex-col items-center justify-center ${btnClass}`}
                  title={
                    slot.isAvailable
                      ? "Click to book this slot"
                      : slot.isBooked
                      ? "Slot is already booked"
                      : "Slot is in the past"
                  }
                >
                  <span>{slot.time}</span>
                  <span className="text-[10px] font-sans font-medium uppercase mt-0.5">
                    {slot.isAvailable
                      ? "Available"
                      : slot.isBooked
                      ? "Booked"
                      : "Past"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Booking Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={`Book Appointment — ${selectedSlotForBooking}`}
        maxWidth="lg"
      >
        <form onSubmit={handleQuickBookSubmit} className="space-y-4">
          {modalError && <Alert type="error" message={modalError} />}

          <div className="bg-sky-50 p-3 rounded-lg border border-sky-100 text-xs text-sky-800 flex justify-between">
            <span>
              <strong>Doctor:</strong> {slotsData?.doctor?.name}
            </span>
            <span>
              <strong>Date:</strong> {selectedDate}
            </span>
            <span>
              <strong>Slot:</strong> {selectedSlotForBooking}
            </span>
          </div>

          {/* Patient Mode Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPatientMode("new")}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                patientMode === "new"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              + New Patient Record
            </button>
            <button
              type="button"
              onClick={() => setPatientMode("existing")}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                patientMode === "existing"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Search Existing Patient
            </button>
          </div>

          {patientMode === "new" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPatientMobile}
                    onChange={(e) => setNewPatientMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={newPatientGender}
                    onChange={(e) =>
                      setNewPatientGender(e.target.value as "male" | "female" | "other")
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newPatientEmail}
                    onChange={(e) => setNewPatientEmail(e.target.value)}
                    placeholder="optional"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter Patient MongoDB ID or select from list
              </label>
              <input
                type="text"
                value={selectedExistingPatientId}
                onChange={(e) => setSelectedExistingPatientId(e.target.value)}
                placeholder="Paste Patient ID or view ledger"
                className="w-full p-2 border border-slate-300 rounded-lg text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tip: You can use the dedicated "Book Appointment" tab for full autocomplete search by Mobile or Name.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purpose / Chief Complaint
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Chest pain, Follow-up consultation"
              className="w-full p-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmittingBooking}
              onClick={() => setIsBookingModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingBooking}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold shadow-md disabled:opacity-50 min-w-[155px] inline-flex items-center justify-center cursor-pointer"
              aria-busy={isSubmittingBooking}
            >
              <ButtonLoader isLoading={isSubmittingBooking} loadingText="Confirming...">
                Confirm Booking
              </ButtonLoader>
            </button>
          </div>
        </form>
      </Modal>

      {/* Doctor Schedule Management Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Manage Weekly Working Hours & Breaks"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Configure your active working days, multiple daily working sessions, slot duration, and scheduled break intervals.
          </p>

          {scheduleModalError && (
            <Alert
              type="error"
              message={scheduleModalError}
              onClose={() => setScheduleModalError(null)}
            />
          )}

          {isLoadingSchedule ? (
            <LoadingSpinner message="Loading your schedule..." minHeight="min-h-[200px]" />
          ) : !scheduleData ? (
            <p className="text-sm text-slate-500 py-6 text-center">No schedule found.</p>
          ) : (
            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {allDays.map((day) => {
                const dayIndex = scheduleData.workingDays.findIndex((d) => d.day === day);
                const isDayActive = dayIndex !== -1;
                const daySched = isDayActive
                  ? scheduleData.workingDays[dayIndex]
                  : {
                      day,
                      sessions: [{ id: Math.random().toString(36).substring(2, 9), start: "09:00", end: "13:00" }],
                      breaks: [{ id: Math.random().toString(36).substring(2, 9), start: "13:00", end: "14:00" }],
                      slotDurationMinutes: 15,
                    };

                return (
                  <div
                    key={day}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isDayActive ? "border-slate-200 bg-slate-50/60" : "border-slate-100 bg-slate-100/40 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isDayActive}
                          onChange={(e) => {
                            const newWorkingDays = [...scheduleData.workingDays];
                            if (e.target.checked) {
                              newWorkingDays.push(daySched);
                            } else {
                              newWorkingDays.splice(dayIndex, 1);
                            }
                            setScheduleData({
                              ...scheduleData,
                              workingDays: newWorkingDays,
                            });
                          }}
                          className="w-4 h-4 text-sky-600 rounded"
                        />
                        <span className="font-bold uppercase tracking-wider text-xs text-slate-800">
                          {day}
                        </span>
                      </div>

                      {isDayActive && (
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-slate-500 font-medium">Slot:</span>
                          <select
                            value={daySched.slotDurationMinutes}
                            onChange={(e) => {
                              const newWorkingDays = [...scheduleData.workingDays];
                              newWorkingDays[dayIndex].slotDurationMinutes = Number(e.target.value);
                              setScheduleData({
                                ...scheduleData,
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-200/60 text-xs">
                        {/* Working Sessions */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-slate-700">
                              Working Sessions
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newWorkingDays = [...scheduleData.workingDays];
                                const currentSessions = newWorkingDays[dayIndex].sessions || [];
                                const newSession = {
                                  id: Math.random().toString(36).substring(2, 9),
                                  start: "14:00",
                                  end: "17:00",
                                  label: `Session ${currentSessions.length + 1}`,
                                };
                                newWorkingDays[dayIndex].sessions = [...currentSessions, newSession];
                                setScheduleData({
                                  ...scheduleData,
                                  workingDays: newWorkingDays,
                                });
                              }}
                              className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3 mr-0.5" />
                              Add Session
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {daySched.sessions.map((sess, sIdx) => {
                              const sessKey = sess.id || `sess-${sIdx}`;
                              return (
                                <div key={sessKey} className="flex items-center space-x-1.5">
                                  <input
                                    type="time"
                                    required
                                    value={sess.start}
                                    onChange={(e) => {
                                      const newWorkingDays = [...scheduleData.workingDays];
                                      newWorkingDays[dayIndex].sessions = newWorkingDays[
                                        dayIndex
                                      ].sessions.map((s, idx) =>
                                        (s.id && s.id === sess.id) || idx === sIdx
                                          ? { ...s, start: e.target.value }
                                          : s
                                      );
                                      setScheduleData({
                                        ...scheduleData,
                                        workingDays: newWorkingDays,
                                      });
                                    }}
                                    className="p-1 border border-slate-300 rounded bg-white text-xs font-mono"
                                  />
                                  <span className="text-slate-400 text-xs">to</span>
                                  <input
                                    type="time"
                                    required
                                    value={sess.end}
                                    onChange={(e) => {
                                      const newWorkingDays = [...scheduleData.workingDays];
                                      newWorkingDays[dayIndex].sessions = newWorkingDays[
                                        dayIndex
                                      ].sessions.map((s, idx) =>
                                        (s.id && s.id === sess.id) || idx === sIdx
                                          ? { ...s, end: e.target.value }
                                          : s
                                      );
                                      setScheduleData({
                                        ...scheduleData,
                                        workingDays: newWorkingDays,
                                      });
                                    }}
                                    className="p-1 border border-slate-300 rounded bg-white text-xs font-mono"
                                  />
                                  {daySched.sessions.length > 1 && (
                                    <button
                                      type="button"
                                      title="Remove session"
                                      onClick={() => {
                                        const newWorkingDays = [...scheduleData.workingDays];
                                        newWorkingDays[dayIndex].sessions = newWorkingDays[
                                          dayIndex
                                        ].sessions.filter((s, idx) =>
                                          sess.id ? s.id !== sess.id : idx !== sIdx
                                        );
                                        setScheduleData({
                                          ...scheduleData,
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

                        {/* Break Periods */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-slate-700">
                              Breaks
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newWorkingDays = [...scheduleData.workingDays];
                                const currentBreaks = newWorkingDays[dayIndex].breaks || [];
                                const newBreak = {
                                  id: Math.random().toString(36).substring(2, 9),
                                  start: "13:00",
                                  end: "14:00",
                                };
                                newWorkingDays[dayIndex].breaks = [...currentBreaks, newBreak];
                                setScheduleData({
                                  ...scheduleData,
                                  workingDays: newWorkingDays,
                                });
                              }}
                              className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3 mr-0.5" />
                              Add Break
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {(!daySched.breaks || daySched.breaks.length === 0) ? (
                              <p className="text-[11px] text-slate-400 italic py-1">
                                No break periods configured.
                              </p>
                            ) : (
                              daySched.breaks.map((brk, bIdx) => {
                                const brkKey = brk.id || `brk-${bIdx}`;
                                return (
                                  <div key={brkKey} className="flex items-center space-x-1.5">
                                    <input
                                      type="time"
                                      required
                                      value={brk.start}
                                      onChange={(e) => {
                                        const newWorkingDays = [...scheduleData.workingDays];
                                        newWorkingDays[dayIndex].breaks = (
                                          newWorkingDays[dayIndex].breaks || []
                                        ).map((b, idx) =>
                                          (b.id && b.id === brk.id) || idx === bIdx
                                            ? { ...b, start: e.target.value }
                                            : b
                                        );
                                        setScheduleData({
                                          ...scheduleData,
                                          workingDays: newWorkingDays,
                                        });
                                      }}
                                      className="p-1 border border-slate-300 rounded bg-white text-xs font-mono"
                                    />
                                    <span className="text-slate-400 text-xs">to</span>
                                    <input
                                      type="time"
                                      required
                                      value={brk.end}
                                      onChange={(e) => {
                                        const newWorkingDays = [...scheduleData.workingDays];
                                        newWorkingDays[dayIndex].breaks = (
                                          newWorkingDays[dayIndex].breaks || []
                                        ).map((b, idx) =>
                                          (b.id && b.id === brk.id) || idx === bIdx
                                            ? { ...b, end: e.target.value }
                                            : b
                                        );
                                        setScheduleData({
                                          ...scheduleData,
                                          workingDays: newWorkingDays,
                                        });
                                      }}
                                      className="p-1 border border-slate-300 rounded bg-white text-xs font-mono"
                                    />
                                    <button
                                      type="button"
                                      title="Remove break"
                                      onClick={() => {
                                        const newWorkingDays = [...scheduleData.workingDays];
                                        newWorkingDays[dayIndex].breaks = (
                                          newWorkingDays[dayIndex].breaks || []
                                        ).filter((b, idx) =>
                                          brk.id ? b.id !== brk.id : idx !== bIdx
                                        );
                                        setScheduleData({
                                          ...scheduleData,
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
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSavingSchedule}
              onClick={() => setIsScheduleModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSavingSchedule || isLoadingSchedule}
              onClick={handleSaveDoctorSchedule}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold shadow-md disabled:opacity-50 min-w-[170px] inline-flex items-center justify-center cursor-pointer"
              aria-busy={isSavingSchedule}
            >
              <ButtonLoader isLoading={isSavingSchedule} loadingText="Saving Schedule...">
                Save Schedule & Breaks
              </ButtonLoader>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

