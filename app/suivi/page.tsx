"use client";

import { useState } from "react";
import Link from "next/link";

type Order = {
  id: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_commune?: string;
  customer_address?: string;
  payment_method?: string;
  products?: unknown;
  total?: number;
  customer_note?: string;
  status?: string;
  created_at?: string;
};

const steps = [
  {
    key: "Nouvelle",
    title: "Commande reçue",
    description: "Votre commande a bien été reçue.",
    icon: "🛒",
  },
  {
    key: "Confirmée",
    title: "Commande confirmée",
    description: "Le vendeur a confirmé votre commande.",
    icon: "✓",
  },
  {
    key: "En préparation",
    title: "En préparation",
    description: "Votre commande est en cours de préparation.",
    icon: "📦",
  },
  {
    key: "En livraison",
    title: "En livraison",
    description: "Votre commande est en route.",
    icon: "🚚",
  },
  {
    key: "Livrée",
    title: "Commande livrée",
    description: "Votre commande a été livrée.",
    icon: "✓",
  },
];

function normalizeStatus(status?: string) {
  if (!status || status === "pending") {
    return "Nouvelle";
  }

  return status;
}

function getStepIndex(status?: string) {
  const normalized = normalizeStatus(status);

  const index = steps.findIndex(
    (step) => step.key === normalized
  );

  return index === -1 ? 0 : index;
}

function formatPrice(value?: number) {
  return new Intl.NumberFormat("fr-FR").format(
    Number(value || 0)
  );
}

