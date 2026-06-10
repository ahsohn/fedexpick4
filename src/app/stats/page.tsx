"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function StatsPage() {
  return (
    <ProtectedRoute>
      <h1 className="text-2xl font-bold mb-4">Stats & Analytics</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400">Stats page coming soon.</p>
        <p className="text-gray-500 text-sm mt-2">
          Track best weeks, popular picks, head-to-head comparisons, and more.
        </p>
      </div>
    </ProtectedRoute>
  );
}
