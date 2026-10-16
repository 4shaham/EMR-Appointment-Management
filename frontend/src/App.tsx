import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navbar } from "./components/Navbar";

// Pages
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Scheduler } from "./pages/Scheduler";
import { BookAppointment } from "./pages/BookAppointment";
import { Appointments } from "./pages/Appointments";
import { Admin } from "./pages/Admin";
import { Departments } from "./pages/Departments";


const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Enterprise EMR Appointment Management System • Production Ready
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (All Authenticated Roles) */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/scheduler"
              element={
                <AppLayout>
                  <Scheduler />
                </AppLayout>
              }
            />
            <Route
              path="/appointments"
              element={
                <AppLayout>
                  <Appointments />
                </AppLayout>
              }
            />
          </Route>

          {/* Protected Routes (Receptionist & Super Admin) */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "receptionist"]} />}>
            <Route
              path="/book"
              element={
                <AppLayout>
                  <BookAppointment />
                </AppLayout>
              }
            />
          </Route>

          {/* Protected Routes (Super Admin Only) */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
            <Route
              path="/departments"
              element={
                <AppLayout>
                  <Departments />
                </AppLayout>
              }
            />
            <Route
              path="/admin"
              element={
                <AppLayout>
                  <Admin />
                </AppLayout>
              }
            />
          </Route>


          {/* Default Redirection */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