export default function TrackingPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");

  const [order, setOrder] = useState<Order | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setOrder(null);

    if (!orderNumber.trim() || !phone.trim()) {
      setError(
        "Veuillez renseigner votre numéro de commande et votre téléphone."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/orders/track",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_number: orderNumber.trim(),
            phone: phone.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            "Commande introuvable."
        );
        return;
      }

      setOrder(data.order);
    } catch {
      setError(
        "Impossible de rechercher la commande."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetSearch() {
    setOrder(null);
    setError("");
  }

  const currentStep = getStepIndex(
    order?.status
  );

  const isCancelled =
    order?.status === "Annulée";

  return (
    <main className="min-h-screen bg-[#f7f7f7]">

      {/* HEADER */}
      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 flex items-center justify-between">

          <Link
            href="/"
            className="text-2xl font-black tracking-tight"
          >
            🇨🇮 Ivoire Shop
          </Link>

          <Link
            href="/"
            className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition"
          >
            ← Retour à la boutique
          </Link>

        </div>
      </header>

      {/* HERO */}
      <section className="bg-black text-white relative overflow-hidden">

        <div className="absolute -right-20 -top-20 w-72 h-72 bg-yellow-400 rounded-full blur-3xl opacity-20" />

        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-yellow-400 rounded-full blur-3xl opacity-10" />

        <div className="max-w-4xl mx-auto px-5 py-14 text-center relative">

          <div className="inline-flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-black mb-6">
            📦 SUIVI DE COMMANDE
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
            Où est ma commande ?
          </h1>

          <p className="text-gray-300 text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
            Suivez facilement l'état de votre commande
            Ivoire Shop, de la confirmation jusqu'à la
            livraison.
          </p>

        </div>
      </section>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-5 -mt-8 relative z-10 pb-16">

        {!order ? (

          <>

            {/* SEARCH CARD */}
            <div className="bg-white rounded-[28px] shadow-xl border border-gray-100 overflow-hidden">

              <div className="p-7 sm:p-10">

                <div className="max-w-2xl mx-auto">

                  <div className="text-center mb-8">

                    <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                      🔎
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                      Suivez votre commande
                    </h2>

                    <p className="text-gray-500 mt-2">
                      Entrez les informations utilisées
                      lors de votre commande.
                    </p>

                  </div>

                  <form
                    onSubmit={handleSearch}
                    className="space-y-6"
                  >

                    {/* ORDER NUMBER */}
                    <div>

                      <label className="block text-sm font-black text-gray-800 mb-2">
                        Numéro de commande
                      </label>

                      <div className="relative">

                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
                          #
                        </div>

                        <input
                          type="text"
                          value={orderNumber}
                          onChange={(e) =>
                            setOrderNumber(
                              e.target.value
                            )
                          }
                          placeholder="IVO-20260911-001"
                          className="w-full h-14 pl-11 pr-4 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 font-bold outline-none transition focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                        />

                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Exemple : IVO-20260911-001
                      </p>

                    </div>

                    {/* PHONE */}
                    <div>

                      <label className="block text-sm font-black text-gray-800 mb-2">
                        Numéro de téléphone
                      </label>

                      <div className="relative">

                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
                          📱
                        </div>

                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) =>
                            setPhone(
                              e.target.value
                            )
                          }
                          placeholder="07 XX XX XX XX"
                          className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 font-bold outline-none transition focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                        />

                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Utilisez le numéro fourni lors
                        de votre commande.
                      </p>

                    </div>

                    {/* ERROR */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 font-medium">
                        <div className="flex gap-3">
                          <span>⚠️</span>

                          <span>{error}</span>
                        </div>
                      </div>
                    )}

                    {/* BUTTON */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-14 rounded-2xl bg-yellow-400 text-black font-black text-lg shadow-lg shadow-yellow-200 hover:bg-yellow-300 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {loading
                        ? "Recherche de votre commande..."
                        : "🔎 Suivre ma commande"}
                    </button>

                  </form>

                </div>

              </div>

              {/* SECURITY */}
              <div className="border-t border-gray-100 bg-gray-50 px-7 py-5">

                <div className="flex items-center justify-center gap-3 text-sm text-gray-500">

                  <span className="text-lg">
                    🔒
                  </span>

                  <span>
                    Vos informations sont utilisées
                    uniquement pour retrouver votre commande.
                  </span>

                </div>

              </div>

            </div>

            {/* HOW IT WORKS */}
            <div className="mt-10">

              <div className="text-center mb-6">

                <p className="text-yellow-600 font-black text-sm uppercase tracking-wider">
                  Simple et rapide
                </p>

                <h2 className="text-2xl font-black text-gray-900 mt-1">
                  Comment ça marche ?
                </h2>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center">
                  <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                    1️⃣
                  </div>

                  <h3 className="font-black text-gray-900">
                    Retrouvez votre numéro
                  </h3>

                  <p className="text-sm text-gray-500 mt-2">
                    Il vous est communiqué après
                    votre commande.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center">
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                    2️⃣
                  </div>

                  <h3 className="font-black text-gray-900">
                    Entrez vos informations
                  </h3>

                  <p className="text-sm text-gray-500 mt-2">
                    Votre numéro de commande et votre
                    téléphone.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                    3️⃣
                  </div>

                  <h3 className="font-black text-gray-900">
                    Suivez votre commande
                  </h3>

                  <p className="text-sm text-gray-500 mt-2">
                    Consultez son état à tout moment.
                  </p>
                </div>

              </div>

            </div>

          </>

        ) : (

          <>
            {/* BACK */}
            <div className="mb-5">

              <button
                onClick={resetSearch}
                className="inline-flex items-center gap-2 text-sm font-black text-gray-500 hover:text-black transition"
              >
                ← Rechercher une autre commande
              </button>

            </div>

            {/* ORDER CARD */}
            <div className="bg-white rounded-[28px] shadow-xl border border-gray-100 overflow-hidden">

              {/* ORDER HEADER */}
              <div className="bg-black text-white p-7 sm:p-9">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

                  <div>

                    <p className="text-gray-400 text-sm font-bold">
                      COMMANDE
                    </p>

                    <h1 className="text-2xl sm:text-3xl font-black mt-1">
                      #
                      {order.order_number ||
                        order.id.slice(0, 8)}
                    </h1>

                    {order.created_at && (
                      <p className="text-gray-400 text-sm mt-2">
                        {new Date(
                          order.created_at
                        ).toLocaleString("fr-FR")}
                      </p>
                    )}

                  </div>

                  <div className="bg-yellow-400 text-black px-5 py-3 rounded-2xl font-black">
                    📦 Suivi actif
                  </div>

                </div>

              </div>

              {/* CANCELLED */}
              {isCancelled ? (

                <div className="p-8 sm:p-12">

                  <div className="rounded-3xl bg-red-50 border border-red-200 p-8 text-center">

                    <div className="text-6xl mb-5">
                      ❌
                    </div>

                    <h2 className="text-2xl font-black text-red-700">
                      Commande annulée
                    </h2>

                    <p className="text-red-600 mt-2">
                      Cette commande a été annulée.
                    </p>

                  </div>

                </div>

              ) : (

                <>

                  {/* STATUS */}
                  <div className="p-7 sm:p-10">

                    <div className="mb-8">

                      <p className="text-yellow-600 font-black text-sm uppercase tracking-wider">
                        État actuel
                      </p>

                      <h2 className="text-2xl font-black text-gray-900 mt-1">
                        Suivi de votre commande
                      </h2>

                    </div>

                    <div className="space-y-0">

                      {steps.map(
                        (step, index) => {

                          const completed =
                            index <= currentStep;

                          const active =
                            index === currentStep;

                          return (
                            <div
                              key={step.key}
                              className="flex gap-4"
                            >

                              {/* TIMELINE */}
                              <div className="flex flex-col items-center">

                                <div
                                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl border-2 transition ${
                                    completed
                                      ? "bg-yellow-400 border-yellow-400"
                                      : "bg-gray-100 border-gray-200"
                                  }`}
                                >
                                  {step.icon}
                                </div>

                                {index <
                                  steps.length -
                                    1 && (
                                  <div
                                    className={`w-1 h-14 ${
                                      index <
                                      currentStep
                                        ? "bg-yellow-400"
                                        : "bg-gray-200"
                                    }`}
                                  />
                                )}

                              </div>

                              {/* TEXT */}
                              <div className="pb-8 pt-1">

                                <div className="flex flex-wrap items-center gap-2">

                                  <h3
                                    className={`font-black text-lg ${
                                      active
                                        ? "text-black"
                                        : completed
                                        ? "text-gray-800"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {step.title}
                                  </h3>

                                  {active && (
                                    <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-[10px] font-black">
                                      EN COURS
                                    </span>
                                  )}

                                </div>

                                <p
                                  className={`text-sm mt-1 ${
                                    completed
                                      ? "text-gray-500"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {step.description}
                                </p>

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>

                  </div>

                  {/* INFO */}
                  <div className="border-t border-gray-100 p-7 sm:p-10 bg-gray-50">

                    <h2 className="font-black text-xl mb-5">
                      Détails de la commande
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      <div className="bg-white rounded-2xl p-5 border border-gray-100">
                        <p className="text-xs text-gray-400 font-black uppercase">
                          Client
                        </p>

                        <p className="font-black mt-1">
                          {order.customer_name ||
                            "Client"}
                        </p>
                      </div>

                      <div className="bg-white rounded-2xl p-5 border border-gray-100">
                        <p className="text-xs text-gray-400 font-black uppercase">
                          Commune
                        </p>

                        <p className="font-black mt-1">
                          {order.customer_commune ||
                            "Non renseignée"}
                        </p>
                      </div>

                      <div className="bg-white rounded-2xl p-5 border border-gray-100">
                        <p className="text-xs text-gray-400 font-black uppercase">
                          Paiement
                        </p>

                        <p className="font-black mt-1">
                          {order.payment_method ||
                            "Non renseigné"}
                        </p>
                      </div>

                      <div className="bg-white rounded-2xl p-5 border border-gray-100">
                        <p className="text-xs text-gray-400 font-black uppercase">
                          Total
                        </p>

                        <p className="font-black text-xl mt-1">
                          {formatPrice(
                            order.total
                          )}{" "}
                          FCFA
                        </p>
                      </div>

                    </div>

                    {order.customer_address && (
                      <div className="bg-white rounded-2xl p-5 border border-gray-100 mt-4">

                        <p className="text-xs text-gray-400 font-black uppercase">
                          Adresse de livraison
                        </p>

                        <p className="font-bold mt-2">
                          📍 {order.customer_address}
                        </p>

                      </div>
                    )}

                  </div>

                </>

              )}

            </div>
          </>
        )}

      </div>

      {/* FOOTER */}
      <footer className="bg-black text-gray-400 py-8">

        <div className="max-w-6xl mx-auto px-5 text-center">

          <p className="font-black text-white">
            🇨🇮 Ivoire Shop
          </p>

          <p className="text-sm mt-2">
            Votre marketplace ivoirienne.
          </p>

        </div>

      </footer>

    </main>
  );
}