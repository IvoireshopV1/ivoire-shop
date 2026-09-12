
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Plan = {
  name: string;
  price: string;
  description: string;
  icon: string;
  popular?: boolean;
  premium?: boolean;
  features: string[];
};

const plans: Plan[] = [
  {
    name: "Gratuit",
    price: "0",
    description:
      "Pour commencer à vendre gratuitement sur Ivoire Shop.",
    icon: "🆓",
    features: [
      "Jusqu'à 10 produits",
      "Gestion du stock",
      "Gestion des commandes",
      "Profil vendeur",
      "Boutique de base",
      "Contact client",
      "Support standard",
    ],
  },
  {
    name: "Pro",
    price: "3 000",
    description:
      "Pour les vendeurs qui veulent développer leur activité.",
    icon: "🚀",
    popular: true,
    features: [
      "Jusqu'à 100 produits",
      "Gestion avancée du stock",
      "Statistiques avancées",
      "Produits mis en avant",
      "Badge vendeur Pro",
      "Boutique personnalisée",
      "Lien personnalisé de boutique",
      "Outils marketing",
      "Support prioritaire",
    ],
  },
  {
    name: "Premium",
    price: "5 000",
    description:
      "Pour les boutiques qui veulent plus de visibilité et de puissance.",
    icon: "👑",
    premium: true,
    features: [
      "Produits illimités",
      "Statistiques très avancées",
      "Mise en avant prioritaire",
      "Badge Premium",
      "Boutique personnalisée avancée",
      "Promotion de la boutique",
      "Outils marketing avancés",
      "Meilleure visibilité",
      "Support VIP",
    ],
  },
];

