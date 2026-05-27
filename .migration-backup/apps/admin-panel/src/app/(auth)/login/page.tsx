import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin Sign In" };

export default function AdminLoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-gray-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-base">A</span>
            </div>
            <span className="text-xl font-bold text-white">Admin Panel</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Authorized access only</h1>
          <p className="mt-1.5 text-sm text-gray-400">Platform administration and operations</p>
        </div>
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-8">
          <form className="space-y-5" action="#" method="POST">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required placeholder="admin@deliveryos.com"
                className="h-10 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••"
                className="h-10 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
              Sign in securely
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-gray-600">
          Unauthorized access attempts are logged and prosecuted.
        </p>
      </div>
    </main>
  );
}
