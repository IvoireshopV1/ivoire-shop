
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("Erreur changement mot de passe :", error);
      setError(
        "Impossible de modifier le mot de passe. Le lien est peut-être expiré."
      );
      setLoading(false);
      return;
    }

    setMessage("Mot de passe modifié avec succès !");

    setTimeout(() => {
      router.replace("/login");
    }, 1500);

    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4 text-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-md"
      >
        <h1 className="text-2xl font-black mb-2">
          Nouveau mot de passe
        </h1>

        <p className="text-gray-500 text-sm mb-6">
          Choisis un nouveau mot de passe pour ton compte.
        </p>

        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-xl px-4 py-3 mb-4 outline-none focus:border-black"
        />

        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-500 rounded-xl px-4 py-3 mb-4 outline-none focus:border-black"
        />

        {error && (
          <p className="text-red-600 text-sm mb-4">
            {error}
          </p>
        )}

        {message && (
          <p className="text-green-600 text-sm mb-4">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-4 rounded-xl font-black hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading
            ? "Modification..."
            : "Modifier le mot de passe"}
        </button>
      </form>
    </main>
  );
}

