"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type OrderProduct = {
id: number;
name: string;
price: number;
quantity: number;
};

type Order = {
id: number;
order_number: string;
customer_name: string;
customer_phone: string;
customer_commune: string;
customer_address: string;
payment_method: string;
products: OrderProduct[];
total: number;
customer_note?: string | null;
status?: string | null;
created_at?: string;
};

const statuses = [
"Toutes",
"Nouvelle",
"Confirmée",
"En livraison",
"Livrée",
"Annulée",
];

const formatPrice = (price: number) =>
new Intl.NumberFormat("fr-FR").format(price) + " FCFA";

const formatDate = (date?: string) => {
if (!date) return "Date inconnue";

const parsedDate = new Date(date);

if (Number.isNaN(parsedDate.getTime())) {
return "Date inconnue";
}

return new Intl.DateTimeFormat("fr-FR", {
dateStyle: "medium",
timeStyle: "short",
}).format(parsedDate);
};

const getStatusClass = (status?: string | null) => {
switch (status) {
case "Nouvelle":
return "bg-blue-50 text-blue-700 border-blue-200";
case "Confirmée":
return "bg-yellow-50 text-yellow-700 border-yellow-200";
case "En livraison":
return "bg-purple-50 text-purple-700 border-purple-200";
case "Livrée":
return "bg-green-50 text-green-700 border-green-200";
case "Annulée":
return "bg-red-50 text-red-700 border-red-200";
default:
return "bg-gray-50 text-gray-700 border-gray-200";
}
};

const getStatusDot = (status?: string | null) => {
switch (status) {
case "Nouvelle":
return "🔵";
case "Confirmée":
return "🟡";
case "En livraison":
return "🟣";
case "Livrée":
return "🟢";
case "Annulée":
return "🔴";
default:
return "⚪";
}
};

