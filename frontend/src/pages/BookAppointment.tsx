import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { appointmentService } from "../services/appointment.service";
import { doctorService } from "../services/doctor.service";
import { departmentService } from "../services/department.service";
import { patientService } from "../services/patient.service";
import { Doctor, Department, Patient, SlotInfo } from "../types";
import { Alert } from "../components/Alert";
import { LoadingSpinner, Spinner, ButtonLoader } from "../components/LoadingSpinner";

import {
  Calendar,
  Clock,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserPlus,
  Stethoscope,
  Building,
} from "lucide-react";

export const BookAppointment: React.FC = () => {
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().split("T")[0];

  // Metadata
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Form Fields
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(todayStr);
  const [slotTime, setSlotTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  // Patient Mode: "existing" or "new"
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");

  // Existing Patient Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);

  // New Patient Form
  const [newPatient, setNewPatient] = useState({
    name: "",
    mobile: "",
    email: "",
    age: 30,
    gender: "male" as "male" | "female" | "other",
    address: "",
  });

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. Load Departments & Doctors
  useEffect(() => {
    const init = async () => {
      try {
        const [depts, docs] = await Promise.all([
          departmentService.getAll(),
          doctorService.getAll(),
        ]);
        setDepartments(depts);
        setDoctors(docs);
        if (docs.length > 0) {
          setDoctorId(docs[0]._id);
          const dept = (docs[0].departmentId as { _id?: string })?._id || (docs[0].departmentId as string);
          setDepartmentId(dept || "");
        }
      } catch (err) {
        setError("Failed to load clinical metadata.");
      }
    };
    init();
  }, []);

  // 2. Fetch Slots whenever Doctor or Date changes
  useEffect(() => {
    if (!doctorId || !appointmentDate) return;

    const loadSlots = async () => {
      try {
        setIsLoadingSlots(true);
        setSlotTime("");
        const data = await appointmentService.getSlots(doctorId, appointmentDate, departmentId || undefined);
        const freeSlots = data.slots.filter((s) => s.isAvailable);
        setAvailableSlots(freeSlots);
        if (freeSlots.length > 0) {
          setSlotTime(freeSlots[0].time);
        }
      } catch (err: unknown) {
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    loadSlots();
  }, [doctorId, appointmentDate, departmentId]);

  // 3. Search Existing Patients
  const handlePatientSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearchingPatient(true);
      const isNum = /^\d+$/.test(query.trim());
      const isPatId = query.trim().toUpperCase().startsWith("PAT-");

      const params = isPatId
        ? { patientId: query.trim() }
        : isNum
        ? { mobile: query.trim() }
        : { name: query.trim() };

      const patients = await patientService.search(params);
      setSearchResults(patients);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery(`${patient.name} (${patient.patientId})`);
    setSearchResults([]);
  };

  // 4. Handle Department Change (sync with doctor dropdown)
  const handleDepartmentChange = (deptId: string) => {
    setDepartmentId(deptId);
    const docsInDept = deptId
      ? doctors.filter(
          (d) =>
            (d.departmentId as { _id?: string })._id === deptId ||
            d.departmentId === deptId
        )
      : doctors;
    if (docsInDept.length > 0) {
      setDoctorId(docsInDept[0]._id);
    }
  };

  // 5. Handle Booking Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!slotTime) {
      setError("Please select a valid appointment slot time.");
      return;
    }

    if (patientMode === "existing" && !selectedPatient) {
      setError("Please search and select an existing patient record.");
      return;
    }

    if (patientMode === "new") {
      if (!newPatient.name || !newPatient.mobile || !newPatient.age) {
        setError("Please enter the patient's full name, mobile number, and age.");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const payload: Parameters<typeof appointmentService.book>[0] = {
        doctorId,
        departmentId,
        appointmentDate,
        slotTime,
        purpose: purpose || "General Consultation",
      };

      if (patientMode === "existing" && selectedPatient) {
        payload.patientId = selectedPatient._id;
      } else {
        payload.newPatient = {
          name: newPatient.name.trim(),
          mobile: newPatient.mobile.trim(),
          email: newPatient.email?.trim() || undefined,
          age: Number(newPatient.age),
          gender: newPatient.gender,
          address: newPatient.address?.trim() || undefined,
        };
      }

      const booked = await appointmentService.book(payload);
      setSuccess(
        `Appointment successfully booked for ${booked.slotTime} on ${appointmentDate}!`
      );

      // Reset form
      setTimeout(() => {
        navigate("/appointments");
      }, 2000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Booking failed. Please try again or select another slot.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-sky-600" />
          Schedule Patient Appointment
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Supports existing patient record retrieval or seamless automatic registration for new patients
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Patient Information */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center">
              <User className="w-5 h-5 text-sky-600 mr-2" />
              1. Patient Identification
            </h2>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setPatientMode("existing");
                  setError(null);
                }}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  patientMode === "existing"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Existing Patient
              </button>
              <button
                type="button"
                onClick={() => {
                  setPatientMode("new");
                  setError(null);
                }}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  patientMode === "new"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                + New Patient
              </button>
            </div>
          </div>

          {patientMode === "existing" ? (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-600 uppercase">
                Search by Patient ID, Mobile Number, or Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={searchQuery}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                  placeholder="e.g. PAT-000001, 9876543210, or Rahul"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden disabled:bg-slate-100"
                />
                {isSearchingPatient && (
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <Spinner size="xs" color="sky" ariaLabel="Searching patients..." />
                  </div>
                )}
              </div>


              {/* Live search results dropdown */}
              {searchResults.length > 0 && (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white shadow-lg">
                  {searchResults.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className="w-full p-3 text-left hover:bg-sky-50 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                        <div className="text-xs text-slate-500">
                          Mobile: {p.mobile} • Age: {p.age || "N/A"} • Gender: {p.gender || "N/A"}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                        {p.patientId}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedPatient && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold text-emerald-900">
                        {selectedPatient.name}
                      </p>
                      <p className="text-xs text-emerald-700">
                        ID: {selectedPatient.patientId} • Phone: {selectedPatient.mobile}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSearchQuery("");
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* New Patient Form */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    placeholder="e.g. Meera Sharma"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPatient.mobile}
                    onChange={(e) => setNewPatient({ ...newPatient, mobile: e.target.value })}
                    placeholder="9876543210"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={newPatient.age}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, age: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        gender: e.target.value as "male" | "female" | "other",
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newPatient.email}
                    onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                    placeholder="patient@gmail.com"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                  placeholder="Street, City, Postal Code"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Department, Doctor & Date */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center">
            <Building className="w-5 h-5 text-sky-600 mr-2" />
            2. Medical Specialty & Physician
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-sky-500"
              >
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor *
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-sky-500"
              >
                {doctors.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.name} ({doc.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Appointment Date *
              </label>
              <input
                type="date"
                min={todayStr}
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Slot Selection */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center">
              <Clock className="w-5 h-5 text-sky-600 mr-2" />
              3. Available Time Slot
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {availableSlots.length} available slots on this date
            </span>
          </div>

          {isLoadingSlots ? (
            <LoadingSpinner minHeight="min-h-[140px]" message="Checking available slots..." />
          ) : availableSlots.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                No available slots for this doctor on {appointmentDate}. The doctor may not
                be working or all slots are booked.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
              {availableSlots.map((s) => {
                const isSelected = slotTime === s.time;
                return (
                  <button
                    key={s.time}
                    type="button"
                    onClick={() => setSlotTime(s.time)}
                    className={`py-2 px-3 rounded-lg border text-sm font-mono font-bold transition-all text-center ${
                      isSelected
                        ? "bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    {s.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 4: Clinical Purpose */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center">
            <FileText className="w-5 h-5 text-sky-600 mr-2" />
            4. Purpose of Visit
          </h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chief Complaint / Reason for Appointment
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Hypertension check-up, ECG review, Fever"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate("/scheduler")}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !slotTime}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-sm shadow-md disabled:opacity-50 transition-all cursor-pointer flex items-center min-w-[240px] justify-center"
          >
            <ButtonLoader isLoading={isSubmitting} loadingText="Securing Slot & Booking...">
              Confirm & Book Appointment
            </ButtonLoader>
          </button>
        </div>
      </form>
    </div>
  );
};
