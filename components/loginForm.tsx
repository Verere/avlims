'use client'
import { toast } from "react-toastify";
import React, { useState } from "react";
import Image from "next/image";


const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = "Email is required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) newErrors.email = "Invalid email";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        if (typeof window !== "undefined") {
          window.location.href = "/dashboard";
        }
      } else {
        const data = await res.json();
        toast.error(data.message || "Login failed");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 flex flex-col gap-6 animate-fade-in"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Login form"
    >
      <div className="flex flex-col items-center gap-2">
        {/* <Image src="/logo.svg" alt="App Logo" width={48} height={48} className="mb-2" /> */}
        <svg width="320" height="80" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g>
    <circle cx="32" cy="40" r="24" fill="url(#grad1)" />
    <path d="M32 20 L44 60 L20 60 Z" fill="white" opacity="0.95"/>
    <circle cx="32" cy="28" r="3" fill="#00C9FF"/>
    <circle cx="24" cy="52" r="2.5" fill="#0052D4"/>
    <circle cx="40" cy="52" r="2.5" fill="#00C9FF"/>
    <line x1="32" y1="28" x2="24" y2="52" stroke="#00C9FF" stroke-width="1.5"/>
    <line x1="32" y1="28" x2="40" y2="52" stroke="#0052D4" stroke-width="1.5"/>
  </g>
  <text x="70" y="54" font-family="Inter, Poppins, Arial, sans-serif" font-size="44" font-weight="600" fill="#1A237E" letter-spacing="1">
    av
    <tspan fill="#00C9FF">lims</tspan>
  </text>
  <path d="M92 38 Q94 54 98 38" stroke="#00C9FF" stroke-width="2" fill="none"/>
  <defs>
    <linearGradient id="grad1" x1="8" y1="16" x2="56" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1A237E"/>
      <stop offset="1" stop-color="#00C9FF"/>
    </linearGradient>
  </defs>
</svg>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-500 text-sm">Please enter your details to sign in</p>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.email ? "border-red-500" : "border-gray-300"}`}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            aria-invalid={!!errors.email}
            aria-describedby="email-error"
          />
          {errors.email && <span id="email-error" className="text-xs text-red-500 mt-1">{errors.email}</span>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.password ? "border-red-500" : "border-gray-300"}`}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            aria-invalid={!!errors.password}
            aria-describedby="password-error"
          />
          {errors.password && <span id="password-error" className="text-xs text-red-500 mt-1">{errors.password}</span>}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            className="accent-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          Remember me
        </label>
        <a href="#" className="text-blue-600 text-sm hover:underline focus:underline focus:outline-none transition">Forgot password?</a>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 focus:bg-blue-700 transition flex items-center justify-center gap-2"
        disabled={loading}
      >
        {loading && (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        )}
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {/* <div className="flex items-center gap-2 my-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div> */}
      {/* <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 focus:bg-gray-100 transition"
        >
          <Image src="/google.svg" alt="Google" width={20} height={20} />
          Continue with Google
        </button>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 focus:bg-gray-100 transition"
        >
          <Image src="/apple.svg" alt="Apple" width={20} height={20} />
          Continue with Apple
        </button>
      </div> */}
      <p className="text-center text-sm text-gray-500 mt-4">
        Don&apos;t have an account?{' '}
        <a href="#" className="text-blue-600 hover:underline focus:underline focus:outline-none transition">Sign up</a>
      </p>
    </form>
  );
};

export default LoginForm;
