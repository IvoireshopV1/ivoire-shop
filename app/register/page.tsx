"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!fullName.trim()) {
      setErrorMessage("Veuillez entrer votre nom complet.");
      return;
    }

    if (!phone.trim()) {
      setErrorMessage("Veuillez entrer votre numéro de téléphone.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Veuillez entrer votre adresse email.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Le mot de passe doit contenir au moins 6 caractères."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        setErrorMessage(authError.message);
        return;
      }

      if (!authData.user) {
        setErrorMessage(
          "Impossible de créer le compte. Veuillez réessayer."
        );
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: authData.user.id,
            role: "buyer",
            full_name: fullName.trim(),
            phone: phone.trim(),
            business_name: null,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        console.error(
          "Erreur création profil :",
          profileError
        );

        setErrorMessage(
          "Le compte a été créé, mais le profil n'a pas pu être enregistré."
        );

        return;
      }

      setSuccessMessage(
        "🎉 Compte créé avec succès ! Bienvenue sur Ivoire Shop."
      );

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("Erreur inscription :", error);

      setErrorMessage(
        "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black px-4 py-8 sm:py-12">

      {/* Barre supérieure */}
      <div className="max-w-6xl mx-auto mb-8">
        <button
          onClick={() => router.push("/")}
          className="text-white/80 hover:text-white font-semibold transition flex items-center gap-2"
        >
          <span className="text-xl">←</span>
          Retour à la boutique
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">

        {/* ========================= */}
        {/* PARTIE GAUCHE */}
        {/* ========================= */}

        <section className="hidden lg:block text-white px-4">

          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-sm font-semibold">
              Marketplace ivoirienne
            </span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-black leading-tight">
            Bienvenue sur
            <span className="block text-yellow-400 mt-2">
              🇨🇮 Ivoire Shop
            </span>
          </h1>

          <p className="text-gray-300 text-lg mt-6 max-w-xl leading-relaxed">
            Crée ton compte gratuitement et découvre une nouvelle
            façon d'acheter et de vendre en Côte d'Ivoire.
          </p>

          {/* Avantages */}
          <div className="mt-8 space-y-4">

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-black flex items-center justify-center text-xl">
                🛍️
              </div>

              <div>
                <h3 className="font-bold text-lg">
                  Achète facilement
                </h3>

                <p className="text-gray-400 text-sm">
                  Découvre des produits proposés par des vendeurs locaux.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-500 text-white flex items-center justify-center text-xl">
                🔒
              </div>

              <div>
                <h3 className="font-bold text-lg">
                  Ton compte est sécurisé
                </h3>

                <p className="text-gray-400 text-sm">
                  Tes informations sont protégées.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center text-xl">
                🚀
              </div>

              <div>
                <h3 className="font-bold text-lg">
                  Deviens vendeur
                </h3>

                <p className="text-gray-400 text-sm">
                  Tu pourras transformer ton compte en compte vendeur.
                </p>
              </div>
            </div>

          </div>

          {/* Bandeau */}
          <div className="mt-10 bg-gradient-to-r from-yellow-400 to-yellow-300 text-black rounded-3xl p-6 shadow-xl">

            <div className="flex items-center gap-4">
              <div className="text-4xl">
                🇨🇮
              </div>

              <div>
                <p className="font-black text-xl">
                  Une marketplace pensée pour la Côte d'Ivoire
                </p>

                <p className="text-sm mt-1 font-medium">
                  Achète. Vends. Développe ton activité.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ========================= */}
        {/* FORMULAIRE */}
        {/* ========================= */}

        <section className="w-full">

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 px-6 sm:px-8 py-7">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-bold text-black/60 uppercase tracking-wider">
                    Ivoire Shop
                  </p>

                  <h2 className="text-3xl font-black text-black mt-1">
                    Créer un compte
                  </h2>

                  <p className="text-black/70 mt-1">
                    C'est gratuit et rapide.
                  </p>
                </div>

                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  🇨🇮
                </div>

              </div>

            </div>

            {/* Formulaire */}
            <div className="p-6 sm:p-8">

              <form
                onSubmit={handleRegister}
                className="space-y-5"
              >

                {/* Nom */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    👤 Nom complet
                  </label>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) =>
                      setFullName(e.target.value)
                    }
                    placeholder="Ex : Kouassi Jean"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-gray-900 font-medium outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    📱 Numéro de téléphone
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    placeholder="Ex : 07 12 34 56 78"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-gray-900 font-medium outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    ✉️ Adresse email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="exemple@email.com"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-gray-900 font-medium outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    🔐 Mot de passe
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Minimum 6 caractères"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-gray-900 font-medium outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                  />

                  <p className="text-xs text-gray-500 mt-2">
                    Utilise au moins 6 caractères.
                  </p>
                </div>

                {/* Confirmation */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    🔒 Confirmer le mot de passe
                  </label>

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Retape ton mot de passe"
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-gray-900 font-medium outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                  />
                </div>

                {/* Erreur */}
                {errorMessage && (
                  <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl px-4 py-4 font-medium text-sm">
                    {errorMessage}
                  </div>
                )}

                {/* Succès */}
                {successMessage && (
                  <div className="bg-green-50 border-2 border-green-200 text-green-700 rounded-2xl px-4 py-4 font-medium text-sm">
                    {successMessage}
                  </div>
                )}

                {/* Bouton */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white rounded-2xl py-4 font-black text-lg hover:bg-gray-800 active:scale-[0.99] transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "⏳ Création du compte..."
                    : "🚀 Créer mon compte"}
                </button>

              </form>

              {/* Séparateur */}
              <div className="flex items-center gap-3 my-7">
                <div className="h-px bg-gray-200 flex-1"></div>

                <span className="text-xs text-gray-400 font-semibold">
                  DÉJÀ MEMBRE ?
                </span>

                <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              {/* Connexion */}
              <button
                onClick={() => router.push("/login")}
                className="w-full border-2 border-gray-200 text-gray-900 rounded-2xl py-4 font-bold hover:border-black hover:bg-gray-50 transition"
              >
                🔑 Se connecter
              </button>

              {/* Retour */}
              <button
                onClick={() => router.push("/")}
                className="w-full mt-4 text-gray-500 hover:text-black font-semibold text-sm transition"
              >
                ← Retourner à Ivoire Shop
              </button>

              {/* Sécurité */}
              <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  🔒 Tes informations sont protégées
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  En créant ton compte, tu rejoins la communauté
                  Ivoire Shop.
                </p>
              </div>

            </div>
          </div>

        </section>

      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto text-center mt-10">
        <p className="text-gray-500 text-sm">
          🇨🇮 Ivoire Shop — Achetez local, vendez plus.
        </p>
      </div>

    </main>
  );
}