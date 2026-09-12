
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SellerProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState("");
  const [avatar, setAvatar] = useState("🧑🏾‍💼");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const avatars = [
    "🧑🏾‍💼",
    "👨🏾‍💼",
    "👩🏾‍💼",
    "🏪",
    "🛍️",
    "⭐",
    "🇨🇮",
  ];

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      setEmail(authData.user.email || "");

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "role, full_name, phone, business_name, description, location, hours, avatar"
          )
          .eq("id", authData.user.id)
          .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "seller"
      ) {
        router.replace("/");
        return;
      }

      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setBusinessName(profile.business_name || "");
      setDescription(profile.description || "");
      setLocation(profile.location || "");
      setHours(profile.hours || "");
      setAvatar(profile.avatar || "🧑🏾‍💼");

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSave = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    const { data: authData } =
      await supabase.auth.getUser();

    if (!authData.user) {
      setError("Session expirée. Reconnecte-toi.");
      setSaving(false);
      return;
    }

    const { error: updateError } =
      await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          business_name: businessName.trim(),
          description: description.trim(),
          location: location.trim(),
          hours: hours.trim(),
          avatar,
        })
        .eq("id", authData.user.id);

    if (updateError) {
      console.error(updateError);

      setError(
        "Impossible d'enregistrer les modifications. Vérifie que les nouveaux champs existent dans Supabase."
      );

      setSaving(false);
      return;
    }

    setMessage(
      "Vos informations ont été enregistrées avec succès."
    );

    setSaving(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f6f8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />

          <p className="font-bold text-gray-600">
            Chargement de votre profil...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-gray-900">

      {/* HEADER */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">

          <button
            onClick={() => router.push("/seller")}
            className="text-sm font-bold text-gray-500 hover:text-black transition"
          >
            ← Retour au dashboard
          </button>

          <div className="text-sm font-black">
            🇨🇮 Ivoire Shop
          </div>

        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">

        {/* TITRE */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-wider text-gray-400">
            Espace vendeur
          </p>

          <h1 className="text-3xl sm:text-4xl font-black mt-2">
            Mon profil
          </h1>

          <p className="text-gray-500 mt-2">
            Présentez votre boutique et rassurez vos futurs clients.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">

          {/* COLONNE PRINCIPALE */}
          <form onSubmit={handleSave}>

            {/* IDENTITE */}
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">

              <div className="mb-6">
                <h2 className="text-xl font-black">
                  Identité du vendeur
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Ces informations permettent aux clients de mieux vous connaître.
                </p>
              </div>

              {/* AVATAR */}
              <div className="mb-7">

                <label className="block text-sm font-black mb-3">
                  Photo / avatar du vendeur
                </label>

                <div className="flex flex-wrap items-center gap-4">

                  <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center text-5xl">
                    {avatar}
                  </div>

                  <div>
                    <p className="text-sm font-bold mb-3">
                      Choisissez votre avatar
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {avatars.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setAvatar(item)}
                          className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center border-2 transition ${
                            avatar === item
                              ? "border-black bg-gray-100 scale-105"
                              : "border-gray-100 bg-white hover:bg-gray-50"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs text-gray-400 mt-3">
                      La photo réelle pourra être ajoutée prochainement.
                    </p>
                  </div>

                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">

                {/* NOM */}
                <div>
                  <label className="block text-sm font-black mb-2">
                    Nom complet
                  </label>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) =>
                      setFullName(e.target.value)
                    }
                    placeholder="Votre nom complet"
                    className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-black transition"
                  />
                </div>

                {/* TELEPHONE */}
                <div>
                  <label className="block text-sm font-black mb-2">
                    Téléphone
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    placeholder="Ex : 0700000000"
                    className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-black transition"
                  />
                </div>

                {/* EMAIL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-black mb-2">
                    Adresse e-mail
                  </label>

                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full border-2 border-gray-100 bg-gray-100 text-gray-500 rounded-xl px-4 py-3 cursor-not-allowed"
                  />

                  <p className="text-xs text-gray-400 mt-2">
                    L'adresse e-mail est gérée par votre compte.
                  </p>
                </div>

              </div>

            </section>

            {/* BOUTIQUE */}
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">

              <div className="mb-6">
                <h2 className="text-xl font-black">
                  Ma boutique
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Ces informations seront visibles par les clients.
                </p>
              </div>

              {/* NOM BOUTIQUE */}
              <div className="mb-5">

                <label className="block text-sm font-black mb-2">
                  Nom de la boutique
                </label>

                <input
                  type="text"
                  value={businessName}
                  onChange={(e) =>
                    setBusinessName(e.target.value)
                  }
                  placeholder="Ex : Boutique Alpha CI"
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-black transition"
                />

              </div>

              {/* DESCRIPTION */}
              <div className="mb-5">

                <label className="block text-sm font-black mb-2">
                  Présentation de la boutique
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Présentez votre boutique, vos produits et votre spécialité..."
                  rows={5}
                  maxLength={500}
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-black transition resize-none"
                />

                <p className="text-xs text-gray-400 mt-2">
                  {description.length}/500 caractères
                </p>

              </div>

              <div className="grid md:grid-cols-2 gap-5">

                {/* LOCALISATION */}
                <div>

                  <label className="block text-sm font-black mb-2">
                    📍 Ville / commune
                  </label>

                  <input
                    type="text"
                    value={location}
                    onChange={(e) =>
                      setLocation(e.target.value)
                    }
                    placeholder="Ex : Abidjan, Cocody"
                    className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-black transition"
                  />

                </div>

                {/* HORAIRES */}
                <div>

                  <label className="block text-sm font-black mb-2">
                    🕐 Horaires
                  </label>

                  <input
                    type="text"
                    value={hours}
                    onChange={(e) =>
                      setHours(e.target.value)
                    }
                    placeholder="Ex : Lun-Sam, 08h-18h"
                    className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl px-4 py-3 outline-none focus:border-black transition"
                  />

                </div>

              </div>

            </section>

            {/* MESSAGES */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 mb-5 text-sm font-medium">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-100 text-green-700 rounded-2xl p-4 mb-5 text-sm font-medium">
                ✓ {message}
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex flex-col sm:flex-row gap-3">

              <button
                type="submit"
                disabled={saving}
                className="bg-black text-white px-7 py-4 rounded-xl font-black hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/seller")}
                className="bg-white border border-gray-200 px-7 py-4 rounded-xl font-black hover:bg-gray-50 transition"
              >
                Annuler
              </button>

            </div>

          </form>

          {/* APERCU CLIENT */}
          <aside className="lg:sticky lg:top-6 h-fit">

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

              <div className="bg-black text-white px-6 py-5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Aperçu client
                </p>

                <h2 className="text-lg font-black mt-1">
                  Votre fiche vendeur
                </h2>
              </div>

              <div className="p-6">

                {/* AVATAR */}
                <div className="flex items-center gap-4 mb-5">

                  <div className="w-20 h-20 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center text-4xl">
                    {avatar}
                  </div>

                  <div className="min-w-0">

                    <h3 className="font-black text-lg truncate">
                      {businessName || "Nom de votre boutique"}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {fullName || "Nom du vendeur"}
                    </p>

                  </div>

                </div>

                {/* CONFIANCE */}
                <div className="flex items-center gap-2 mb-5">

                  <span className="bg-green-100 text-green-700 text-xs font-black px-3 py-1.5 rounded-full">
                    ✓ Vendeur
                  </span>

                  <span className="text-sm font-bold">
                    ⭐ Nouveau
                  </span>

                </div>

                {/* DESCRIPTION */}
                <div className="border-t border-gray-100 pt-5">

                  <p className="text-sm text-gray-600 leading-6">
                    {description ||
                      "La présentation de votre boutique apparaîtra ici pour rassurer vos clients."}
                  </p>

                </div>

                {/* INFOS */}
                <div className="border-t border-gray-100 mt-5 pt-5 space-y-3">

                  <div className="flex items-center gap-3 text-sm">
                    <span>📍</span>
                    <span className="font-medium text-gray-600">
                      {location || "Votre localisation"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <span>🕐</span>
                    <span className="font-medium text-gray-600">
                      {hours || "Vos horaires"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <span>📞</span>
                    <span className="font-medium text-gray-600">
                      {phone || "Votre téléphone"}
                    </span>
                  </div>

                </div>

                {/* PRODUITS */}
                <div className="border-t border-gray-100 mt-5 pt-5">

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-gray-500">
                      Produits
                    </span>

                    <span className="font-black">
                      Votre boutique
                    </span>

                  </div>

                </div>

              </div>

            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-4">

              <p className="text-sm font-bold text-blue-900">
                💡 Conseil
              </p>

              <p className="text-xs text-blue-700 mt-1 leading-5">
                Plus votre profil est complet, plus les clients auront
                confiance avant de commander.
              </p>

            </div>

          </aside>

        </div>

      </div>
    </main>
  );
}

