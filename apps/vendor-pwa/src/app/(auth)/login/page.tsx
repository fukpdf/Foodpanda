import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign in" };

export default function VendorLoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-base">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Vendor Portal</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Sign in to your dashboard</h1>
          <p className="mt-1.5 text-sm text-gray-500">Manage orders, menu, and analytics</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <form className="space-y-5" action="#" method="POST">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@restaurant.com"
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••"
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
              Sign in
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          New restaurant?{" "}
          <Link href="/auth/register" className="font-semibold text-brand-600 hover:text-brand-700">Register here</Link>
        </p>
      </div>
    </main>
  );
}
