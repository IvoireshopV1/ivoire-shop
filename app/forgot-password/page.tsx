
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) {
      console.error("Erreur récupération mot de passe :", error);
      setError(
        "Impossible d'envoyer le lien. Vérifie l'adresse e-mail."
      );
      setLoading(false);
      return;
    }

    setMessage(
      "Un lien de réinitialisation a été envoyé à ton adresse e-mail."
    );
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4 text-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-md"
      >
        <h1 className="text-2xl font-black mb-2">
          Mot de passe oublié ?
        </h1>

        <p className="text-gray-500 text-sm mb-6">
          Entre ton adresse e-mail pour recevoir un lien de
          réinitialisation.
        </p>

        <input
          type="email"
          placeholder="Ton adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
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
            ? "Envoi..."
            : "Envoyer le lien"}
        </button>

        <div className="text-center mt-5">
          <Link
            href="/login"
            className="text-sm font-bold text-black underline"
          >
            Retour à la connexion
          </Link>
        </div>
      </form>
    </main>
  );
}

