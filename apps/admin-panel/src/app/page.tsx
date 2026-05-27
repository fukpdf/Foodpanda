import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Home",
};

export default function AdminHomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="text-center max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 mb-6">
          <div className="h-2 w-2 rounded-full bg-brand-600" />
          <span className="text-sm font-medium text-brand-700">Admin Panel</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Platform Operations
        </h1>
        <p className="text-gray-500 mb-8">
          Manage vendors, riders, orders, and platform configuration. Authorized personnel only.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex rounded-xl bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Admin sign in
        </Link>
      </div>
    </main>
  );
}
