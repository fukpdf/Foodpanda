import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overview" };

export default function VendorOverviewPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Good morning, The Burger Joint</h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening today</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className={`text-xs mt-1 font-medium ${stat.positive ? "text-green-600" : "text-red-500"}`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Active orders</h2>
            <span className="text-xs font-medium bg-brand-50 text-brand-700 rounded-full px-2.5 py-1">3 pending</span>
          </div>
          <div className="space-y-3">
            {ACTIVE_ORDERS.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">#{order.id}</p>
                  <p className="text-xs text-gray-500">{order.items}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${order.statusClass}`}>
                    {order.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{order.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Store status</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Accepting orders</p>
              <p className="text-xs text-gray-500">You are currently online</p>
            </div>
            <div className="relative inline-flex items-center">
              <div className="w-11 h-6 bg-brand-600 rounded-full cursor-pointer">
                <div className="absolute top-0.5 right-0.5 bg-white w-5 h-5 rounded-full shadow" />
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between"><span>Prep time</span><span className="font-medium">20 min</span></div>
            <div className="flex justify-between"><span>Delivery radius</span><span className="font-medium">5 km</span></div>
            <div className="flex justify-between"><span>Min. order</span><span className="font-medium">$8.00</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATS = [
  { label: "Today's revenue", value: "$342", change: "+12% vs yesterday", positive: true },
  { label: "Orders today", value: "24", change: "+3 vs yesterday", positive: true },
  { label: "Avg. prep time", value: "18 min", change: "-2 min vs avg", positive: true },
  { label: "Rating", value: "4.8", change: "0.0 this week", positive: true },
];

const ACTIVE_ORDERS = [
  { id: "A1B2", items: "Burger x2, Fries x2", status: "Preparing", statusClass: "bg-amber-50 text-amber-700", time: "5 min ago" },
  { id: "C3D4", items: "Veggie Burger, Shake", status: "New", statusClass: "bg-blue-50 text-blue-700", time: "2 min ago" },
  { id: "E5F6", items: "Double Stack x3", status: "New", statusClass: "bg-blue-50 text-blue-700", time: "Just now" },
];