export default function AdminPage() {
const router = useRouter();

const [orders, setOrders] = useState<Order[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const [search, setSearch] = useState("");
const [selectedStatus, setSelectedStatus] = useState("Toutes");

const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
const [updatingStatus, setUpdatingStatus] = useState(false);
const [loggingOut, setLoggingOut] = useState(false);

const loadOrders = async () => {
setError("");


const result = await supabase
  .from("orders")
  .select("*")
  .order("created_at", { ascending: false });

if (result.error) {
  console.error("Erreur commandes :", result.error);
  setError(result.error.message);
  setOrders([]);
  return;
}

const formattedOrders = ((result.data || []) as Order[]).map(
  (order) => ({
    ...order,
    status: order.status || "Nouvelle",
    products: Array.isArray(order.products) ? order.products : [],
  })
);

setOrders(formattedOrders);


};

useEffect(() => {
const checkUser = async () => {
setLoading(true);


  const { data, error: authError } =
    await supabase.auth.getUser();

  if (authError || !data.user) {
    router.replace("/admin/login");
    return;
  }

  await loadOrders();

  setLoading(false);
};

checkUser();


}, [router]);

const handleLogout = async () => {
setLoggingOut(true);


await supabase.auth.signOut();

router.replace("/admin/login");


};

const filteredOrders = useMemo(() => {
const text = search.toLowerCase().trim();


return orders.filter((order) => {
  const matchesSearch =
    (order.order_number || "").toLowerCase().includes(text) ||
    (order.customer_name || "").toLowerCase().includes(text) ||
    (order.customer_phone || "").toLowerCase().includes(text) ||
    (order.customer_commune || "").toLowerCase().includes(text);

  const matchesStatus =
    selectedStatus === "Toutes" ||
    (order.status || "Nouvelle") === selectedStatus;

  return matchesSearch && matchesStatus;
});


}, [orders, search, selectedStatus]);

const totalOrders = orders.length;

const newOrders = orders.filter(
(order) => (order.status || "Nouvelle") === "Nouvelle"
).length;

const confirmedOrders = orders.filter(
(order) => order.status === "Confirmée"
).length;

const deliveredOrders = orders.filter(
(order) => order.status === "Livrée"
).length;

const totalRevenue = orders
.filter((order) => order.status !== "Annulée")
.reduce(
(total, order) => total + Number(order.total || 0),
0
);

const updateOrderStatus = async (
orderId: number,
newStatus: string
) => {
setUpdatingStatus(true);


const result = await supabase
  .from("orders")
  .update({ status: newStatus })
  .eq("id", orderId);

if (result.error) {
  console.error(
    "Erreur modification statut :",
    result.error
  );

  alert(
    "Impossible de modifier le statut.\n\n" +
      result.error.message
  );

  setUpdatingStatus(false);
  return;
}

setOrders((currentOrders) =>
  currentOrders.map((order) =>
    order.id === orderId
      ? { ...order, status: newStatus }
      : order
  )
);

setSelectedOrder((currentOrder) => {
  if (!currentOrder || currentOrder.id !== orderId) {
    return currentOrder;
  }

  return {
    ...currentOrder,
    status: newStatus,
  };
});

setUpdatingStatus(false);


};

const deleteOrder = async (order: Order) => {
const message =
'Supprimer définitivement "' +
order.order_number +
'" ?\n\nCette action est irréversible.';


if (!window.confirm(message)) {
  return;
}

const result = await supabase
  .from("orders")
  .delete()
  .eq("id", order.id);

if (result.error) {
  console.error("Erreur suppression :", result.error);

  alert(
    "Impossible de supprimer la commande.\n\n" +
      result.error.message
  );

  return;
}

setOrders((currentOrders) =>
  currentOrders.filter(
    (item) => item.id !== order.id
  )
);

setSelectedOrder(null);


};

const getWhatsAppLink = (order: Order) => {
let phone = (order.customer_phone || "").replace(
/\D/g,
""
);


if (phone.startsWith("0")) {
  phone = "225" + phone.substring(1);
}

const message =
  "Bonjour " +
  order.customer_name +
  " 👋\n\n" +
  "Votre commande " +
  order.order_number +
  " chez Ivoire Shop est actuellement : " +
  (order.status || "Nouvelle") +
  ".\n\n" +
  "Montant : " +
  formatPrice(Number(order.total || 0));

return (
  "https://wa.me/" +
  phone +
  "?text=" +
  encodeURIComponent(message)
);


};

return ( <main className="min-h-screen bg-[#f5f6f8] text-gray-900"> <header className="sticky top-0 z-40 bg-black text-white shadow-xl"> <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4"> <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"> <div className="flex items-center gap-4"> <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-black flex items-center justify-center text-2xl shadow-lg">
🇨🇮 </div>


          <div>
            <h1 className="text-xl md:text-2xl font-black">
              Ivoire Shop
            </h1>

            <p className="text-gray-400 text-xs md:text-sm">
              Administration & commandes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadOrders}
            className="bg-white/10 border border-white/10 text-white px-4 py-3 rounded-xl font-bold hover:bg-white/20 transition"
          >
            🔄 Actualiser
          </button>

          <a
            href="/admin/products"
            className="bg-white text-black px-5 py-3 rounded-xl font-black hover:bg-gray-200 transition"
          >
            🛍️ Produits
          </a>

          <a
            href="/"
            className="bg-yellow-400 text-black px-5 py-3 rounded-xl font-black hover:bg-yellow-300 transition"
          >
            🏠 Boutique
          </a>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="bg-red-600 text-white px-5 py-3 rounded-xl font-black hover:bg-red-700 transition disabled:opacity-50"
          >
            {loggingOut ? "Déconnexion..." : "🚪 Déconnexion"}
          </button>
        </div>
      </div>
    </div>
  </header>

  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold mb-4">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            ADMINISTRATION
          </div>

          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            Tableau de bord
          </h2>

          <p className="text-gray-500 mt-2">
            Gère les commandes de ta boutique depuis un seul espace.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-gray-500 font-bold uppercase">
            Aujourd'hui
          </p>

          <p className="font-black mt-1">
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "full",
            }).format(new Date())}
          </p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
        <p className="text-sm text-gray-500 font-semibold">
          Commandes
        </p>

        <p className="text-3xl font-black mt-2">
          {totalOrders}
        </p>

        <p className="text-xs text-gray-400 mt-2">
          Total enregistré
        </p>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-blue-100 shadow-sm">
        <p className="text-sm text-gray-500 font-semibold">
          Nouvelles
        </p>

        <p className="text-3xl font-black mt-2 text-blue-700">
          {newOrders}
        </p>

        <p className="text-xs text-blue-500 mt-2">
          À traiter
        </p>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-yellow-100 shadow-sm">
        <p className="text-sm text-gray-500 font-semibold">
          Confirmées
        </p>

        <p className="text-3xl font-black mt-2 text-yellow-600">
          {confirmedOrders}
        </p>

        <p className="text-xs text-yellow-600 mt-2">
          Prêtes à expédier
        </p>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-green-100 shadow-sm">
        <p className="text-sm text-gray-500 font-semibold">
          Livrées
        </p>

        <p className="text-3xl font-black mt-2 text-green-600">
          {deliveredOrders}
        </p>

        <p className="text-xs text-green-600 mt-2">
          Commandes terminées
        </p>
      </div>

      <div className="bg-black text-white rounded-3xl p-5 shadow-lg">
        <p className="text-gray-400 text-sm font-semibold">
          Chiffre d'affaires
        </p>

        <p className="text-xl md:text-2xl font-black mt-3">
          {formatPrice(totalRevenue)}
        </p>

        <p className="text-xs text-gray-400 mt-2">
          Hors commandes annulées
        </p>
      </div>
    </div>

    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-7">
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs uppercase tracking-wide text-gray-500 font-black mb-2">
            Rechercher une commande
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              🔎
            </span>

            <input
              type="text"
              placeholder="Numéro, client, téléphone, commune..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl pl-12 pr-4 py-4 outline-none focus:bg-white focus:border-black transition"
            />
          </div>
        </div>

        <div className="xl:w-72">
          <label className="block text-xs uppercase tracking-wide text-gray-500 font-black mb-2">
            Filtrer par statut
          </label>

          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value)
            }
            className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-4 outline-none focus:bg-white focus:border-black transition font-semibold"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === "Toutes"
                  ? "Tous les statuts"
                  : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          <span className="font-black text-gray-900">
            {filteredOrders.length}
          </span>{" "}
          commande
          {filteredOrders.length > 1 ? "s" : ""} affichée
          {filteredOrders.length > 1 ? "s" : ""}
        </p>

        {(search || selectedStatus !== "Toutes") && (
          <button
            onClick={() => {
              setSearch("");
              setSelectedStatus("Toutes");
            }}
            className="text-sm font-bold text-red-600 hover:text-red-700"
          >
            ✕ Réinitialiser les filtres
          </button>
        )}
      </div>
    </div>

    {error && (
      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 mb-7">
        <h3 className="font-black text-red-700 text-lg">
          Impossible de charger les commandes
        </h3>

        <p className="text-red-600 mt-2 break-words">
          {error}
        </p>

        <button
          onClick={loadOrders}
          className="mt-4 bg-red-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-700 transition"
        >
          🔄 Réessayer
        </button>
      </div>
    )}

    {loading && (
      <div className="bg-white rounded-3xl p-16 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl mx-auto animate-pulse">
          🔐
        </div>

        <h3 className="text-xl font-black mt-5">
          Vérification de la connexion...
        </h3>

        <p className="text-gray-500 mt-2">
          Sécurisation de l'espace administrateur
        </p>
      </div>
    )}

    {!loading &&
      !error &&
      filteredOrders.length === 0 && (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm">
          <div className="text-5xl">📭</div>

          <h3 className="text-2xl font-black mt-5">
            Aucune commande trouvée
          </h3>

          <p className="text-gray-500 mt-2">
            Les commandes passées depuis ta boutique apparaîtront automatiquement ici.
          </p>
        </div>
      )}

    {!loading &&
      !error &&
      filteredOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-2xl font-black">
                Commandes récentes
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                Consulte et gère les commandes de tes clients.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              Système opérationnel
            </div>
          </div>

          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="p-5 md:p-6">
                  <div className="flex flex-col xl:flex-row xl:items-center gap-6">
                    <div className="xl:w-52">
                      <p className="text-[11px] tracking-wider text-gray-400 font-black uppercase">
                        Commande
                      </p>

                      <p className="font-black text-lg mt-1">
                        {order.order_number}
                      </p>

                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="flex-1">
                      <p className="text-[11px] tracking-wider text-gray-400 font-black uppercase">
                        Client
                      </p>

                      <p className="font-black mt-1">
                        {order.customer_name}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        <p className="text-sm text-gray-500">
                          📞 {order.customer_phone}
                        </p>

                        <p className="text-sm text-gray-500">
                          📍 {order.customer_commune}
                        </p>
                      </div>
                    </div>

                    <div className="xl:w-48">
                      <p className="text-[11px] tracking-wider text-gray-400 font-black uppercase">
                        Montant
                      </p>

                      <p className="text-xl font-black mt-1">
                        {formatPrice(
                          Number(order.total || 0)
                        )}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {order.payment_method}
                      </p>
                    </div>

                    <div className="xl:w-48">
                      <p className="text-[11px] tracking-wider text-gray-400 font-black uppercase mb-2">
                        Statut
                      </p>

                      <select
                        value={
                          order.status || "Nouvelle"
                        }
                        onChange={(e) =>
                          updateOrderStatus(
                            order.id,
                            e.target.value
                          )
                        }
                        disabled={updatingStatus}
                        className={
                          "w-full px-4 py-3 rounded-xl border-2 font-bold text-sm outline-none cursor-pointer transition bg-white " +
                          getStatusClass(order.status)
                        }
                      >
                        {statuses
                          .filter(
                            (status) => status !== "Toutes"
                          )
                          .map((status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {status}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="xl:w-28">
                      <button
                        onClick={() =>
                          setSelectedOrder(order)
                        }
                        className="w-full bg-black text-white px-5 py-3.5 rounded-xl font-black hover:bg-gray-800 transition"
                      >
                        Voir
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border-t border-gray-100 px-5 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {getStatusDot(order.status)}
                    </span>

                    <span className="text-xs text-gray-500 font-semibold">
                      {order.status || "Nouvelle"} commande
                    </span>
                  </div>

                  <p className="text-xs text-gray-400">
                    {order.products.length} produit
                    {order.products.length > 1 ? "s" : ""}{" "}
                    commandé
                    {order.products.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
  </div>

  {selectedOrder && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => setSelectedOrder(null)}
      />

      <div className="relative bg-white rounded-3xl w-full max-w-3xl max-h-[94vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-5 md:p-6 flex items-center justify-between z-10">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
              Détails de la commande
            </p>

            <h2 className="text-2xl md:text-3xl font-black mt-1">
              {selectedOrder.order_number}
            </h2>
          </div>

          <button
            onClick={() => setSelectedOrder(null)}
            className="w-11 h-11 rounded-full bg-gray-100 font-bold text-xl hover:bg-gray-200 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-5 md:p-7">
          <div className="bg-gray-50 rounded-2xl p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  État de la commande
                </p>

                <p className="font-bold mt-1">
                  Mets à jour le statut après chaque étape.
                </p>
              </div>

              <div className="sm:w-56">
                <select
                  value={
                    selectedOrder.status || "Nouvelle"
                  }
                  onChange={(e) =>
                    updateOrderStatus(
                      selectedOrder.id,
                      e.target.value
                    )
                  }
                  disabled={updatingStatus}
                  className={
                    "w-full px-4 py-3 rounded-xl border-2 font-bold outline-none cursor-pointer bg-white " +
                    getStatusClass(selectedOrder.status)
                  }
                >
                  {statuses
                    .filter(
                      (status) => status !== "Toutes"
                    )
                    .map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-7">
            <h3 className="font-black text-lg mb-4">
              👤 Informations client
            </h3>

            <div className="bg-gray-50 rounded-2xl p-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <p className="text-[11px] text-gray-400 font-black uppercase">
                    Nom
                  </p>

                  <p className="font-bold mt-1">
                    {selectedOrder.customer_name}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400 font-black uppercase">
                    Téléphone
                  </p>

                  <p className="font-bold mt-1">
                    {selectedOrder.customer_phone}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400 font-black uppercase">
                    Commune
                  </p>

                  <p className="font-bold mt-1">
                    {selectedOrder.customer_commune}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400 font-black uppercase">
                    Paiement
                  </p>

                  <p className="font-bold mt-1">
                    {selectedOrder.payment_method}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-[11px] text-gray-400 font-black uppercase">
                    Adresse
                  </p>

                  <p className="font-bold mt-1 leading-relaxed">
                    {selectedOrder.customer_address}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-7">
            <h3 className="font-black text-lg mb-4">
              🛒 Produits commandés
            </h3>

            <div className="space-y-3">
              {selectedOrder.products.map(
                (product, index) => (
                  <div
                    key={product.id || index}
                    className="border border-gray-200 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-black truncate">
                          {product.name}
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                          {formatPrice(
                            Number(product.price)
                          )}{" "}
                          × {product.quantity}
                        </p>
                      </div>

                      <p className="font-black whitespace-nowrap">
                        {formatPrice(
                          Number(product.price) *
                            Number(product.quantity)
                        )}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="bg-black text-white rounded-2xl p-5 mt-4">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  TOTAL
                </span>

                <span className="text-2xl font-black">
                  {formatPrice(
                    Number(selectedOrder.total || 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          {selectedOrder.customer_note && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-7">
              <h3 className="font-black">
                📝 Note du client
              </h3>

              <p className="text-gray-700 mt-2 leading-relaxed">
                {selectedOrder.customer_note}
              </p>
            </div>
          )}

          <div className="text-sm text-gray-500 mb-6">
            Commande passée le{" "}
            <span className="font-bold text-gray-800">
              {formatDate(selectedOrder.created_at)}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <a
              href={getWhatsAppLink(selectedOrder)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-white py-4 rounded-xl font-black text-center hover:bg-green-700 transition"
            >
              💬 Contacter le client
            </a>

            <button
              onClick={() =>
                deleteOrder(selectedOrder)
              }
              className="bg-red-50 border border-red-200 text-red-700 py-4 rounded-xl font-black hover:bg-red-100 transition"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  )}
</main>


);
}
