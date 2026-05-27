import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl bg-white border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-brand-600">J</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Jane Doe</h1>
              <p className="text-sm text-gray-500">jane@example.com</p>
              <p className="text-xs text-gray-400 mt-0.5">Member since May 2026</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {PROFILE_SECTIONS.map((section) => (
            <div key={section.title} className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {section.title}
                </h2>
              </div>
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PROFILE_SECTIONS = [
  {
    title: "Account",
    items: [
      { icon: "👤", label: "Personal information" },
      { icon: "🏠", label: "Saved addresses" },
      { icon: "💳", label: "Payment methods" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: "🔔", label: "Notifications" },
      { icon: "🌐", label: "Language & region" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: "❓", label: "Help & support" },
      { icon: "📋", label: "Terms of service" },
      { icon: "🔒", label: "Privacy policy" },
    ],
  },
];
