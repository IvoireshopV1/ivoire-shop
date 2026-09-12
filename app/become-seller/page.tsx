
"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Plan = "pro" | "premium";

export default function BecomeSellerPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] =
    useState("");

  const [plan, setPlan] =
    useState<Plan>("premium");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // CHARGER LE COMPTE
  // =====================================================

  useEffect(() => {
    const loadAccount = async () => {
      try {
        setLoading(true);

        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (
          authError ||
          !authData.user
        ) {
          router.replace("/login");
          return;
        }

        const user = authData.user;

        setUserId(user.id);
        setEmail(user.email || "");

        const {
          data: profile,
        } = await supabase
          .from("profiles")
          .select(
            "role, full_name, phone, business_name"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role === "seller") {
          router.replace("/seller");
          return;
        }

        setFullName(
          profile?.full_name || ""
        );

        setPhone(
          profile?.phone || ""
        );

        setBusinessName(
          profile?.business_name || ""
        );
      } catch (err) {
        console.error(err);

        setError(
          "Impossible de charger votre compte."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, [router]);

  // =====================================================
  // FORMULES
  // =====================================================

  const plans = {
    pro: {
      name: "Pro",
      price: 3000,
      icon: "🚀",
      color:
        "from-blue-500 to-indigo-600",
      features: [
        "Votre boutique vendeur",
        "Ajout illimité de produits",
        "Gestion des stocks",
        "Gestion des commandes",
        "Tableau de bord vendeur",
        "Support Ivoire Shop",
      ],
    },

    premium: {
      name: "Premium",
      price: 5000,
      icon: "👑",
      color:
        "from-yellow-400 to-orange-500",
      features: [
        "Tout le contenu du plan Pro",
        "Mise en avant des produits",
        "Meilleure visibilité",
        "Outils commerciaux avancés",
        "Priorité support",
        "Badge vendeur Premium",
      ],
    },
  };

  const selectedPlan =
    plans[plan];

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat(
      "fr-FR"
    ).format(
      selectedPlan.price
    );
  }, [selectedPlan.price]);

  // =====================================================
  // PAIEMENT
  // =====================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanName =
      fullName.trim();

    const cleanPhone =
      phone.trim();

    const cleanBusinessName =
      businessName.trim();

    if (!cleanName) {
      setError(
        "Veuillez renseigner votre nom complet."
      );
      return;
    }

    if (!cleanPhone) {
      setError(
        "Veuillez renseigner votre numéro de téléphone."
      );
      return;
    }

    if (!cleanBusinessName) {
      setError(
        "Veuillez renseigner le nom de votre boutique."
      );
      return;
    }

    if (!userId) {
      setError(
        "Votre session a expiré. Veuillez vous reconnecter."
      );
      return;
    }

    try {
      setProcessing(true);

      // Sauvegarder les informations
      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .update({
          full_name:
            cleanName,
          phone:
            cleanPhone,
          business_name:
            cleanBusinessName,
        })
        .eq("id", userId);

      if (profileError) {
        console.error(
          profileError
        );

        setError(
          "Impossible d'enregistrer les informations de votre boutique."
        );

        setProcessing(false);
        return;
      }

      // Initialiser Paystack
      const response =
        await fetch(
          "/api/paystack/subscription",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email,
              userId,
              plan,
              customerName:
                cleanName,
              customerPhone:
                cleanPhone,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible d'initialiser le paiement."
        );
      }

      if (
        !data.authorization_url
      ) {
        throw new Error(
          "Paystack n'a pas fourni le lien de paiement."
        );
      }

      setSuccess(
        "Paiement sécurisé en préparation..."
      );

      window.location.href =
        data.authorization_url;
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Une erreur est survenue."
      );

      setProcessing(false);
    }
  };

  // =====================================================
  // CHARGEMENT
  // =====================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-black shadow-2xl">
            <span className="text-4xl">
              🇨🇮
            </span>
          </div>

          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-yellow-400" />

          <h2 className="text-xl font-black text-gray-900">
            Ivoire Shop
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Préparation de votre espace vendeur...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-yellow-50 via-white to-orange-50 text-gray-900">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="sticky top-0 z-50 border-b border-black/10 bg-black shadow-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">

          <button
            onClick={() =>
              router.push("/")
            }
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-400 text-2xl shadow-lg">
              🇨🇮
            </div>

            <div className="text-left">
              <div className="text-xl font-black tracking-tight text-white">
                Ivoire Shop
              </div>

              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-400">
                Marketplace ivoirienne
              </div>
            </div>
          </button>

          <button
            onClick={() =>
              router.push("/")
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
          >
            ← Boutique
          </button>
        </div>
      </header>

      {/* =================================================
          HERO
      ================================================= */}

      <section className="relative overflow-hidden bg-gradient-to-br from-black via-gray-950 to-gray-900 text-white">

        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-yellow-400/20 blur-3xl" />

        <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-orange-500/10 blur-3xl" />

        <div className="absolute right-[15%] top-20 text-8xl opacity-10">
          🛍️
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">

          <div className="max-w-4xl">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-5 py-2.5 text-sm font-black text-yellow-300">
              <span>🔥</span>
              REJOIGNEZ IVORE SHOP
            </div>

            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl">
              Faites passer votre activité au{" "}
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                niveau supérieur.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-300 sm:text-xl">
              Créez votre boutique sur Ivoire Shop,
              présentez vos produits et commencez à
              vendre auprès de clients partout en
              Côte d'Ivoire.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">

              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold backdrop-blur">
                <span className="text-green-400">
                  ✓
                </span>
                Boutique en ligne
              </div>

              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold backdrop-blur">
                <span className="text-green-400">
                  ✓
                </span>
                Gestion des commandes
              </div>

              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold backdrop-blur">
                <span className="text-green-400">
                  ✓
                </span>
                Paiement sécurisé
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          AVANTAGES
      ================================================= */}

      <section className="mx-auto max-w-7xl px-5 pt-12 lg:px-8 lg:pt-16">

        <div className="grid gap-5 md:grid-cols-3">

          <div className="group rounded-3xl border border-yellow-100 bg-white p-6 shadow-lg shadow-yellow-100/50 transition hover:-translate-y-1 hover:shadow-xl">

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-400 text-2xl shadow-lg">
              📦
            </div>

            <h3 className="text-xl font-black">
              Vendez facilement
            </h3>

            <p className="mt-2 leading-6 text-gray-500">
              Ajoutez vos produits, vos photos,
              vos prix et gérez vos stocks depuis
              votre espace vendeur.
            </p>
          </div>

          <div className="group rounded-3xl border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/50 transition hover:-translate-y-1 hover:shadow-xl">

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 text-2xl text-white shadow-lg">
              📊
            </div>

            <h3 className="text-xl font-black">
              Contrôlez votre activité
            </h3>

            <p className="mt-2 leading-6 text-gray-500">
              Retrouvez vos produits, commandes
              et informations importantes dans
              un seul tableau de bord.
            </p>
          </div>

          <div className="group rounded-3xl border border-green-100 bg-white p-6 shadow-lg shadow-green-100/50 transition hover:-translate-y-1 hover:shadow-xl">

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 text-2xl text-white shadow-lg">
              🚀
            </div>

            <h3 className="text-xl font-black">
              Développez votre visibilité
            </h3>

            <p className="mt-2 leading-6 text-gray-500">
              Présentez votre activité sur une
              marketplace conçue pour le marché
              ivoirien.
            </p>
          </div>

        </div>
      </section>

      {/* =================================================
          CONTENU PRINCIPAL
      ================================================= */}

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">

        <div className="grid gap-10 lg:grid-cols-[1fr_400px]">

          {/* =================================================
              GAUCHE
          ================================================= */}

          <div>

            {/* TITRE FORMULES */}

            <div className="mb-7">
              <div className="mb-3 inline-flex rounded-full bg-yellow-100 px-4 py-2 text-xs font-black uppercase tracking-wider text-yellow-700">
                ÉTAPE 1
              </div>

              <h2 className="text-3xl font-black sm:text-4xl">
                Choisissez votre formule
              </h2>

              <p className="mt-2 text-gray-500">
                Commencez à vendre avec la formule
                qui correspond à votre activité.
              </p>
            </div>

            {/* PLANS */}

            <div className="grid gap-6 md:grid-cols-2">

              {/* PRO */}

              <button
                type="button"
                onClick={() =>
                  setPlan("pro")
                }
                className={`relative overflow-hidden rounded-[28px] border-2 bg-white p-7 text-left shadow-lg transition hover:-translate-y-1 ${
                  plan === "pro"
                    ? "border-blue-500 ring-4 ring-blue-100"
                    : "border-gray-200"
                }`}
              >

                {plan === "pro" && (
                  <div className="absolute right-5 top-5 rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white">
                    CHOISI
                  </div>
                )}

                <div className="mb-6 flex items-center justify-between">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl text-white shadow-lg">
                    🚀
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black uppercase text-gray-400">
                      Mensuel
                    </p>

                    <div className="mt-1">
                      <span className="text-3xl font-black">
                        3 000
                      </span>

                      <span className="ml-1 text-xs text-gray-500">
                        FCFA
                      </span>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-black">
                  Plan Pro
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  L'essentiel pour commencer à
                  vendre professionnellement.
                </p>

                <div className="my-6 h-px bg-gray-100" />

                <div className="space-y-3">
                  {plans.pro.features.map(
                    (feature) => (
                      <div
                        key={feature}
                        className="flex gap-3 text-sm"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-600">
                          ✓
                        </span>

                        <span className="font-medium text-gray-700">
                          {feature}
                        </span>
                      </div>
                    )
                  )}
                </div>

              </button>

              {/* PREMIUM */}

              <button
                type="button"
                onClick={() =>
                  setPlan("premium")
                }
                className={`relative overflow-hidden rounded-[28px] border-2 bg-white p-7 text-left shadow-xl transition hover:-translate-y-1 ${
                  plan === "premium"
                    ? "border-yellow-400 ring-4 ring-yellow-100"
                    : "border-gray-200"
                }`}
              >

                <div className="absolute right-0 top-0 rounded-bl-2xl bg-gradient-to-r from-yellow-300 to-orange-400 px-5 py-2 text-xs font-black text-black">
                  ⭐ RECOMMANDÉ
                </div>

                {plan === "premium" && (
                  <div className="absolute left-5 top-5 rounded-full bg-black px-3 py-1.5 text-[10px] font-black text-white">
                    CHOISI
                  </div>
                )}

                <div className="mb-6 flex items-center justify-between pr-28">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-500 text-2xl shadow-lg">
                    👑
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black uppercase text-gray-400">
                      Mensuel
                    </p>

                    <div className="mt-1">
                      <span className="text-3xl font-black">
                        5 000
                      </span>

                      <span className="ml-1 text-xs text-gray-500">
                        FCFA
                      </span>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-black">
                  Plan Premium
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Pour les vendeurs qui veulent
                  développer davantage leur activité.
                </p>

                <div className="my-6 h-px bg-gray-100" />

                <div className="space-y-3">
                  {plans.premium.features.map(
                    (feature) => (
                      <div
                        key={feature}
                        className="flex gap-3 text-sm"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-xs font-black text-yellow-700">
                          ✓
                        </span>

                        <span className="font-medium text-gray-700">
                          {feature}
                        </span>
                      </div>
                    )
                  )}
                </div>

              </button>

            </div>

            {/* FORMULAIRE */}

            <div className="mt-12">

              <div className="mb-7">
                <div className="mb-3 inline-flex rounded-full bg-yellow-100 px-4 py-2 text-xs font-black uppercase tracking-wider text-yellow-700">
                  ÉTAPE 2
                </div>

                <h2 className="text-3xl font-black sm:text-4xl">
                  Configurez votre boutique
                </h2>

                <p className="mt-2 text-gray-500">
                  Renseignez vos informations avant
                  de procéder au paiement.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-xl sm:p-8"
              >

                <div className="grid gap-6 sm:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-black">
                      Nom complet
                    </label>

                    <input
                      value={fullName}
                      onChange={(e) =>
                        setFullName(
                          e.target.value
                        )
                      }
                      placeholder="Ex. Jean Kouassi"
                      className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-4 text-sm font-medium outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-black">
                      Numéro de téléphone
                    </label>

                    <input
                      value={phone}
                      onChange={(e) =>
                        setPhone(
                          e.target.value
                        )
                      }
                      placeholder="Ex. 07 00 00 00 00"
                      className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-4 text-sm font-medium outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                    />
                  </div>

                  <div className="sm:col-span-2">

                    <label className="mb-2 block text-sm font-black">
                      🏪 Nom de votre boutique
                    </label>

                    <input
                      value={businessName}
                      onChange={(e) =>
                        setBusinessName(
                          e.target.value
                        )
                      }
                      placeholder="Ex. Abidjan Fashion"
                      className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-4 text-sm font-medium outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                    />

                    <p className="mt-2 text-xs text-gray-500">
                      Ce nom sera utilisé pour
                      identifier votre boutique sur
                      Ivoire Shop.
                    </p>

                  </div>
                </div>

                {/* MESSAGE ERREUR */}

                {error && (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    <span className="text-lg">
                      ⚠️
                    </span>

                    <span>
                      {error}
                    </span>
                  </div>
                )}

                {/* MESSAGE SUCCÈS */}

                {success && (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-green-100 bg-green-50 p-4 text-sm font-semibold text-green-700">
                    <span className="text-lg">
                      ✓
                    </span>

                    <span>
                      {success}
                    </span>
                  </div>
                )}

                {/* RÉCAP */}

                <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-gray-950 to-black text-white shadow-xl">

                  <div className="border-b border-white/10 bg-white/5 px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-wider text-yellow-400">
                      Récapitulatif
                    </p>
                  </div>

                  <div className="p-5">

                    <div className="flex items-center justify-between gap-4">

                      <div className="flex items-center gap-4">

                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${selectedPlan.color} text-2xl`}
                        >
                          {selectedPlan.icon}
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-gray-500">
                            Formule sélectionnée
                          </p>

                          <p className="text-xl font-black">
                            {selectedPlan.name}
                          </p>
                        </div>

                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-yellow-400">
                          {formattedPrice}
                        </p>

                        <p className="text-xs text-gray-500">
                          FCFA / mois
                        </p>
                      </div>

                    </div>

                    <div className="my-5 h-px bg-white/10" />

                    <div className="space-y-3 text-sm">

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">
                          Boutique
                        </span>

                        <span className="font-bold">
                          {businessName.trim() ||
                            "À renseigner"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">
                          Paiement
                        </span>

                        <span className="font-bold">
                          🔒 Paystack
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">
                          Durée
                        </span>

                        <span className="font-bold">
                          1 mois
                        </span>
                      </div>

                    </div>

                  </div>
                </div>

                {/* BOUTON PAIEMENT */}

                <button
                  type="submit"
                  disabled={processing}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 px-6 py-5 text-base font-black text-black shadow-xl shadow-yellow-200 transition hover:-translate-y-0.5 hover:from-yellow-200 hover:to-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {processing ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />

                      Préparation du paiement...
                    </>
                  ) : (
                    <>
                      🔐 Payer et devenir vendeur

                      <span className="text-xl">
                        →
                      </span>
                    </>
                  )}

                </button>

                <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-gray-500">
                  <span>
                    🔒
                  </span>

                  <span>
                    Paiement sécurisé par Paystack.
                    Votre compte vendeur sera activé
                    après confirmation du paiement.
                  </span>
                </div>

              </form>
            </div>
          </div>

          {/* =================================================
              COLONNE DROITE
          ================================================= */}

          <aside className="lg:sticky lg:top-28 lg:h-fit">

            <div className="overflow-hidden rounded-[32px] bg-black text-white shadow-2xl">

              <div className="bg-gradient-to-r from-yellow-300 to-orange-400 p-6 text-black">

                <div className="mb-3 text-4xl">
                  🏪
                </div>

                <p className="text-xs font-black uppercase tracking-wider">
                  Votre boutique
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Prêt à vendre ?
                </h2>

              </div>

              <div className="p-6">

                {/* ÉTAPES */}

                <p className="mb-5 text-xs font-black uppercase tracking-wider text-gray-500">
                  COMMENT ÇA MARCHE
                </p>

                <div className="space-y-6">

                  <div className="flex gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 font-black text-black">
                      1
                    </div>

                    <div>
                      <p className="font-black">
                        Choisissez votre formule
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Sélectionnez Pro ou Premium
                        selon vos besoins.
                      </p>
                    </div>

                  </div>

                  <div className="flex gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 font-black text-white">
                      2
                    </div>

                    <div>
                      <p className="font-black">
                        Configurez votre boutique
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Renseignez votre nom, téléphone
                        et nom de boutique.
                      </p>
                    </div>

                  </div>

                  <div className="flex gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500 font-black text-white">
                      3
                    </div>

                    <div>
                      <p className="font-black">
                        Payez en toute sécurité
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Votre paiement est traité par
                        Paystack.
                      </p>
                    </div>

                  </div>

                  <div className="flex gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500 font-black text-white">
                      4
                    </div>

                    <div>
                      <p className="font-black">
                        Commencez à vendre
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Votre compte devient vendeur
                        et vous accédez à votre dashboard.
                      </p>
                    </div>

                  </div>

                </div>

                <div className="my-7 h-px bg-white/10" />

                {/* AVANTAGES */}

                <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/5 p-5">

                  <p className="mb-4 text-sm font-black text-yellow-400">
                    ⭐ Pourquoi Ivoire Shop ?
                  </p>

                  <div className="space-y-3">

                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">
                        ✓
                      </span>
                      Marketplace locale
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">
                        ✓
                      </span>
                      Interface simple
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">
                        ✓
                      </span>
                      Gestion centralisée
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">
                        ✓
                      </span>
                      Paiement sécurisé
                    </div>

                  </div>

                </div>

                <div className="mt-5 rounded-2xl bg-white/5 p-4 text-center">

                  <p className="text-2xl">
                    🇨🇮
                  </p>

                  <p className="mt-2 text-sm font-black">
                    Fait pour la Côte d'Ivoire
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Une plateforme pensée pour
                    connecter les vendeurs et les
                    acheteurs ivoiriens.
                  </p>

                </div>

              </div>
            </div>

            {/* CARTE SUPPORT */}

            <div className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 text-center shadow-lg">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-xl">
                💬
              </div>

              <p className="mt-3 font-black">
                Une question ?
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Vous pouvez contacter l'équipe
                Ivoire Shop pour obtenir de l'aide.
              </p>

            </div>

          </aside>
        </div>
      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="border-t border-gray-200 bg-black text-white">

        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">

          <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">

            <div>
              <div className="flex items-center justify-center gap-3 sm:justify-start">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-lg">
                  🇨🇮
                </div>

                <span className="text-lg font-black">
                  Ivoire Shop
                </span>

              </div>

              <p className="mt-2 text-xs text-gray-500">
                La marketplace pensée pour la Côte d'Ivoire.
              </p>
            </div>

            <p className="text-xs text-gray-500">
              © 2026 Ivoire Shop — Tous droits réservés.
            </p>

          </div>

        </div>
      </footer>

    </main>
  );
}

