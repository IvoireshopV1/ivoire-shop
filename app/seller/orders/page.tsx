"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type OrderProduct = {
  id?: number | string;
  name?: string;
  price?: number;
  quantity?: number;
  image?: string;
  seller_id?: string;
};

type Order = {
  id: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_commune?: string;
  customer_address?: string;
  payment_method?: string;
  products?: OrderProduct[] | string;
  total?: number;
  customer_note?: string;
  status?: string;
  created_at?: string;
  seller_ids?: string[];
};

const STATUSES = [
  "Nouvelle",
  "Confirmée",
  "En préparation",
  "Livrée",
  "Annulée",
];

function getStatusStyle(status: string) {
  switch (status) {
    case "Confirmée":
      return "bg-blue-100 text-blue-700 border-blue-200";

    case "En préparation":
      return "bg-amber-100 text-amber-700 border-amber-200";

    case "Livrée":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";

    case "Annulée":
      return "bg-red-100 text-red-700 border-red-200";

    default:
      return "bg-purple-100 text-purple-700 border-purple-200";
  }
}

function getStatusEmoji(status: string) {
  switch (status) {
    case "Confirmée":
      return "✅";

    case "En préparation":
      return "📦";

    case "Livrée":
      return "🚚";

    case "Annulée":
      return "❌";

    default:
      return "🆕";
  }
}

