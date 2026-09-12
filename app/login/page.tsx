
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        console.error("Erreur connexion :", loginError);
        setError("Email ou mot de passe incorrect.");
        return;
      }

      if (!data.user) {
        setError("Impossible de récupérer votre compte.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      console.log("Utilisateur connecté :", data.user.id);
      console.log("Profil :", profile);
      console.log("Erreur profil :", profileError);

      if (profileError) {
        console.error("Erreur récupération profil :", profileError);
        setError(
          "Connexion réussie, mais impossible de récupérer votre profil."
        );
        return;
      }

      if (!profile) {
        setError("Votre profil vendeur n'existe pas encore.");
        return;
      }

      if (profile.role === "seller") {
        router.replace("/seller");
        return;
      }

      if (profile.role === "admin") {
        router.replace("/admin");
        return;
      }

      router.replace("/");
    } catch (err) {
      console.error("Erreur inattendue :", err);
      setError("Une erreur est survenue. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4 text-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-md"
      >
        <h1 className="text-2xl font-black mb-6">
          Se connecter
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-xl px-4 py-3 mb-4 outline-none focus:border-black"
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-xl px-4 py-3 mb-2 outline-none focus:border-black"
        />

        <div className="text-right mb-4">
          <a
            href="/forgot-password"
            className="text-sm font-bold text-black underline"
          >
            Mot de passe oublié ?
          </a>
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-4 rounded-xl font-black hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Pas encore de compte ?{" "}
          <a
            href="/signup"
            className="font-bold text-black underline"
          >
            S'inscrire
          </a>
        </p>
      </form>
    </main>
  );
}

