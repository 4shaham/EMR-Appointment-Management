import React, { useState, useEffect, useMemo } from "react";
import { departmentService } from "../services/department.service";
import { Department } from "../types";
import { LoadingSpinner, Spinner, ButtonLoader } from "../components/LoadingSpinner";
import { Alert } from "../components/Alert";
import { Modal } from "../components/Modal";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Layers,
  RefreshCw,
  Info,
} from "lucide-react";

export const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addIsActive, setAddIsActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);

  // Edit Modal State
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Delete Modal State
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch all departments (including inactive) for admin management
      const data = await departmentService.getAll(true);
      setDepartments(data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to load clinical departments."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Filtered list
  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const matchesSearch =
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dept.description &&
          dept.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? dept.isActive
          : !dept.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [departments, searchQuery, statusFilter]);

  // Summary Metrics
  const totalCount = departments.length;
  const activeCount = departments.filter((d) => d.isActive).length;
  const inactiveCount = totalCount - activeCount;
  const totalDoctors = departments.reduce((acc, d) => acc + (d.doctorCount || 0), 0);

  // Handle Add Department
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    const trimmed = addName.trim();
    if (trimmed.length < 2) {
      setAddFormError("Department name must be at least 2 characters.");
      return;
    }

    // Client-side case-insensitive duplicate check
    const duplicate = departments.find(
      (d) => d.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setAddFormError(
        `A department named "${duplicate.name}" already exists (names are case-insensitive).`
      );
      return;
    }

    try {
      setIsCreating(true);
      const created = await departmentService.create({
        name: trimmed,
        description: addDescription.trim() || undefined,
        isActive: addIsActive,
      });

      setSuccess(`Department "${created.name}" created successfully.`);
      setIsAddModalOpen(false);
      setAddName("");
      setAddDescription("");
      setAddIsActive(true);
      await fetchDepartments();
    } catch (err: unknown) {
      setAddFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to create department."
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setEditName(dept.name);
    setEditDescription(dept.description || "");
    setEditIsActive(dept.isActive);
    setEditFormError(null);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setEditFormError(null);

    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      setEditFormError("Department name must be at least 2 characters.");
      return;
    }

    // Client-side case-insensitive duplicate check excluding self
    const duplicate = departments.find(
      (d) =>
        d._id !== editingDept._id &&
        d.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setEditFormError(
        `Another department named "${duplicate.name}" already exists.`
      );
      return;
    }

    try {
      setIsUpdating(true);
      const updated = await departmentService.update(editingDept._id, {
        name: trimmed,
        description: editDescription.trim(),
        isActive: editIsActive,
      });

      setSuccess(`Department "${updated.name}" updated successfully.`);
      setEditingDept(null);
      await fetchDepartments();
    } catch (err: unknown) {
      setEditFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update department."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (dept: Department) => {
    setDeletingDept(dept);
    setDeleteError(null);
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deletingDept) return;

    if ((deletingDept.doctorCount || 0) > 0) {
      setDeleteError(
        `Cannot delete department "${deletingDept.name}". There are ${deletingDept.doctorCount} doctor(s) assigned to this department. Please reassign them first.`
      );
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await departmentService.delete(deletingDept._id);

      setSuccess(`Department "${deletingDept.name}" deleted successfully.`);
      setDeletingDept(null);
      await fetchDepartments();
    } catch (err: unknown) {
      setDeleteError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to delete department."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Building2 className="w-6 h-6 mr-2.5 text-sky-600" />
            Clinical Department Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure medical specialties, assign clinical staff, and control department availability
          </p>
        </div>

        <button
          onClick={() => {
            setAddFormError(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Department
        </button>
      </div>

      {/* Global Alerts */}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center text-rose-800 text-sm">
            <AlertTriangle className="w-5 h-5 mr-2 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDepartments}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline flex items-center ml-4 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{totalCount}</div>
            <div className="text-xs text-slate-500 font-medium">Total Departments</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-700">{activeCount}</div>
            <div className="text-xs text-slate-500 font-medium">Active Departments</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-700">{inactiveCount}</div>
            <div className="text-xs text-slate-500 font-medium">Inactive Departments</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-purple-700">{totalDoctors}</div>
            <div className="text-xs text-slate-500 font-medium">Assigned Physicians</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by department name..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === "inactive"
                ? "bg-slate-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Main Content Area: Loading, Empty, or List */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 min-h-[300px] flex items-center justify-center">
          <LoadingSpinner message="Loading clinical departments..." size="md" />
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {departments.length === 0
              ? "No Departments Found"
              : "No Matching Departments"}
          </h3>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            {departments.length === 0
              ? "Your hospital has not registered any clinical departments yet. Add your first department (e.g. Cardiology, Pediatrics) to begin onboarding medical doctors."
              : "No departments match your current filter or search criteria."}
          </p>
          {departments.length === 0 ? (
            <button
              onClick={() => {
                setAddFormError(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Department
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="inline-flex items-center px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Department Name</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Assigned Doctors</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepartments.map((dept) => {
                  const doctorCount = dept.doctorCount || 0;
                  return (
                    <tr key={dept._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {dept.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{dept.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 max-w-xs truncate text-slate-500">
                        {dept.description || (
                          <span className="italic text-slate-400">No description provided</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span
                            className={`font-semibold ${
                              doctorCount > 0 ? "text-slate-800" : "text-slate-400"
                            }`}
                          >
                            {doctorCount} {doctorCount === 1 ? "Physician" : "Physicians"}
                          </span>
                          {doctorCount === 0 && (
                            <span className="ml-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Safe to delete
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            dept.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              dept.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {dept.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(dept)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteModal(dept)}
                          className={`inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                            doctorCount > 0
                              ? "text-slate-400 hover:text-amber-700 hover:bg-amber-50"
                              : "text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                          }`}
                          title={
                            doctorCount > 0
                              ? `Cannot delete: ${doctorCount} doctor(s) assigned`
                              : "Delete Department"
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ADD DEPARTMENT MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isCreating && setIsAddModalOpen(false)}
        title="Add New Clinical Department"
        maxWidth="md"
        preventCloseOnBackdrop={isCreating}
      >
        <div className="space-y-4">
          {addFormError && (
            <Alert type="error" message={addFormError} onClose={() => setAddFormError(null)} />
          )}

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                disabled={isCreating}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Cardiology, Neurology, Pediatrics"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Department names must be unique. Duplicate names (ignoring case and surrounding spaces) will be rejected.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                disabled={isCreating}
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="Clinical scope, inpatient/outpatient services..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="block text-xs font-semibold text-slate-700">Department Status</span>
                <span className="text-[11px] text-slate-400">
                  Active departments appear in doctor onboarding and scheduler dropdowns
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isCreating}
                  checked={addIsActive}
                  onChange={(e) => setAddIsActive(e.target.checked)}
                  className="sr-only peer disabled:cursor-not-allowed"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isCreating}
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center justify-center min-w-[140px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-busy={isCreating}
              >
                <ButtonLoader isLoading={isCreating} loadingText="Creating...">
                  Create Department
                </ButtonLoader>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── EDIT DEPARTMENT MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={!!editingDept}
        onClose={() => !isUpdating && setEditingDept(null)}
        title="Edit Clinical Department"
        maxWidth="md"
        preventCloseOnBackdrop={isUpdating}
      >
        <div className="space-y-4">
          {editFormError && (
            <Alert type="error" message={editFormError} onClose={() => setEditFormError(null)} />
          )}

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department Name *
              </label>
              <input
                type="text"
                required
                disabled={isUpdating}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                disabled={isUpdating}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="block text-xs font-semibold text-slate-700">Department Status</span>
                <span className="text-[11px] text-slate-400">
                  Active departments appear in doctor onboarding and scheduling
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isUpdating}
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="sr-only peer disabled:cursor-not-allowed"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setEditingDept(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center justify-center min-w-[130px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-busy={isUpdating}
              >
                <ButtonLoader isLoading={isUpdating} loadingText="Saving...">
                  Save Changes
                </ButtonLoader>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── DELETE CONFIRMATION MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={!!deletingDept}
        onClose={() => !isDeleting && setDeletingDept(null)}
        title={
          deletingDept
            ? (deletingDept.doctorCount || 0) > 0
              ? "Department Deletion Blocked"
              : `Delete "${deletingDept.name}"?`
            : "Delete Department"
        }
        maxWidth="md"
        preventCloseOnBackdrop={isDeleting}
      >
        {deletingDept && (
          <div className="space-y-4">
            {deleteError && (
              <Alert type="error" message={deleteError} onClose={() => setDeleteError(null)} />
            )}

            {(deletingDept.doctorCount || 0) > 0 ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed space-y-2">
                  <div className="font-bold flex items-center text-amber-800">
                    <Info className="w-4 h-4 mr-1.5 shrink-0" />
                    Doctor Reference Protection Active
                  </div>
                  <p>
                    There are currently{" "}
                    <strong>{deletingDept.doctorCount} doctor(s)</strong> assigned
                    to the <strong>"{deletingDept.name}"</strong> department.
                  </p>
                  <p>
                    Hospital data integrity prohibits deleting departments with assigned doctors. You must reassign or remove these physicians in the Admin Suite before this department can be deleted.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingDept(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold cursor-pointer"
                  >
                    Understood
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to permanently delete the{" "}
                  <strong>"{deletingDept.name}"</strong> department? This action cannot be undone.
                </p>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDeletingDept(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center justify-center min-w-[140px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-busy={isDeleting}
                  >
                    <ButtonLoader isLoading={isDeleting} loadingText="Deleting...">
                      Confirm Delete
                    </ButtonLoader>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
