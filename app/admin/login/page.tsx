"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
const router = useRouter();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const handleLogin = async (e: React.FormEvent) => {
e.preventDefault();


setLoading(true);
setError("");

const { error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  setError("Email ou mot de passe incorrect.");
  setLoading(false);
  return;
}

router.push("/admin");


};

return ( <main className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 flex items-center justify-center px-4 py-10"> <div className="w-full max-w-md">


    <div className="bg-black text-white rounded-t-3xl p-8 text-center shadow-lg">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-yellow-400 flex items-center justify-center text-4xl shadow-lg">
        🇨🇮
      </div>

      <h1 className="text-3xl font-black mt-5">
        Ivoire Shop
      </h1>

      <p className="text-gray-300 mt-2 text-sm font-medium">
        Espace administrateur
      </p>
    </div>

    <div className="bg-white rounded-b-3xl shadow-2xl p-7 md:p-8">

      <div className="mb-7">
        <h2 className="text-2xl font-black text-gray-900">
          Connexion
        </h2>

        <p className="text-gray-600 mt-2 text-sm">
          Connecte-toi pour accéder à ton tableau de bord.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm font-bold">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">

        <div>
          <label
            htmlFor="email"
            className="block text-base font-black text-gray-900 mb-2"
          >
            Adresse email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Entre ton adresse email"
            required
            autoComplete="email"
            className="w-full bg-white text-gray-900 placeholder-gray-400 border-2 border-gray-300 rounded-xl px-4 py-4 text-base font-medium outline-none focus:border-black focus:ring-4 focus:ring-gray-100 transition"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-base font-black text-gray-900 mb-2"
          >
            Mot de passe
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Entre ton mot de passe"
            required
            autoComplete="current-password"
            className="w-full bg-white text-gray-900 placeholder-gray-400 border-2 border-gray-300 rounded-xl px-4 py-4 text-base font-medium outline-none focus:border-black focus:ring-4 focus:ring-gray-100 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-4 rounded-xl text-base font-black hover:bg-gray-800 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>

      </form>

      <div className="mt-7 pt-6 border-t border-gray-200">
        <a
          href="/"
          className="block text-center text-sm font-bold text-gray-600 hover:text-black transition"
        >
          ← Retour à la boutique
        </a>
      </div>

    </div>

    <p className="text-center text-xs text-gray-500 mt-5">
      🔒 Accès réservé à l'administration
    </p>

  </div>
</main>


);
}
