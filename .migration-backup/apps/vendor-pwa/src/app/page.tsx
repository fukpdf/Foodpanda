import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Home",
};

export default function VendorHomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="text-center max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 mb-6">
          <div className="h-2 w-2 rounded-full bg-brand-500" />
          <span className="text-sm font-medium text-brand-700">Vendor Dashboard</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Manage your restaurant
        </h1>
        <p className="text-gray-500 mb-8">
          Accept orders, update your menu, and track performance all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/login"
            className="rounded-xl bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Sign in to dashboard
          </Link>
          <Link
            href="/auth/register"
            className="rounded-xl border border-gray-200 bg-white px-8 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Register your restaurant
          </Link>
        </div>
      </div>
    </main>
  );
}
