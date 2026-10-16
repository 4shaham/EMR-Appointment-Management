import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Stethoscope, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { Alert } from "../components/Alert";
import { ButtonLoader } from "../components/LoadingSpinner";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Invalid email or password. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 items-center justify-center text-white shadow-xl shadow-sky-500/30 mb-4 ring-4 ring-sky-500/20">
          <Stethoscope className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Pulse<span className="text-sky-400">EMR</span>
        </h2>
        <p className="mt-2 text-sm text-slate-300 font-medium">
          Enterprise Appointment Management Module
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-5">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@emr.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-all cursor-pointer min-h-[42px]"
            >
              <ButtonLoader isLoading={isSubmitting} loadingText="Signing in...">
                <span className="inline-flex items-center">
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </span>
              </ButtonLoader>
            </button>
          </form>

          {/* Demo Credentials Quick-Select (Interview Helper) */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center">
              Quick Login Demo Profiles
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials("admin@emr.com", "Admin@1234")}
                className="flex items-center justify-center p-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("receptionist@emr.com", "Recept@1234")}
                className="flex items-center justify-center p-2 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                Receptionist
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("dr.arjun@emr.com", "Doctor@1234")}
                className="flex items-center justify-center p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
              >
                <Stethoscope className="w-3.5 h-3.5 mr-1" />
                Dr. Arjun (Cardio)
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("dr.priya@emr.com", "Doctor@1234")}
                className="flex items-center justify-center p-2 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 font-medium transition-colors"
              >
                <Stethoscope className="w-3.5 h-3.5 mr-1" />
                Dr. Priya (Ortho)
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          PulseEMR Enterprise Edition • Protected by Dual-Token JWT & RBAC
        </p>
      </div>
    </div>
  );
};
