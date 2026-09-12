"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = {
  full_name: string | null;
  role: string;
};

export default function AccountMenu() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);

  const loadProfile = async () => {
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", authData.user.id)
      .single();

    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.replace("/");
  };

  if (loading) {
    return <div className="h-8 w-8" />;
  }

  if (!profile) {
    return (
      <div className="flex gap-4 text-sm">
        <Link href="/login" className="hover:underline">
          Se connecter
        </Link>
        <Link href="/signup" className="hover:underline">
          Créer un compte
        </Link>
      </div>
    );
  }

  const initial = (profile.full_name || "?").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-yellow-400 text-black font-black flex items-center justify-center"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white text-gray-900 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-sm truncate">
              {profile.full_name || "Mon compte"}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {profile.role === "seller" ? "Vendeur" : "Acheteur"}
            </p>
          </div>

          {profile.role === "seller" && (
            <Link
              href="/seller"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm hover:bg-gray-50"
            >
              🏪 Mon dashboard vendeur
            </Link>
          )}

          {profile.role === "buyer" && (
            <Link
              href="/mes-commandes"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm hover:bg-gray-50"
            >
              📦 Mes commandes
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
          >
            🚪 Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}