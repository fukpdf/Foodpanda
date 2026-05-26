import type { Metadata } from "next";

export const metadata: Metadata = { title: "Platform Overview" };

export default function AdminOverviewPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time platform metrics and operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PLATFORM_STATS.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-gray-500">{stat.label}</p>
              <span className={`h-2 w-2 rounded-full ${stat.live ? "bg-green-400 animate-pulse" : "bg-gray-300"}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className={`text-xs mt-1 font-medium ${stat.positive ? "text-green-600" : "text-red-500"}`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Active services</h2>
          <div className="space-y-3">
            {SERVICES.map((svc) => (
              <div key={svc.name} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${svc.healthy ? "bg-green-400" : "bg-red-400"}`} />
                  <span className="text-sm font-medium text-gray-700">{svc.name}</span>
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-500">
                  <span>P50: {svc.p50}</span>
                  <span>P99: {svc.p99}</span>
                  <span className={svc.healthy ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                    {svc.uptime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Quick actions</h2>
          <div className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                className="flex w-full items-center gap-3 rounded-xl hover:bg-gray-50 px-3 py-2.5 transition-colors text-left"
              >
                <span className="text-lg">{action.icon}</span>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const PLATFORM_STATS = [
  { label: "Active orders", value: "1,247", change: "+18% vs last hour", positive: true, live: true },
  { label: "Online riders", value: "342", change: "+23 in last 10 min", positive: true, live: true },
  { label: "Active vendors", value: "891", change: "94% of registered", positive: true, live: false },
  { label: "GMV today", value: "$84.2k", change: "+31% vs yesterday", positive: true, live: false },
];

const SERVICES = [
  { name: "API Gateway", p50: "12ms", p99: "48ms", uptime: "99.98%", healthy: true },
  { name: "Auth Service", p50: "8ms", p99: "32ms", uptime: "99.99%", healthy: true },
  { name: "Order Service", p50: "24ms", p99: "95ms", uptime: "99.97%", healthy: true },
  { name: "Dispatch Service", p50: "18ms", p99: "71ms", uptime: "99.95%", healthy: true },
  { name: "Payment Service", p50: "340ms", p99: "890ms", uptime: "99.90%", healthy: true },
  { name: "Notification Service", p50: "15ms", p99: "60ms", uptime: "99.99%", healthy: true },
];

const QUICK_ACTIONS = [
  { icon: "🏪", label: "Approve vendor registrations" },
  { icon: "🚴", label: "Manage rider fleet" },
  { icon: "📦", label: "Review flagged orders" },
  { icon: "💰", label: "Process refunds" },
  { icon: "📊", label: "View analytics" },
  { icon: "⚙️", label: "Platform settings" },
];
