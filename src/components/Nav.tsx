"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";

export default function Nav() {
  const { user, isCommissioner, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const links = [
    { href: "/", label: "Home" },
    { href: "/picks", label: "Picks" },
    { href: "/standings", label: "Standings" },
    { href: "/results", label: "Results" },
    { href: "/history", label: "History" },
    { href: "/stats", label: "Stats" },
  ];

  if (isCommissioner) {
    links.push({ href: "/admin", label: "Admin" });
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/" className="text-white font-bold text-lg mr-4">
            FedEx Pick 4
          </Link>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded text-sm transition ${
                pathname === link.href
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">{user.name}</span>
          <button
            onClick={logout}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
