"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import type { User } from "@/types";

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, is_commissioner: isCommissioner }),
    });
    if (res.ok) {
      setName("");
      setEmail("");
      setIsCommissioner(false);
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Remove this user?")) return;
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchUsers();
  };

  return (
    <ProtectedRoute requireCommissioner>
      <h1 className="text-2xl font-bold mb-6">Manage Users</h1>

      <form onSubmit={addUser} className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6 flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" required />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" required />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input type="checkbox" checked={isCommissioner} onChange={(e) => setIsCommissioner(e.target.checked)} />
          Commissioner
        </label>
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold transition">Add User</button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-800">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-gray-400">{u.email}</td>
                <td className="px-4 py-2">{u.is_commissioner ? <span className="text-yellow-400">Commissioner</span> : "Member"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProtectedRoute>
  );
}
