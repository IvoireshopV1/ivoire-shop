"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CallbackContent() {
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<
    "loading" | "success" | "error"
  >("loading");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const reference =
      searchParams.get("reference") ||
      searchParams.get("trxref");

    if (!reference) {
      setStatus("error");
      setMessage(
        "Référence de paiement introuvable."
      );
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(
          "/api/paystack/verify-subscription",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              reference,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok || !data.success) {
          setStatus("error");
          setMessage(
            data.error ||
              "Impossible de vérifier le paiement."
          );
          return;
        }

        setStatus("success");
        setMessage(
          "Ton abonnement vendeur est maintenant actif."
        );
      } catch (error) {
        console.error(
          "Erreur vérification paiement :",
          error
        );

        setStatus("error");
        setMessage(
          "Une erreur est survenue pendant la vérification du paiement."
        );
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-indigo-950 flex items-center justify-center px-6">
        <div className="w-full max-w-xl text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <div className="mx-auto mb-6 h-16 w-16 rounded-full border-4 border-gray-200 border-t-yellow-400 animate-spin" />

            <h1 className="text-3xl font-black text-gray-900 mb-3">
              Vérification du paiement
            </h1>

            <p className="text-gray-600">
              Nous vérifions ton paiement
              Paystack...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (status === "success") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center px-6">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center border border-green-100">
            <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-5xl">
                ✓
              </span>
            </div>

            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-sm mb-5">
              <span>🎉</span>
              Paiement confirmé
            </div>

            <h1 className="text-4xl font-black text-gray-900 mb-4">
              Félicitations !
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              {message}
            </p>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-5 mb-8">
              <p className="font-black text-gray-900 mb-1">
                🏪 Ton espace vendeur est prêt
              </p>

              <p className="text-sm text-gray-600">
                Tu peux maintenant ajouter tes
                produits et commencer à vendre sur
                Ivoire Shop.
              </p>
            </div>

            <Link
              href="/seller"
              className="inline-flex items-center justify-center gap-2 w-full bg-black text-white px-6 py-4 rounded-xl font-black hover:bg-gray-800 transition"
            >
              🏪 Accéder à mon espace vendeur
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full mt-3 border-2 border-gray-200 text-gray-700 px-6 py-4 rounded-xl font-bold hover:bg-gray-50 transition"
            >
              🛍️ Retour à Ivoire Shop
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center border border-red-100">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-5xl">
              !
            </span>
          </div>

          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full font-bold text-sm mb-5">
            <span>⚠️</span>
            Vérification impossible
          </div>

          <h1 className="text-3xl font-black text-gray-900 mb-4">
            Un problème est survenu
          </h1>

          <p className="text-gray-600 leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/become-seller"
              className="w-full bg-yellow-400 text-black px-6 py-4 rounded-xl font-black hover:bg-yellow-300 transition"
            >
              🔄 Revenir aux abonnements
            </Link>

            <Link
              href="/"
              className="w-full border-2 border-gray-200 text-gray-700 px-6 py-4 rounded-xl font-bold hover:bg-gray-50 transition"
            >
              🏠 Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SubscriptionCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black flex items-center justify-center px-6">
          <div className="text-center text-white">
            <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-white/20 border-t-yellow-400 animate-spin" />

            <p className="font-bold">
              Chargement...
            </p>
          </div>
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}