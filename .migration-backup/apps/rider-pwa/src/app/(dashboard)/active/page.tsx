import type { Metadata } from "next";

export const metadata: Metadata = { title: "Active Delivery" };

export default function RiderActivePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-bold text-gray-900">Active Delivery</h1>
            <p className="text-xs text-gray-500">Order #A1B2C3</p>
          </div>
          <span className="text-xs font-medium bg-brand-50 text-brand-700 rounded-full px-3 py-1 animate-pulse">
            In Transit
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm">Live map view</p>
              <p className="text-xs">Integrate Google Maps / Mapbox here</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm">🏪</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">PICKUP</p>
                <p className="text-sm font-semibold text-gray-900">The Burger Joint</p>
                <p className="text-xs text-gray-500">123 Main Street — Order ready</p>
              </div>
            </div>
            <div className="ml-4 border-l-2 border-dashed border-gray-200 h-4" />
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm">📍</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">DROPOFF</p>
                <p className="text-sm font-semibold text-gray-900">Jane Doe</p>
                <p className="text-xs text-gray-500">456 Oak Avenue, Apt 3B</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Order details</h2>
            <span className="text-sm font-bold text-gray-900">$18.50</span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Classic Burger × 1</p>
            <p>Fries × 1</p>
            <p>Coke × 1</p>
          </div>
        </div>

        <button className="w-full rounded-2xl bg-brand-600 py-4 text-base font-bold text-white hover:bg-brand-700 transition-colors">
          Mark as Delivered
        </button>
      </div>
    </div>
  );
}
