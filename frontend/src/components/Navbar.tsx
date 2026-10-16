import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Clock,
  PlusCircle,
  ListFilter,
  Shield,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Activity,
  Building2,
  ChevronDown,
  Users,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const adminDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        adminDropdownRef.current &&
        !adminDropdownRef.current.contains(e.target as Node)
      ) {
        setIsAdminDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown and mobile menu on route change
  useEffect(() => {
    setIsAdminDropdownOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Primary operational nav items
  const primaryNavItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <Activity className="w-4 h-4 mr-1.5" />,
      roles: ["super_admin", "receptionist", "doctor"],
    },
    {
      label: "Scheduler",
      path: "/scheduler",
      icon: <Clock className="w-4 h-4 mr-1.5" />,
      roles: ["super_admin", "receptionist", "doctor"],
    },
    {
      label: "Book",
      path: "/book",
      icon: <PlusCircle className="w-4 h-4 mr-1.5" />,
      roles: ["super_admin", "receptionist"],
    },
    {
      label: "Appointments",
      path: "/appointments",
      icon: <ListFilter className="w-4 h-4 mr-1.5" />,
      roles: ["super_admin", "receptionist", "doctor"],
    },
  ];

  // Administration items (grouped for super_admin)
  const adminItems = [
    {
      label: "Admin Suite",
      description: "Physicians, schedules, staff & audit trail",
      path: "/admin",
      icon: <Shield className="w-4 h-4 text-purple-600" />,
    },
    {
      label: "Departments",
      description: "Clinical specialties & doctor assignments",
      path: "/departments",
      icon: <Building2 className="w-4 h-4 text-sky-600" />,
    },
  ];

  const filteredPrimaryItems = primaryNavItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const isAdminActive =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/departments");

  const roleLabels: Record<string, { label: string; badge: string }> = {
    super_admin: { label: "Super Admin", badge: "bg-purple-100 text-purple-700 border-purple-200" },
    receptionist: { label: "Receptionist", badge: "bg-sky-100 text-sky-700 border-sky-200" },
    doctor: { label: "Doctor", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="flex items-center space-x-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Pulse<span className="text-sky-600">EMR</span>
                </span>
                <span className="hidden xl:inline-block ml-2 text-xs font-medium text-slate-400 border-l border-slate-200 pl-2">
                  Clinical Scheduling
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex md:items-center md:space-x-1">
              {filteredPrimaryItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sky-50 text-sky-700 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}

              {/* Super Admin Administration Dropdown */}
              {user?.role === "super_admin" && (
                <div className="relative" ref={adminDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsAdminDropdownOpen((prev) => !prev)}
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isAdminActive
                        ? "bg-purple-50 text-purple-700 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                    aria-expanded={isAdminDropdownOpen}
                    aria-haspopup="true"
                  >
                    <Shield className="w-4 h-4 mr-1.5 text-purple-600" />
                    <span>Administration</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 ml-1 transition-transform duration-150 ${
                        isAdminDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isAdminDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        Hospital Administration
                      </div>
                      {adminItems.map((item) => {
                        const isCurrent = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsAdminDropdownOpen(false)}
                            className={`flex items-start px-3.5 py-2.5 text-sm transition-colors ${
                              isCurrent
                                ? "bg-purple-50/80 text-purple-900 font-medium"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className="mt-0.5 mr-3 shrink-0">{item.icon}</span>
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                                {item.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="hidden md:flex items-center space-x-3 shrink-0">
            {user && (
              <div className="flex items-center space-x-3 border-r border-slate-200 pr-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {user.name}
                  </div>
                  <div className="flex justify-end mt-0.5">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        roleLabels[user.role]?.badge || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {roleLabels[user.role]?.label || user.role}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sky-600 text-xs shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-2 pb-4 space-y-1">
          {user && (
            <div className="py-2.5 mb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${
                  roleLabels[user.role]?.badge || "bg-slate-100 text-slate-700"
                }`}
              >
                {roleLabels[user.role]?.label || user.role}
              </span>
            </div>
          )}

          {/* Primary Items */}
          {filteredPrimaryItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-sky-50 text-sky-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}

          {/* Administration Section on Mobile */}
          {user?.role === "super_admin" && (
            <div className="pt-2 border-t border-slate-100">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-700">
                Administration
              </div>
              {adminItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-purple-50 text-purple-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
