import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Home",
};

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">D</span>
              </div>
              <span className="text-lg font-bold text-gray-900">DeliveryOS</span>
            </div>
            <nav className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
              >
                Get started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 mb-6">
            <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-sm font-medium text-brand-700">Customer App</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-4">
            Food you love,{" "}
            <span className="text-brand-600">delivered fast</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 leading-relaxed">
            Order from the best local restaurants around you. Track your
            delivery in real time, every time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
            >
              Start ordering
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto rounded-xl border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>DeliveryOS Customer App &mdash; Architecture Foundation v0.1</p>
      </footer>
    </main>
  );
}