export default function SellerSubscriptionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sellerName, setSellerName] = useState("");
  const [currentPlan, setCurrentPlan] = useState("Gratuit");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadSeller = async () => {
      setLoading(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role, full_name, business_name")
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

      setSellerName(
        profile.business_name ||
          profile.full_name ||
          "Vendeur"
      );

      setCurrentPlan("Gratuit");

      setLoading(false);
    };

    loadSeller();
  }, [router]);

  /*
   * Lance le paiement Paystack
   */
  const handleChoosePlan = async (planName: string) => {
    setMessage("");

    if (planName === currentPlan) {
      setMessage(
        `Vous utilisez déjà l'offre ${planName}.`
      );
      return;
    }

    /*
     * L'offre gratuite ne nécessite pas de paiement.
     */
    if (planName === "Gratuit") {
      setMessage(
        "L'offre Gratuit est déjà disponible pour les vendeurs."
      );
      return;
    }

    /*
     * Sécurité :
     * seules les offres Pro et Premium
     * peuvent être payées.
     */
    if (
      planName !== "Pro" &&
      planName !== "Premium"
    ) {
      setMessage("Formule invalide.");
      return;
    }

    try {
      setLoadingPlan(planName);

      /*
       * Utilisateur connecté
       */
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const user = authData.user;

      /*
       * Profil vendeur
       */
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "role, full_name, business_name, phone"
          )
          .eq("id", user.id)
          .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "seller"
      ) {
        setMessage(
          "Votre compte vendeur n'a pas été trouvé."
        );
        setLoadingPlan(null);
        return;
      }

      /*
       * Email nécessaire pour Paystack
       */
      if (!user.email) {
        setMessage(
          "Votre compte ne possède pas d'adresse email."
        );
        setLoadingPlan(null);
        return;
      }

      /*
       * APPEL PAYSTACK
       *
       * IMPORTANT :
       * On utilise ta route existante :
       *
       * /api/paystack/initialize
       */
      const response = await fetch(
        "/api/paystack/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            userId: user.id,

            /*
             * La route serveur pourra déterminer
             * le montant selon le plan.
             */
            plan:
              planName === "Pro"
                ? "pro"
                : "premium",

            customerName:
              profile.business_name ||
              profile.full_name ||
              sellerName ||
              "",

            customerPhone:
              profile.phone || "",
          }),
        }
      );

      /*
       * On récupère d'abord la réponse en texte.
       *
       * Cela permet d'éviter l'erreur :
       * Unexpected token '<'
       *
       * si le serveur renvoie accidentellement
       * une page HTML.
       */
      const responseText = await response.text();

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(
          "Réponse serveur non JSON :",
          responseText
        );

        throw new Error(
          `Le serveur a renvoyé une réponse invalide (HTTP ${response.status}). Vérifie la route /api/paystack/initialize.`
        );
      }

      /*
       * Gestion des erreurs de l'API
       */
      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Impossible d'initialiser le paiement."
        );
      }

      /*
       * Paystack doit fournir une URL
       */
      if (!data?.authorization_url) {
        console.error(
          "Réponse Paystack :",
          data
        );

        throw new Error(
          "Paystack n'a pas fourni de lien de paiement."
        );
      }

      /*
       * Redirection vers Paystack
       */
      window.location.href =
        data.authorization_url;
    } catch (error) {
      console.error(
        "Erreur paiement abonnement :",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors du paiement."
      );

      setLoadingPlan(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f6f8] flex items-center justify-center">
        <div className="text-center">

          <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />

          <p className="font-bold text-gray-600">
            Chargement de votre abonnement...
          </p>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-gray-900">

      {/* HEADER */}
      <header className="bg-white border-b border-gray-200">

        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">

          <button
            onClick={() => router.push("/seller")}
            className="text-sm font-bold text-gray-500 hover:text-black transition"
          >
            ← Retour au dashboard
          </button>

          <div className="font-black text-lg">
            🇨🇮 Ivoire Shop
          </div>

        </div>

      </header>

      {/* CONTENU */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">

        {/* TITRE */}
        <div className="text-center max-w-3xl mx-auto mb-10">

          <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider mb-5">
            💎 Espace vendeur
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Développez votre boutique
          </h1>

          <p className="text-gray-500 text-base sm:text-lg mt-4 leading-7">
            Choisissez la formule qui correspond le mieux à
            votre activité sur Ivoire Shop.
          </p>

          <p className="text-sm text-gray-400 mt-3">
            Bonjour{" "}
            <span className="font-bold text-gray-700">
              {sellerName}
            </span>
          </p>

        </div>

        {/* ABONNEMENT ACTUEL */}
        <div className="max-w-4xl mx-auto mb-10">

          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-5 sm:p-6">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              <div className="flex items-center gap-4">

                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                  🧾
                </div>

                <div>

                  <p className="text-xs uppercase tracking-wider font-black text-gray-400">
                    Votre abonnement actuel
                  </p>

                  <h2 className="text-xl font-black mt-1">
                    {currentPlan}
                  </h2>

                </div>

              </div>

              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-100 px-4 py-2 rounded-full text-sm font-black">

                <span className="w-2 h-2 rounded-full bg-green-500" />

                Actif

              </div>

            </div>

          </div>

        </div>

        {/* FORMULES */}
        <div className="grid lg:grid-cols-3 gap-6 items-stretch">

          {plans.map((plan) => {

            const isCurrent =
              plan.name === currentPlan;

            const isLoading =
              loadingPlan === plan.name;

            return (
              <div
                key={plan.name}
                className={`relative bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lg ${
                  plan.popular
                    ? "border-black ring-2 ring-black"
                    : plan.premium
                    ? "border-yellow-400"
                    : "border-gray-200"
                }`}
              >

                {/* BADGE */}
                {plan.popular && (
                  <div className="bg-black text-white text-center py-2 text-xs font-black uppercase tracking-wider">
                    ⭐ Le plus populaire
                  </div>
                )}

                {plan.premium && (
                  <div className="bg-gray-900 text-white text-center py-2 text-xs font-black uppercase tracking-wider">
                    👑 Offre Premium
                  </div>
                )}

                <div className="p-7 flex flex-col flex-1">

                  {/* ICONE */}
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl mb-5">
                    {plan.icon}
                  </div>

                  {/* NOM */}
                  <h2 className="text-2xl font-black">
                    {plan.name}
                  </h2>

                  {/* DESCRIPTION */}
                  <p className="text-sm text-gray-500 mt-2 min-h-[48px]">
                    {plan.description}
                  </p>

                  {/* PRIX */}
                  <div className="mt-6 mb-7">

                    <div className="flex items-end gap-2">

                      <span className="text-4xl font-black">
                        {plan.price}
                      </span>

                      <span className="text-gray-500 font-bold mb-1">
                        FCFA
                      </span>

                    </div>

                    <p className="text-xs text-gray-400 mt-1">
                      par mois
                    </p>

                  </div>

                  {/* SEPARATION */}
                  <div className="border-t border-gray-100 mb-6" />

                  {/* FONCTIONNALITES */}
                  <div className="flex-1">

                    <p className="text-sm font-black mb-4">
                      Ce qui est inclus :
                    </p>

                    <ul className="space-y-3">

                      {plan.features.map(
                        (feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-3 text-sm"
                          >

                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black mt-0.5">
                              ✓
                            </span>

                            <span className="text-gray-600 leading-5">
                              {feature}
                            </span>

                          </li>
                        )
                      )}

                    </ul>

                  </div>

                  {/* BOUTON */}
                  <button
                    onClick={() =>
                      handleChoosePlan(plan.name)
                    }
                    disabled={
                      isCurrent ||
                      loadingPlan !== null
                    }
                    className={`w-full mt-8 py-4 rounded-xl font-black transition ${
                      isCurrent
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : plan.premium
                        ? "bg-gray-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                        : plan.popular
                        ? "bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        : "bg-white border-2 border-gray-200 text-gray-900 hover:border-black disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {isCurrent
                      ? "✓ Offre actuelle"
                      : isLoading
                      ? "Redirection vers Paystack..."
                      : plan.name ===
                        "Gratuit"
                      ? "Choisir Gratuit"
                      : plan.name ===
                        "Pro"
                      ? "Passer à Pro — 3 000 FCFA"
                      : "Passer à Premium — 5 000 FCFA"}
                  </button>

                </div>

              </div>
            );
          })}

        </div>

        {/* MESSAGE */}
        {message && (
          <div className="max-w-3xl mx-auto mt-8">

            <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl p-5 text-center text-sm font-bold">
              ℹ️ {message}
            </div>

          </div>
        )}

        {/* INFORMATION PAIEMENT */}
        <div className="max-w-3xl mx-auto mt-8">

          <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">

            <p className="text-sm font-bold text-gray-700">
              🔐 Paiement sécurisé avec Paystack
            </p>

            <p className="text-xs text-gray-500 mt-2 leading-5">
              Après avoir choisi une formule payante,
              vous serez redirigé vers Paystack pour
              effectuer votre paiement en toute sécurité.
              Votre formule sera activée après
              vérification du paiement.
            </p>

          </div>

        </div>

        {/* GARANTIES */}
        <div className="max-w-5xl mx-auto mt-14">

          <div className="grid sm:grid-cols-3 gap-4">

            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center">

              <div className="text-2xl mb-2">
                🔒
              </div>

              <h3 className="font-black">
                Paiement sécurisé
              </h3>

              <p className="text-xs text-gray-500 mt-2">
                Vos informations seront protégées.
              </p>

            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center">

              <div className="text-2xl mb-2">
                ⚡
              </div>

              <h3 className="font-black">
                Activation rapide
              </h3>

              <p className="text-xs text-gray-500 mt-2">
                Votre formule sera activée après
                confirmation du paiement.
              </p>

            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center">

              <div className="text-2xl mb-2">
                🇨🇮
              </div>

              <h3 className="font-black">
                Pensé pour la CI
              </h3>

              <p className="text-xs text-gray-500 mt-2">
                Des offres adaptées aux vendeurs
                ivoiriens.
              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}

