import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Orders" };

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My orders</h1>

        <div className="space-y-4">
          {PLACEHOLDER_ORDERS.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl bg-white border border-gray-100 p-5 hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{order.vendorName}</p>
                  <p className="text-sm text-gray-500">{order.date}</p>
                </div>
                <span className={`text-xs font-medium rounded-full px-3 py-1 ${ORDER_STATUS_STYLES[order.status]}`}>
                  {order.statusLabel}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{order.items}</span>
                <span className="font-semibold text-gray-900">{order.total}</span>
              </div>
              {order.status === "in_transit" && (
                <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-brand-500 animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-50 text-green-700",
  in_transit: "bg-brand-50 text-brand-700",
  preparing: "bg-amber-50 text-amber-700",
  cancelled: "bg-red-50 text-red-700",
};

const PLACEHOLDER_ORDERS = [
  {
    id: "1",
    vendorName: "The Burger Joint",
    date: "Today, 2:30 PM",
    status: "in_transit",
    statusLabel: "On the way",
    items: "Classic Burger, Fries, Coke",
    total: "$18.50",
  },
  {
    id: "2",
    vendorName: "Dragon Noodle House",
    date: "Yesterday, 7:15 PM",
    status: "delivered",
    statusLabel: "Delivered",
    items: "Beef Ramen, Spring Rolls",
    total: "$24.00",
  },
  {
    id: "3",
    vendorName: "Margherita Pizzeria",
    date: "May 23, 8:45 PM",
    status: "delivered",
    statusLabel: "Delivered",
    items: "Margherita Pizza (L)",
    total: "$22.00",
  },
];
