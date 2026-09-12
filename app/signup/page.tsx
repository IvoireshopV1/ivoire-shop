"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fullName,
          business_name: role === "seller" ? businessName : null,
          phone,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (role === "seller") {
      router.replace("/seller");
    } else {
      router.replace("/");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4 text-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-md text-gray-900"
      >
        <h1 className="text-2xl font-black mb-6 text-gray-900">Créer un compte</h1>

        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole("buyer")}
            className={`flex-1 py-3 rounded-xl font-bold border-2 transition ${
              role === "buyer"
                ? "bg-black text-white border-black"
                : "bg-white text-gray-900 border-gray-200"
            }`}
          >
            🛍️ Acheteur
          </button>

          <button
            type="button"
            onClick={() => setRole("seller")}
            className={`flex-1 py-3 rounded-xl font-bold border-2 transition ${
              role === "seller"
                ? "bg-black text-white border-black"
                : "bg-white text-gray-900 border-gray-200"
            }`}
          >
            🏪 Vendeur
          </button>
        </div>

        <input
          type="text"
          placeholder="Nom complet"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-xl px-4 py-3 mb-4 outline-none focus:border-black"
        />

        {role === "seller" && (
          <input
            type="text"
            placeholder="Nom de la boutique"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-xl px-4 py-3 mb-4 outline-none focus:border-black"
          />
        )}

        <input
          type="tel"
          placeholder="Téléphone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-xl px-4 py-3 mb-4 outline-none focus:border-black"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-xl px-4 py-3 mb-4 outline-none focus:border-black"
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-xl px-4 py-3 mb-4 outline-none focus:border-black"
        />

        {error && (
          <p className="text-red-600 text-sm mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-4 rounded-xl font-black hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>
    </main>
  );
}