function parseProducts(products: Order["products"]): OrderProduct[] {
  if (Array.isArray(products)) {
    return products;
  }

  if (typeof products === "string") {
    try {
      const parsed = JSON.parse(products);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return [];
    }
  }

  return [];
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function normalizePhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("225")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return "225" + cleaned.substring(1);
  }

  return "225" + cleaned;
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Vous devez être connecté pour voir vos commandes.");
      setLoading(false);
      return;
    }

    setSellerId(user.id);

    const { data, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .contains("seller_ids", [user.id])
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error(ordersError);
      setError("Impossible de charger les commandes.");
      setLoading(false);
      return;
    }

    setOrders(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    setError("");

    const { error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
      })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      setError(
        "Impossible de modifier le statut. Vérifiez vos permissions."
      );
      setUpdatingId(null);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus,
            }
          : order
      )
    );

    setUpdatingId(null);
  }

  const preparedOrders = useMemo(() => {
    return orders.map((order) => {
      const allProducts = parseProducts(order.products);

      const sellerProducts = sellerId
        ? allProducts.filter(
            (product) => product.seller_id === sellerId
          )
        : allProducts;

      const sellerTotal = sellerProducts.reduce(
        (sum, product) =>
          sum +
          Number(product.price || 0) *
            Number(product.quantity || 1),
        0
      );

      return {
        ...order,
        sellerProducts,
        sellerTotal,
      };
    });
  }, [orders, sellerId]);

  const stats = useMemo(() => {
    const totalOrders = preparedOrders.length;

    const newOrders = preparedOrders.filter(
      (order) =>
        !order.status ||
        order.status === "Nouvelle" ||
        order.status === "pending"
    ).length;

    const confirmedOrders = preparedOrders.filter(
      (order) => order.status === "Confirmée"
    ).length;

    const preparingOrders = preparedOrders.filter(
      (order) => order.status === "En préparation"
    ).length;

    const deliveredOrders = preparedOrders.filter(
      (order) => order.status === "Livrée"
    ).length;

    const totalSales = preparedOrders
      .filter((order) => order.status !== "Annulée")
      .reduce(
        (sum, order) => sum + Number(order.sellerTotal || 0),
        0
      );

    return {
      totalOrders,
      newOrders,
      confirmedOrders,
      preparingOrders,
      deliveredOrders,
      totalSales,
    };
  }, [preparedOrders]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🛒</div>
          <p className="font-bold text-gray-700">
            Chargement des commandes...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <Link
              href="/seller"
              className="text-2xl font-black"
            >
              🇨🇮 Ivoire Shop
            </Link>

            <p className="text-gray-400 text-sm mt-1">
              Espace vendeur
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/seller/products"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
            >
              📦 Mes produits
            </Link>

            <Link
              href="/seller"
              className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition"
            >
              Tableau de bord
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* TITLE */}
        <div className="mb-8">
          <p className="text-gray-500 font-medium">
            Gérez vos ventes
          </p>

          <h1 className="text-4xl font-black text-gray-900 mt-1">
            Commandes
          </h1>

          <p className="text-gray-500 mt-2">
            Suivez et mettez à jour les commandes de vos clients.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-5 py-4">
            ❌ {error}
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
          <div className="bg-white rounded-3xl p-6 border border-blue-100 shadow-sm">
            <div className="text-3xl mb-3">🛒</div>

            <p className="text-sm text-gray-500">
              Commandes
            </p>

            <p className="text-3xl font-black text-gray-900 mt-1">
              {stats.totalOrders}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm">
            <div className="text-3xl mb-3">🆕</div>

            <p className="text-sm text-gray-500">
              Nouvelles
            </p>

            <p className="text-3xl font-black text-purple-600 mt-1">
              {stats.newOrders}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-blue-100 shadow-sm">
            <div className="text-3xl mb-3">✅</div>

            <p className="text-sm text-gray-500">
              Confirmées
            </p>

            <p className="text-3xl font-black text-blue-600 mt-1">
              {stats.confirmedOrders}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm">
            <div className="text-3xl mb-3">🚚</div>

            <p className="text-sm text-gray-500">
              Livrées
            </p>

            <p className="text-3xl font-black text-emerald-600 mt-1">
              {stats.deliveredOrders}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-yellow-100 shadow-sm">
            <div className="text-3xl mb-3">💰</div>

            <p className="text-sm text-gray-500">
              Ventes
            </p>

            <p className="text-2xl font-black text-gray-900 mt-1">
              {formatPrice(stats.totalSales)} FCFA
            </p>
          </div>
        </div>

        {/* REFRESH */}
        <div className="flex justify-end mb-5">
          <button
            onClick={loadOrders}
            className="px-5 py-3 rounded-xl bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-100 transition"
          >
            🔄 Actualiser
          </button>
        </div>

        {/* EMPTY */}
        {preparedOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-14 text-center border border-gray-100 shadow-sm">
            <div className="text-7xl mb-5">🛍️</div>

            <h2 className="text-2xl font-black text-gray-900">
              Aucune commande pour le moment
            </h2>

            <p className="text-gray-500 mt-3 max-w-lg mx-auto">
              Les commandes contenant vos produits apparaîtront
              ici automatiquement.
            </p>

            <Link
              href="/seller/products"
              className="inline-block mt-7 px-6 py-3 rounded-xl bg-black text-white font-bold hover:bg-gray-800"
            >
              Voir mes produits
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {preparedOrders.map((order) => {
              const status = order.status || "Nouvelle";

              const phone = order.customer_phone
                ? normalizePhone(order.customer_phone)
                : "";

              const whatsappMessage = encodeURIComponent(
                `Bonjour ${order.customer_name || ""},\n\n` +
                  `Nous avons bien reçu votre commande ${
                    order.order_number || ""
                  } sur Ivoire Shop.\n\n` +
                  `Merci pour votre confiance.`
              );

              const whatsappUrl = phone
                ? `https://wa.me/${phone}?text=${whatsappMessage}`
                : "#";

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* ORDER HEADER */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-black text-gray-900">
                            Commande #
                            {order.order_number ||
                              order.id.slice(0, 8)}
                          </h2>

                          <span
                            className={`px-3 py-1.5 rounded-full border text-sm font-bold ${getStatusStyle(
                              status
                            )}`}
                          >
                            {getStatusEmoji(status)} {status}
                          </span>
                        </div>

                        <p className="text-gray-500 text-sm mt-2">
                          {order.created_at
                            ? new Date(
                                order.created_at
                              ).toLocaleString("fr-FR")
                            : "Date inconnue"}
                        </p>
                      </div>

                      {/* STATUS SELECT */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          value={status}
                          disabled={updatingId === order.id}
                          onChange={(e) =>
                            updateStatus(
                              order.id,
                              e.target.value
                            )
                          }
                          className={`px-4 py-3 rounded-xl border-2 font-bold outline-none cursor-pointer ${getStatusStyle(
                            status
                          )} ${
                            updatingId === order.id
                              ? "opacity-50 cursor-wait"
                              : ""
                          }`}
                        >
                          {STATUSES.map((item) => (
                            <option
                              key={item}
                              value={item}
                            >
                              {getStatusEmoji(item)} {item}
                            </option>
                          ))}
                        </select>

                        {updatingId === order.id && (
                          <span className="flex items-center text-sm font-bold text-gray-500">
                            Mise à jour...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CUSTOMER */}
                  <div className="p-6 bg-gray-50 border-b border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div>
                        <p className="text-xs uppercase tracking-wide font-bold text-gray-400">
                          Client
                        </p>

                        <p className="font-black text-gray-900 mt-1">
                          {order.customer_name ||
                            "Client"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide font-bold text-gray-400">
                          Téléphone
                        </p>

                        <p className="font-bold text-gray-900 mt-1">
                          {order.customer_phone ||
                            "Non renseigné"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide font-bold text-gray-400">
                          Commune
                        </p>

                        <p className="font-bold text-gray-900 mt-1">
                          {order.customer_commune ||
                            "Non renseignée"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide font-bold text-gray-400">
                          Paiement
                        </p>

                        <p className="font-bold text-gray-900 mt-1">
                          {order.payment_method ||
                            "Non renseigné"}
                        </p>
                      </div>
                    </div>

                    {order.customer_address && (
                      <div className="mt-5">
                        <p className="text-xs uppercase tracking-wide font-bold text-gray-400">
                          Adresse de livraison
                        </p>

                        <p className="font-bold text-gray-800 mt-1">
                          📍 {order.customer_address}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* PRODUCTS */}
                  <div className="p-6">
                    <h3 className="font-black text-lg mb-4">
                      Produits commandés
                    </h3>

                    {order.sellerProducts.length === 0 ? (
                      <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-yellow-800">
                        Aucun produit de ce vendeur n’a été
                        trouvé dans cette commande.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {order.sellerProducts.map(
                          (product, index) => {
                            const quantity =
                              Number(
                                product.quantity || 1
                              );

                            const price =
                              Number(
                                product.price || 0
                              );

                            const lineTotal =
                              price * quantity;

                            return (
                              <div
                                key={`${product.id || "product"}-${index}`}
                                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100"
                              >
                                <div className="w-20 h-20 rounded-2xl bg-white overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                                  {product.image ? (
                                    <img
                                      src={product.image}
                                      alt={
                                        product.name ||
                                        "Produit"
                                      }
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-3xl">
                                      📦
                                    </span>
                                  )}
                                </div>

                                <div className="flex-1">
                                  <h4 className="font-black text-gray-900">
                                    {product.name ||
                                      "Produit"}
                                  </h4>

                                  <p className="text-gray-500 text-sm mt-1">
                                    {formatPrice(price)} FCFA
                                    {" × "}
                                    {quantity}
                                  </p>
                                </div>

                                <div className="font-black text-lg text-gray-900">
                                  {formatPrice(
                                    lineTotal
                                  )}{" "}
                                  FCFA
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                    {/* TOTAL */}
                    <div className="mt-6 pt-5 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-gray-500 text-sm">
                          Total de vos produits
                        </p>

                        <p className="text-3xl font-black text-gray-900">
                          {formatPrice(
                            order.sellerTotal
                          )}{" "}
                          FCFA
                        </p>
                      </div>

                      {order.customer_phone && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white font-black hover:bg-green-600 transition"
                        >
                          💬 Contacter sur WhatsApp
                        </a>
                      )}
                    </div>

                    {/* NOTE */}
                    {order.customer_note && (
                      <div className="mt-5 rounded-2xl bg-yellow-50 border border-yellow-200 p-5">
                        <p className="text-xs uppercase tracking-wide font-black text-yellow-700">
                          Note du client
                        </p>

                        <p className="text-gray-800 font-medium mt-2">
                          {order.customer_note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}