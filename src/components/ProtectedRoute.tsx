"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
  requireCommissioner?: boolean;
}

export default function ProtectedRoute({ children, requireCommissioner = false }: Props) {
  const { user, isCommissioner, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    } else if (!isLoading && requireCommissioner && !isCommissioner) {
      router.push("/");
    }
  }, [user, isCommissioner, isLoading, requireCommissioner, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) return null;
  if (requireCommissioner && !isCommissioner) return null;

  return <>{children}</>;
}
