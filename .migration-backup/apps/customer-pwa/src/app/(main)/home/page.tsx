import type { Metadata } from "next";

export const metadata: Metadata = { title: "Discover" };

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8">
          <div className="rounded-2xl bg-brand-600 p-6 text-white">
            <p className="text-sm font-medium text-brand-100 mb-1">Delivering to</p>
            <button className="flex items-center gap-2 text-lg font-semibold hover:text-brand-100 transition-colors">
              <span>Select your location</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </section>

        <section className="mb-8">
          <div className="relative">
            <input
              type="search"
              placeholder="Search for restaurants or dishes..."
              className="w-full h-12 rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none shadow-sm"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Browse categories</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                className="flex flex-col items-center gap-2 rounded-xl bg-white border border-gray-100 p-3 hover:border-brand-200 hover:bg-brand-50 transition-colors"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium text-gray-600">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Popular near you</h2>
            <button className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLACEHOLDER_VENDORS.map((v) => (
              <div key={v.name} className="rounded-2xl bg-white border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-40 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                  <span className="text-4xl">{v.icon}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">{v.name}</h3>
                    <span className="text-xs font-medium bg-green-50 text-green-700 rounded-full px-2 py-0.5">Open</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{v.cuisine}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>⭐ {v.rating}</span>
                    <span>·</span>
                    <span>{v.deliveryTime}</span>
                    <span>·</span>
                    <span>${(v.deliveryFee / 100).toFixed(2)} delivery</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const CATEGORIES = [
  { icon: "🍕", label: "Pizza" },
  { icon: "🍔", label: "Burgers" },
  { icon: "🍜", label: "Noodles" },
  { icon: "🌮", label: "Tacos" },
  { icon: "🍣", label: "Sushi" },
  { icon: "🥗", label: "Salads" },
  { icon: "🍗", label: "Chicken" },
  { icon: "🥤", label: "Drinks" },
];

const PLACEHOLDER_VENDORS = [
  { name: "The Burger Joint", cuisine: "American · Burgers", icon: "🍔", rating: "4.8", deliveryTime: "20-30 min", deliveryFee: 199 },
  { name: "Dragon Noodle House", cuisine: "Chinese · Noodles", icon: "🍜", rating: "4.6", deliveryTime: "25-35 min", deliveryFee: 149 },
  { name: "Margherita Pizzeria", cuisine: "Italian · Pizza", icon: "🍕", rating: "4.9", deliveryTime: "30-45 min", deliveryFee: 299 },
];
