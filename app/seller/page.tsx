"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  category: string;
  image: string;
  stock: number;
  active: boolean;
};

type Subscription = {
  plan: "pro" | "premium";
  status: string;
  ends_at: string | null;
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fr-FR").format(price) + " FCFA";

export default function SellerPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [businessName, setBusinessName] = useState("");

  const [activeMenu, setActiveMenu] =
    useState("Dashboard");

  const [showForm, setShowForm] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // =====================================================
  // ABONNEMENT
  // =====================================================

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [subscriptionChecking, setSubscriptionChecking] =
    useState(true);

  const [subscriptionLoading, setSubscriptionLoading] =
    useState(false);

  const [subscriptionPlan, setSubscriptionPlan] =
    useState<"pro" | "premium" | null>(null);

  const [subscriptionError, setSubscriptionError] =
    useState("");

  // =====================================================
  // RAPPEL OFFRES APRÈS 3 JOURS
  // =====================================================

  const [sellerCreatedAt, setSellerCreatedAt] =
    useState<string | null>(null);

  const [showUpgradeReminder, setShowUpgradeReminder] =
    useState(false);

  // =====================================================
  // FORMULAIRE PRODUIT
  // =====================================================

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");
  const [stock, setStock] = useState("");

  // =====================================================
  // CHARGEMENT PRODUITS
  // =====================================================

  const loadProducts = async (userId: string) => {
    const result = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (!result.error) {
      setProducts(
        (result.data || []) as Product[]
      );
    } else {
      console.error(
        "Erreur chargement produits :",
        result.error
      );
    }
  };

  // =====================================================
  // CHARGEMENT ABONNEMENT
  // =====================================================

  const loadSubscription = async (
    userId: string
  ) => {
    setSubscriptionChecking(true);

    const {
      data,
      error: subscriptionError,
    } = await supabase
      .from("seller_subscriptions")
      .select("plan, status, ends_at")
      .eq("seller_id", userId)
      .eq("status", "active")
      .order("ends_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      console.error(
        "Erreur chargement abonnement :",
        subscriptionError
      );

      setSubscription(null);
      setSubscriptionChecking(false);

      return;
    }

    if (!data) {
      setSubscription(null);
      setSubscriptionChecking(false);

      return;
    }

    const expired =
      data.ends_at &&
      new Date(data.ends_at) <= new Date();

    if (expired) {
      setSubscription(null);
      setSubscriptionChecking(false);

      return;
    }

    setSubscription(
      data as Subscription
    );

    setSubscriptionChecking(false);
  };

  // =====================================================
  // VÉRIFICATION RAPPEL APRÈS 3 JOURS
  // =====================================================

  const checkUpgradeReminder = (
    createdAt: string,
    currentSubscription: Subscription | null
  ) => {
    // Si le vendeur possède déjà un abonnement,
    // aucun rappel ne doit apparaître.
    if (currentSubscription) {
      setShowUpgradeReminder(false);
      return;
    }

    const createdDate =
      new Date(createdAt);

    const now = new Date();

    const difference =
      now.getTime() -
      createdDate.getTime();

    const threeDays =
      3 * 24 * 60 * 60 * 1000;

    // Le rappel apparaît après 3 jours.
    if (difference >= threeDays) {
      setShowUpgradeReminder(true);
    } else {
      setShowUpgradeReminder(false);
    }
  };

  // =====================================================
  // VÉRIFICATION ACCÈS VENDEUR
  // =====================================================

  useEffect(() => {
    const checkAccess = async () => {
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

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "role, business_name, created_at"
        )
        .eq(
          "id",
          authData.user.id
        )
        .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "seller"
      ) {
        router.replace("/");
        return;
      }

      setBusinessName(
        profile.business_name ||
          "Ma boutique"
      );

      setSellerCreatedAt(
        profile.created_at || null
      );

      await loadProducts(
        authData.user.id
      );

      await loadSubscription(
        authData.user.id
      );

      setLoading(false);
    };

    checkAccess();
  }, [router]);

  // =====================================================
  // RAPPEL APRÈS CHARGEMENT
  // =====================================================

  useEffect(() => {
    if (
      sellerCreatedAt &&
      !subscriptionChecking
    ) {
      checkUpgradeReminder(
        sellerCreatedAt,
        subscription
      );
    }
  }, [
    sellerCreatedAt,
    subscription,
    subscriptionChecking,
  ]);

  // =====================================================
  // DÉCONNEXION
  // =====================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.replace("/");
  };

  // =====================================================
  // NAVIGATION COMMANDES
  // =====================================================

  const openOrders = () => {
    router.push("/seller/orders");
  };

  // =====================================================
  // PAIEMENT ABONNEMENT PAYSTACK
  // =====================================================

  const handleSubscription = async (
    plan: "pro" | "premium"
  ) => {
    try {
      setSubscriptionLoading(true);
      setSubscriptionPlan(plan);
      setSubscriptionError("");

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        setSubscriptionError(
          "Votre session a expiré. Reconnectez-vous."
        );

        setSubscriptionLoading(false);
        setSubscriptionPlan(null);

        return;
      }

      const user = authData.user;

      if (!user.email) {
        setSubscriptionError(
          "Votre compte ne possède pas d'adresse email."
        );

        setSubscriptionLoading(false);
        setSubscriptionPlan(null);

        return;
      }

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            "full_name, phone, business_name"
          )
          .eq("id", user.id)
          .single();

      if (profileError) {
        console.error(
          "Erreur profil vendeur :",
          profileError
        );

        setSubscriptionError(
          "Impossible de récupérer votre profil vendeur."
        );

        setSubscriptionLoading(false);
        setSubscriptionPlan(null);

        return;
      }

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
              email: user.email,
              userId: user.id,
              plan,

              customerName:
                profile?.business_name ||
                profile?.full_name ||
                businessName ||
                "",

              customerPhone:
                profile?.phone || "",
            }),
          }
        );

      let data: any;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          "Le serveur a renvoyé une réponse invalide."
        );
      }

      if (
        !response.ok ||
        !data.authorization_url
      ) {
        throw new Error(
          data.error ||
            "Impossible d'initialiser le paiement."
        );
      }

      window.location.href =
        data.authorization_url;
    } catch (error) {
      console.error(
        "Erreur abonnement Paystack :",
        error
      );

      setSubscriptionError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors du paiement."
      );

      setSubscriptionLoading(false);
      setSubscriptionPlan(null);
    }
  };

  // =====================================================
  // AJOUT PRODUIT
  // =====================================================

  const handleAddProduct = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSaving(true);

    const {
      data: authData,
    } =
      await supabase.auth.getUser();

    if (!authData.user) {
      setError(
        "Session expirée. Reconnecte-toi."
      );

      setSaving(false);

      return;
    }

    const result =
      await supabase
        .from("products")
        .insert({
          name: name.trim(),

          description:
            description.trim(),

          price: Number(price),

          category:
            category.trim(),

          image:
            image.trim(),

          stock: Number(stock),

          active: true,

          seller_id:
            authData.user.id,
        });

    if (result.error) {
      console.error(
        result.error
      );

      setError(
        result.error.message
      );

      setSaving(false);

      return;
    }

    setName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setImage("");
    setStock("");

    setShowForm(false);
    setSaving(false);

    await loadProducts(
      authData.user.id
    );
  };

  // =====================================================
  // STATISTIQUES
  // =====================================================

  const statistics = useMemo(() => {
    const totalProducts =
      products.length;

    const activeProducts =
      products.filter(
        (product) =>
          product.active
      ).length;

    const totalStock =
      products.reduce(
        (total, product) =>
          total +
          (product.stock || 0),
        0
      );

    const outOfStock =
      products.filter(
        (product) =>
          product.stock <= 0
      ).length;

    return {
      totalProducts,
      activeProducts,
      totalStock,
      outOfStock,
    };
  }, [products]);

  // =====================================================
  // NOM ABONNEMENT
  // =====================================================

  const subscriptionName =
    subscription?.plan === "pro"
      ? "Pro"
      : subscription?.plan ===
        "premium"
      ? "Premium"
      : "Gratuit";

  // =====================================================
  // DATE EXPIRATION
  // =====================================================

  const formattedEndDate =
    subscription?.ends_at
      ? new Date(
          subscription.ends_at
        ).toLocaleDateString(
          "fr-FR"
        )
      : null;

  // =====================================================
  // CHARGEMENT
  // =====================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-yellow-50 flex items-center justify-center">

        <div className="text-center bg-white rounded-3xl shadow-xl border border-gray-100 p-10">

          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-5" />

          <p className="font-black text-gray-800">
            Chargement de votre espace vendeur...
          </p>

          <p className="text-sm text-gray-400 mt-2">
            Ivoire Shop
          </p>

        </div>

      </main>
    );
  }

  // =====================================================
  // MENU
  // =====================================================

  const menuItems = [
    {
      name: "Dashboard",
      icon: "📊",
      color: "blue",
    },

    {
      name: "Mes produits",
      icon: "📦",
      color: "purple",
    },

    {
      name: "Commandes",
      icon: "🛒",
      color: "orange",
    },

    {
      name: "Revenus",
      icon: "💰",
      color: "green",
    },

    {
      name: "Ma boutique",
      icon: "🏪",
      color: "pink",
    },

    {
      name: "Mon profil",
      icon: "👤",
      color: "cyan",
    },

    {
      name: "Mon abonnement",
      icon: "💎",
      color: "yellow",
    },

    {
      name: "Paramètres",
      icon: "⚙️",
      color: "gray",
    },
  ];

  const handleMenuClick = (
    menuName: string
  ) => {
    if (
      menuName ===
      "Mon profil"
    ) {
      router.push(
        "/seller/profile"
      );

      return;
    }

    if (
      menuName ===
      "Commandes"
    ) {
      openOrders();
      return;
    }

    if (
      menuName ===
      "Mon abonnement"
    ) {
      setActiveMenu(
        "Mon abonnement"
      );

      return;
    }

    setActiveMenu(menuName);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#fffbea] text-gray-900">

      <div className="flex min-h-screen">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="hidden lg:flex w-72 bg-white border-r border-gray-200 flex-col fixed left-0 top-0 bottom-0 shadow-sm">

          {/* LOGO */}

          <div className="px-7 py-7 border-b border-gray-100 bg-gradient-to-r from-white to-yellow-50">

            <button
              onClick={() =>
                router.push("/")
              }
              className="text-left"
            >

              <div className="flex items-center gap-3">

                <div className="w-12 h-12 bg-gradient-to-br from-black to-gray-700 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">
                  IS
                </div>

                <div>

                  <p className="font-black text-lg leading-none">
                    🇨🇮 Ivoire Shop
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    Espace vendeur
                  </p>

                </div>

              </div>

            </button>

          </div>

          {/* MENU */}

          <div className="px-5 pt-6">

            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 px-3 mb-3">
              Gestion de ma boutique
            </p>

            <nav className="space-y-2">

              {menuItems.map(
                (item) => {

                  const active =
                    activeMenu ===
                    item.name;

                  return (
                    <button
                      key={
                        item.name
                      }
                      onClick={() =>
                        handleMenuClick(
                          item.name
                        )
                      }
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        active
                          ? "bg-black text-white shadow-lg scale-[1.01]"
                          : "text-gray-600 hover:bg-gray-100 hover:text-black"
                      }`}
                    >

                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                          active
                            ? "bg-white/10"
                            : "bg-gray-50"
                        }`}
                      >
                        {item.icon}
                      </span>

                      <span>
                        {item.name}
                      </span>

                      {item.name ===
                        "Mon abonnement" && (
                        <span
                          className={`ml-auto text-[10px] px-2 py-1 rounded-full font-black ${
                            active
                              ? "bg-white text-black"
                              : subscription?.plan ===
                                "premium"
                              ? "bg-yellow-100 text-yellow-700"
                              : subscription?.plan ===
                                "pro"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {subscriptionChecking
                            ? "..."
                            : subscriptionName.toUpperCase()}
                        </span>
                      )}

                    </button>
                  );
                }
              )}

            </nav>

          </div>

          {/* BAS */}

          <div className="mt-auto p-5 border-t border-gray-100">

            <button
              onClick={() =>
                router.push("/")
              }
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition"
            >

              <span>🌐</span>

              Voir la boutique

            </button>

            <button
              onClick={
                handleLogout
              }
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition mt-1"
            >

              <span>↪</span>

              Déconnexion

            </button>

          </div>

        </aside>

        {/* =================================================
            CONTENU
        ================================================= */}

        <div className="lg:ml-72 flex-1">

          {/* HEADER */}

          <header className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-20 shadow-sm">

            <div className="px-5 sm:px-8 py-4 flex items-center justify-between">

              <div>

                <p className="text-xs font-black text-yellow-600">
                  🇨🇮 ESPACE VENDEUR
                </p>

                <h1 className="text-xl sm:text-2xl font-black mt-1">
                  {businessName}
                </h1>

              </div>

              <div className="flex items-center gap-2">

                <button
                  onClick={() =>
                    router.push("/")
                  }
                  className="hidden sm:flex items-center gap-2 bg-gray-100 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                >
                  🌐 Boutique
                </button>

                <button
                  onClick={openOrders}
                  className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2.5 rounded-xl font-black text-sm hover:bg-orange-100 transition"
                >
                  🛒 Commandes
                </button>

                <button
                  className="w-11 h-11 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center hover:bg-yellow-100 transition"
                  title="Notifications"
                >
                  🔔
                </button>

                <button
                  onClick={() =>
                    router.push(
                      "/seller/profile"
                    )
                  }
                  className="w-11 h-11 rounded-xl bg-black text-white flex items-center justify-center font-black hover:bg-gray-800 transition shadow-lg"
                  title="Mon profil"
                >
                  {businessName
                    ? businessName
                        .charAt(0)
                        .toUpperCase()
                    : "V"}
                </button>

              </div>

            </div>

          </header>

          {/* MOBILE MENU */}

          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 overflow-x-auto shadow-sm">

            <div className="flex gap-2 min-w-max">

              {menuItems.map(
                (item) => (

                  <button
                    key={
                      item.name
                    }
                    onClick={() =>
                      handleMenuClick(
                        item.name
                      )
                    }
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                      activeMenu ===
                      item.name
                        ? "bg-black text-white shadow"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >

                    {item.icon}{" "}
                    {item.name}

                  </button>

                )
              )}

            </div>

          </div>

          {/* CONTENU */}

          <div className="p-5 sm:p-8 max-w-7xl mx-auto">

            {/* =================================================
                RAPPEL OFFRES APRÈS 3 JOURS
            ================================================= */}

            {showUpgradeReminder &&
              !subscription &&
              activeMenu ===
                "Dashboard" && (
                <div className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white shadow-2xl">

                  <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl" />

                  <div className="absolute -bottom-20 -left-10 w-52 h-52 bg-pink-500/20 rounded-full blur-3xl" />

                  <div className="relative p-6 sm:p-8">

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                      <div className="flex items-start gap-4">

                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-yellow-400 text-black flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
                          🚀
                        </div>

                        <div>

                          <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-xs font-black mb-3">
                            ✨ VOTRE BOUTIQUE PEUT ALLER PLUS LOIN
                          </div>

                          <h2 className="text-2xl sm:text-3xl font-black">
                            Passez à une offre supérieure
                          </h2>

                          <p className="text-purple-100 mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
                            Votre boutique est actuellement
                            en formule gratuite. Développez
                            vos ventes avec plus de visibilité,
                            de statistiques et de fonctionnalités
                            professionnelles.
                          </p>

                          <div className="flex flex-wrap gap-3 mt-4">

                            <span className="bg-white/10 px-3 py-2 rounded-xl text-xs font-bold">
                              📈 Plus de visibilité
                            </span>

                            <span className="bg-white/10 px-3 py-2 rounded-xl text-xs font-bold">
                              📊 Statistiques avancées
                            </span>

                            <span className="bg-white/10 px-3 py-2 rounded-xl text-xs font-bold">
                              ⭐ Mise en avant
                            </span>

                          </div>

                        </div>

                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[210px]">

                        <button
                          onClick={() => {
                            setShowUpgradeReminder(
                              false
                            );

                            setActiveMenu(
                              "Mon abonnement"
                            );
                          }}
                          className="bg-yellow-400 text-black px-6 py-3.5 rounded-xl font-black hover:bg-yellow-300 transition shadow-lg"
                        >
                          💎 Voir les offres
                        </button>

                        <button
                          onClick={() =>
                            setShowUpgradeReminder(
                              false
                            )
                          }
                          className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition"
                        >
                          Plus tard
                        </button>

                      </div>

                    </div>

                  </div>

                </div>
              )}

            {/* =================================================
                DASHBOARD
            ================================================= */}

            {activeMenu ===
              "Dashboard" && (
              <>

                <div className="mb-8">

                  <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-xs font-black mb-3">
                    ✨ Bienvenue vendeur
                  </div>

                  <p className="text-gray-500">
                    Gérez votre activité sur
                    Ivoire Shop.
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Tableau de bord
                  </h2>

                </div>

                {/* STATISTIQUES */}

                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">

                  {/* PRODUITS */}

                  <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-3xl p-6 shadow-lg">

                    <div className="flex justify-between items-start">

                      <div>

                        <p className="text-sm font-bold text-blue-100">
                          Produits
                        </p>

                        <p className="text-4xl font-black mt-2">
                          {
                            statistics.totalProducts
                          }
                        </p>

                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">
                        📦
                      </div>

                    </div>

                    <p className="text-xs text-blue-100 mt-4">
                      Produits enregistrés
                    </p>

                  </div>

                  {/* PRODUITS ACTIFS */}

                  <div className="bg-gradient-to-br from-emerald-500 to-green-700 text-white rounded-3xl p-6 shadow-lg">

                    <div className="flex justify-between items-start">

                      <div>

                        <p className="text-sm font-bold text-green-100">
                          Produits actifs
                        </p>

                        <p className="text-4xl font-black mt-2">
                          {
                            statistics.activeProducts
                          }
                        </p>

                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">
                        ✓
                      </div>

                    </div>

                    <p className="text-xs text-green-100 mt-4">
                      Visibles sur la boutique
                    </p>

                  </div>

                  {/* STOCK */}

                  <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-3xl p-6 shadow-lg">

                    <div className="flex justify-between items-start">

                      <div>

                        <p className="text-sm font-bold text-orange-100">
                          Stock total
                        </p>

                        <p className="text-4xl font-black mt-2">
                          {
                            statistics.totalStock
                          }
                        </p>

                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">
                        📊
                      </div>

                    </div>

                    <p className="text-xs text-orange-100 mt-4">
                      Articles disponibles
                    </p>

                  </div>

                  {/* RUPTURES */}

                  <div className="bg-gradient-to-br from-red-500 to-rose-700 text-white rounded-3xl p-6 shadow-lg">

                    <div className="flex justify-between items-start">

                      <div>

                        <p className="text-sm font-bold text-red-100">
                          Ruptures
                        </p>

                        <p className="text-4xl font-black mt-2">
                          {
                            statistics.outOfStock
                          }
                        </p>

                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">
                        ⚠️
                      </div>

                    </div>

                    <p className="text-xs text-red-100 mt-4">
                      Produits sans stock
                    </p>

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="grid lg:grid-cols-3 gap-5 mb-8">

                  {/* PRODUIT */}

                  <button
                    onClick={() => {
                      setActiveMenu(
                        "Mes produits"
                      );

                      setShowForm(
                        true
                      );
                    }}
                    className="bg-gradient-to-br from-gray-900 to-black text-white rounded-3xl p-6 text-left hover:shadow-xl hover:-translate-y-1 transition-all"
                  >

                    <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-3xl mb-5">
                      ＋
                    </div>

                    <p className="font-black text-lg">
                      Ajouter un produit
                    </p>

                    <p className="text-sm text-gray-400 mt-2">
                      Mettez un nouveau
                      produit en vente.
                    </p>

                  </button>

                  {/* COMMANDES */}

                  <button
                    onClick={
                      openOrders
                    }
                    className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-3xl p-6 text-left hover:shadow-xl hover:-translate-y-1 transition-all"
                  >

                    <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-3xl mb-5">
                      🛒
                    </div>

                    <p className="font-black text-lg text-gray-900">
                      Gérer les commandes
                    </p>

                    <p className="text-sm text-gray-600 mt-2">
                      Consultez les commandes
                      contenant vos produits.
                    </p>

                    <div className="mt-5 inline-flex bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-black">
                      Voir mes commandes →
                    </div>

                  </button>

                  {/* ABONNEMENT */}

                  <button
                    onClick={() =>
                      setActiveMenu(
                        "Mon abonnement"
                      )
                    }
                    className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-3xl p-6 text-left hover:shadow-xl hover:-translate-y-1 transition-all"
                  >

                    <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl mb-5">
                      💎
                    </div>

                    <p className="font-black text-lg">
                      Développer ma boutique
                    </p>

                    <p className="text-sm text-purple-100 mt-2">
                      Pro à 3 000 FCFA et
                      Premium à 5 000 FCFA.
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 bg-white text-purple-700 px-4 py-2 rounded-xl text-xs font-black">
                      Voir les offres →
                    </div>

                  </button>

                </div>

                {/* PRODUITS RÉCENTS */}

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">

                    <div>

                      <h3 className="text-lg font-black">
                        Produits récents
                      </h3>

                      <p className="text-sm text-gray-400 mt-1">
                        Vos derniers produits
                        ajoutés.
                      </p>

                    </div>

                    <button
                      onClick={() =>
                        setActiveMenu(
                          "Mes produits"
                        )
                      }
                      className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-black hover:bg-blue-100 transition"
                    >
                      Voir tout →
                    </button>

                  </div>

                  {products.length ===
                  0 ? (
                    <div className="p-10 text-center">

                      <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 flex items-center justify-center text-4xl mb-4">
                        📦
                      </div>

                      <p className="font-black">
                        Votre catalogue est
                        vide
                      </p>

                      <p className="text-sm text-gray-500 mt-2 mb-5">
                        Ajoutez votre premier
                        produit pour commencer
                        à vendre.
                      </p>

                      <button
                        onClick={() => {
                          setActiveMenu(
                            "Mes produits"
                          );

                          setShowForm(
                            true
                          );
                        }}
                        className="bg-black text-white px-5 py-3 rounded-xl font-black hover:bg-gray-800"
                      >
                        + Ajouter mon
                        premier produit
                      </button>

                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">

                      {products
                        .slice(0, 5)
                        .map(
                          (
                            product
                          ) => (
                            <div
                              key={
                                product.id
                              }
                              className="p-5 flex items-center gap-4 hover:bg-gray-50 transition"
                            >

                              <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0">

                                {product.image ? (
                                  <img
                                    src={
                                      product.image
                                    }
                                    alt={
                                      product.name
                                    }
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xl">
                                    📦
                                  </div>
                                )}

                              </div>

                              <div className="min-w-0 flex-1">

                                <p className="font-black truncate">
                                  {
                                    product.name
                                  }
                                </p>

                                <p className="text-sm text-gray-400">
                                  {
                                    product.category
                                  }
                                </p>

                              </div>

                              <div className="text-right">

                                <p className="font-black">
                                  {formatPrice(
                                    product.price
                                  )}
                                </p>

                                <p className="text-xs text-gray-400 mt-1">
                                  Stock :{" "}
                                  {
                                    product.stock
                                  }
                                </p>

                              </div>

                            </div>
                          )
                        )}

                    </div>
                  )}

                </div>

              </>
            )}

            {/* =================================================
                MES PRODUITS
            ================================================= */}

            {activeMenu ===
              "Mes produits" && (
              <>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">

                  <div>

                    <span className="inline-flex bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-black mb-3">
                      📦 CATALOGUE
                    </span>

                    <p className="text-gray-500">
                      Gérez votre catalogue.
                    </p>

                    <h2 className="text-3xl font-black mt-1">
                      Mes produits
                    </h2>

                  </div>

                  <button
                    onClick={() =>
                      setShowForm(
                        !showForm
                      )
                    }
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-xl font-black hover:from-purple-700 hover:to-indigo-700 shadow-lg transition"
                  >
                    {showForm
                      ? "Annuler"
                      : "+ Ajouter un produit"}
                  </button>

                </div>

                {showForm && (
                  <form
                    onSubmit={
                      handleAddProduct
                    }
                    className="bg-white rounded-3xl p-6 sm:p-8 mb-8 shadow-lg border border-purple-100"
                  >

                    <div className="mb-6">

                      <span className="inline-flex bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black">
                        NOUVEAU PRODUIT
                      </span>

                      <h3 className="text-xl font-black mt-3">
                        Ajouter un produit
                      </h3>

                      <p className="text-sm text-gray-500 mt-1">
                        Présentez votre produit
                        aux clients d'Ivoire
                        Shop.
                      </p>

                    </div>

                    <div className="grid md:grid-cols-2 gap-4">

                      <div className="md:col-span-2">

                        <label className="block text-sm font-black mb-2">
                          Nom du produit
                        </label>

                        <input
                          type="text"
                          placeholder="Ex : iPhone 15 Pro"
                          value={name}
                          onChange={(e) =>
                            setName(
                              e.target.value
                            )
                          }
                          required
                          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 outline-none focus:border-purple-500 focus:bg-white"
                        />

                      </div>

                      <div className="md:col-span-2">

                        <label className="block text-sm font-black mb-2">
                          Description
                        </label>

                        <textarea
                          placeholder="Décrivez votre produit..."
                          value={
                            description
                          }
                          onChange={(e) =>
                            setDescription(
                              e.target.value
                            )
                          }
                          required
                          rows={4}
                          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 outline-none focus:border-purple-500 focus:bg-white resize-none"
                        />

                      </div>

                      <div>

                        <label className="block text-sm font-black mb-2">
                          Prix
                        </label>

                        <div className="relative">

                          <input
                            type="number"
                            placeholder="150000"
                            value={price}
                            onChange={(e) =>
                              setPrice(
                                e.target.value
                              )
                            }
                            required
                            min="0"
                            className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 pr-20 outline-none focus:border-purple-500 focus:bg-white"
                          />

                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-purple-500">
                            FCFA
                          </span>

                        </div>

                      </div>

                      <div>

                        <label className="block text-sm font-black mb-2">
                          Stock
                        </label>

                        <input
                          type="number"
                          placeholder="10"
                          value={stock}
                          onChange={(e) =>
                            setStock(
                              e.target.value
                            )
                          }
                          required
                          min="0"
                          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 outline-none focus:border-purple-500 focus:bg-white"
                        />

                      </div>

                      <div>

                        <label className="block text-sm font-black mb-2">
                          Catégorie
                        </label>

                        <input
                          type="text"
                          placeholder="Ex : Électronique"
                          value={category}
                          onChange={(e) =>
                            setCategory(
                              e.target.value
                            )
                          }
                          required
                          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 outline-none focus:border-purple-500 focus:bg-white"
                        />

                      </div>

                      <div>

                        <label className="block text-sm font-black mb-2">
                          Image du produit
                        </label>

                        <input
                          type="text"
                          placeholder="/products/mon-produit.jpg"
                          value={image}
                          onChange={(e) =>
                            setImage(
                              e.target.value
                            )
                          }
                          required
                          className="w-full border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 outline-none focus:border-purple-500 focus:bg-white"
                        />

                      </div>

                    </div>

                    {error && (
                      <div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold">
                        ⚠️ {error}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 mt-6">

                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-black hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50"
                      >
                        {saving
                          ? "Enregistrement..."
                          : "✓ Enregistrer le produit"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setShowForm(
                            false
                          )
                        }
                        className="px-6 py-4 rounded-xl font-black bg-gray-100 hover:bg-gray-200"
                      >
                        Annuler
                      </button>

                    </div>

                  </form>
                )}

                {products.length ===
                0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">

                    <div className="w-24 h-24 mx-auto rounded-3xl bg-purple-50 flex items-center justify-center text-5xl mb-5">
                      📦
                    </div>

                    <h3 className="text-xl font-black">
                      Aucun produit
                    </h3>

                    <p className="text-gray-500 mt-2 mb-6">
                      Votre catalogue ne
                      contient encore aucun
                      produit.
                    </p>

                    <button
                      onClick={() =>
                        setShowForm(
                          true
                        )
                      }
                      className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black hover:bg-purple-700"
                    >
                      + Ajouter un produit
                    </button>

                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">

                    {products.map(
                      (product) => (
                        <div
                          key={
                            product.id
                          }
                          className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition"
                        >

                          <div className="h-52 bg-gray-100">

                            {product.image ? (
                              <img
                                src={
                                  product.image
                                }
                                alt={
                                  product.name
                                }
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-5xl">
                                📦
                              </div>
                            )}

                          </div>

                          <div className="p-5">

                            <div className="flex items-start justify-between gap-3">

                              <div>

                                <h3 className="font-black text-lg">
                                  {
                                    product.name
                                  }
                                </h3>

                                <p className="text-sm text-purple-500 font-bold mt-1">
                                  {
                                    product.category
                                  }
                                </p>

                              </div>

                              <span
                                className={`text-xs font-black px-2.5 py-1 rounded-full ${
                                  product.active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {product.active
                                  ? "✓ Actif"
                                  : "Inactif"}
                              </span>

                            </div>

                            <p className="font-black text-xl mt-4">
                              {formatPrice(
                                product.price
                              )}
                            </p>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">

                              <span className="text-sm text-gray-500">
                                Stock
                              </span>

                              <span
                                className={`font-black ${
                                  product.stock <=
                                  0
                                    ? "text-red-600"
                                    : product.stock <=
                                      5
                                    ? "text-orange-600"
                                    : "text-green-600"
                                }`}
                              >
                                {
                                  product.stock
                                }
                              </span>

                            </div>

                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}

              </>
            )}

            {/* =================================================
                COMMANDES
            ================================================= */}

            {activeMenu ===
              "Commandes" && (
              <div>

                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-7 sm:p-8 mb-8 shadow-xl">

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                    <div>

                      <span className="inline-flex bg-white/20 px-3 py-1.5 rounded-full text-xs font-black mb-3">
                        🛒 VENTES
                      </span>

                      <h2 className="text-3xl font-black">
                        Mes commandes
                      </h2>

                      <p className="text-orange-50 mt-2">
                        Consultez toutes les commandes
                        contenant vos produits.
                      </p>

                    </div>

                    <button
                      onClick={
                        openOrders
                      }
                      className="bg-white text-orange-600 px-6 py-3 rounded-xl font-black hover:bg-orange-50 transition shadow-lg"
                    >
                      Ouvrir mes commandes →
                    </button>

                  </div>

                </div>

                <div className="grid md:grid-cols-3 gap-5">

                  <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm">

                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl mb-4">
                      🛒
                    </div>

                    <p className="text-sm font-bold text-gray-400">
                      Commandes
                    </p>

                    <p className="text-3xl font-black mt-2">
                      Voir
                    </p>

                    <p className="text-sm text-gray-500 mt-2">
                      Toutes vos commandes
                    </p>

                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-green-100 shadow-sm">

                    <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-2xl mb-4">
                      💰
                    </div>

                    <p className="text-sm font-bold text-gray-400">
                      Ventes
                    </p>

                    <p className="text-3xl font-black mt-2">
                      Suivre
                    </p>

                    <p className="text-sm text-gray-500 mt-2">
                      Suivez vos ventes
                    </p>

                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-blue-100 shadow-sm">

                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl mb-4">
                      📋
                    </div>

                    <p className="text-sm font-bold text-gray-400">
                      Gestion
                    </p>

                    <p className="text-3xl font-black mt-2">
                      Simple
                    </p>

                    <p className="text-sm text-gray-500 mt-2">
                      Gérez vos clients
                    </p>

                  </div>

                </div>

                <button
                  onClick={
                    openOrders
                  }
                  className="mt-6 w-full bg-black text-white rounded-2xl py-4 font-black hover:bg-gray-800 transition"
                >
                  🛒 Accéder à la page complète des commandes
                </button>

              </div>
            )}

            {/* =================================================
                REVENUS
            ================================================= */}

            {activeMenu ===
              "Revenus" && (
              <div>

                <div className="mb-8">

                  <span className="inline-flex bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-black mb-3">
                    💰 FINANCES
                  </span>

                  <p className="text-gray-500">
                    Suivez vos performances
                    commerciales.
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Revenus
                  </h2>

                </div>

                <div className="grid sm:grid-cols-3 gap-5 mb-8">

                  <div className="bg-gradient-to-br from-green-500 to-emerald-700 text-white rounded-3xl p-6 shadow-lg">

                    <p className="text-sm font-bold text-green-100">
                      Chiffre d'affaires
                    </p>

                    <p className="text-3xl font-black mt-3">
                      0 FCFA
                    </p>

                    <p className="text-xs text-green-100 mt-2">
                      Aucune commande
                      enregistrée
                    </p>

                  </div>

                  <div className="bg-gradient-to-br from-blue-500 to-indigo-700 text-white rounded-3xl p-6 shadow-lg">

                    <p className="text-sm font-bold text-blue-100">
                      Commandes
                    </p>

                    <p className="text-3xl font-black mt-3">
                      0
                    </p>

                    <p className="text-xs text-blue-100 mt-2">
                      En attente de ventes
                    </p>

                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-violet-700 text-white rounded-3xl p-6 shadow-lg">

                    <p className="text-sm font-bold text-purple-100">
                      Solde
                    </p>

                    <p className="text-3xl font-black mt-3">
                      0 FCFA
                    </p>

                    <p className="text-xs text-purple-100 mt-2">
                      Aucun paiement
                      disponible
                    </p>

                  </div>

                </div>

                <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">

                  <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center text-4xl mx-auto mb-5">
                    📈
                  </div>

                  <p className="font-black text-lg">
                    Statistiques financières
                  </p>

                  <p className="text-gray-500 mt-2">
                    Les statistiques seront
                    activées avec le système
                    de commandes et de
                    paiement.
                  </p>

                </div>

              </div>
            )}

            {/* =================================================
                MA BOUTIQUE
            ================================================= */}

            {activeMenu ===
              "Ma boutique" && (
              <div>

                <div className="mb-8">

                  <span className="inline-flex bg-pink-100 text-pink-700 px-3 py-1.5 rounded-full text-xs font-black mb-3">
                    🏪 BOUTIQUE
                  </span>

                  <p className="text-gray-500">
                    Gérez la présentation de
                    votre boutique.
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Ma boutique
                  </h2>

                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">

                  <div className="flex items-center gap-5 pb-6 border-b border-gray-100">

                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center text-2xl font-black shadow-lg">
                      {businessName
                        ? businessName
                            .charAt(0)
                            .toUpperCase()
                        : "V"}
                    </div>

                    <div>

                      <h3 className="text-2xl font-black">
                        {businessName}
                      </h3>

                      <p className="text-gray-500 mt-1">
                        Boutique partenaire
                        Ivoire Shop
                      </p>

                    </div>

                  </div>

                  <div className="mt-6 grid sm:grid-cols-2 gap-4">

                    <div className="bg-purple-50 rounded-2xl p-5">

                      <p className="text-xs font-black uppercase text-purple-500">
                        Produits
                      </p>

                      <p className="text-2xl font-black mt-2">
                        {
                          statistics.totalProducts
                        }
                      </p>

                    </div>

                    <div className="bg-pink-50 rounded-2xl p-5">

                      <p className="text-xs font-black uppercase text-pink-500">
                        Stock
                      </p>

                      <p className="text-2xl font-black mt-2">
                        {
                          statistics.totalStock
                        }
                      </p>

                    </div>

                  </div>

                  <button
                    onClick={() =>
                      router.push("/")
                    }
                    className="mt-6 bg-black text-white px-6 py-3 rounded-xl font-black"
                  >
                    🌐 Voir ma boutique
                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                MON PROFIL
            ================================================= */}

            {activeMenu ===
              "Mon profil" && (
              <div>

                <div className="mb-8">

                  <span className="inline-flex bg-cyan-100 text-cyan-700 px-3 py-1.5 rounded-full text-xs font-black mb-3">
                    👤 COMPTE
                  </span>

                  <p className="text-gray-500">
                    Gérez vos informations
                    personnelles et
                    professionnelles.
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Mon profil
                  </h2>

                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">

                  <div className="flex items-center gap-5 mb-8 pb-6 border-b border-gray-100">

                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center text-xl font-black">
                      {businessName
                        ? businessName
                            .charAt(0)
                            .toUpperCase()
                        : "V"}
                    </div>

                    <div>

                      <h3 className="text-xl font-black">
                        {businessName ||
                          "Ma boutique"}
                      </h3>

                      <p className="text-sm text-gray-500 mt-1">
                        Profil vendeur
                      </p>

                    </div>

                  </div>

                  <p className="text-gray-500 mb-5">
                    Modifiez vos informations
                    personnelles et
                    professionnelles.
                  </p>

                  <button
                    onClick={() =>
                      router.push(
                        "/seller/profile"
                      )
                    }
                    className="bg-cyan-600 text-white px-6 py-3 rounded-xl font-black hover:bg-cyan-700 transition"
                  >
                    Gérer mon profil →
                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                ABONNEMENT
            ================================================= */}

            {activeMenu ===
              "Mon abonnement" && (
              <div>

                <div className="mb-8">

                  <span className="inline-flex bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-black mb-3">
                    💎 PREMIUM
                  </span>

                  <p className="text-gray-500">
                    Développez votre boutique
                    avec des fonctionnalités
                    professionnelles.
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Mon abonnement
                  </h2>

                </div>

                {subscriptionError && (
                  <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">

                    <div className="flex items-start gap-3">

                      <span className="text-xl">
                        ⚠️
                      </span>

                      <div>

                        <p className="font-black">
                          Paiement impossible
                        </p>

                        <p className="text-sm mt-1">
                          {
                            subscriptionError
                          }
                        </p>

                      </div>

                    </div>

                  </div>
                )}

                {/* OFFRE ACTUELLE */}

                <div className="bg-gradient-to-br from-gray-900 via-black to-purple-950 text-white rounded-3xl p-7 sm:p-8 mb-6 shadow-xl">

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                    <div>

                      <div className="flex items-center gap-3 mb-3">

                        <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-black flex items-center justify-center text-2xl">
                          💎
                        </div>

                        <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                          Offre actuelle
                        </span>

                      </div>

                      <h3 className="text-3xl font-black">
                        {subscriptionChecking
                          ? "Vérification..."
                          : subscriptionName}
                      </h3>

                      <p className="text-gray-400 mt-2">

                        {subscription?.ends_at
                          ? `Votre abonnement ${
                              subscription.plan ===
                              "pro"
                                ? "Pro"
                                : "Premium"
                            } est actif jusqu'au ${formattedEndDate}.`
                          : "Commencez gratuitement et passez à une offre supérieure lorsque votre activité grandit."}

                      </p>

                    </div>

                    <div className="bg-white/10 rounded-2xl px-5 py-4">

                      <p className="text-xs text-gray-400">
                        STATUT
                      </p>

                      <p className="font-black text-green-400 mt-1">
                        ● Actif
                      </p>

                    </div>

                  </div>

                </div>

                {/* OFFRES */}

                <div className="grid md:grid-cols-2 gap-5">

                  {/* PRO */}

                  <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 sm:p-7 shadow-sm">

                    <div className="flex items-center justify-between">

                      <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl">
                        🚀
                      </div>

                      <span className="bg-blue-600 text-white text-xs font-black px-3 py-1.5 rounded-full">
                        PRO
                      </span>

                    </div>

                    <h3 className="text-2xl font-black mt-5">
                      Pro
                    </h3>

                    <p className="text-3xl font-black mt-2">

                      3 000{" "}

                      <span className="text-sm text-gray-400">
                        FCFA / mois
                      </span>

                    </p>

                    <ul className="space-y-3 mt-6">

                      <li className="text-sm text-gray-600">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Jusqu'à 100 produits
                      </li>

                      <li className="text-sm text-gray-600">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Statistiques avancées
                      </li>

                      <li className="text-sm text-gray-600">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Produits mis en avant
                      </li>

                      <li className="text-sm text-gray-600">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Badge vendeur Pro
                      </li>

                      <li className="text-sm text-gray-600">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Boutique personnalisée
                      </li>

                    </ul>

                    <button
                      onClick={() =>
                        handleSubscription(
                          "pro"
                        )
                      }
                      disabled={
                        subscriptionLoading
                      }
                      className="w-full mt-7 bg-blue-600 text-white py-4 rounded-xl font-black hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {subscriptionLoading &&
                      subscriptionPlan ===
                        "pro"
                        ? "Redirection vers Paystack..."
                        : subscription?.plan ===
                            "pro"
                        ? "Renouveler Pro — 3 000 FCFA"
                        : "Passer à Pro — 3 000 FCFA"}
                    </button>

                  </div>

                  {/* PREMIUM */}

                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl border-2 border-yellow-300 p-6 sm:p-7 shadow-sm relative overflow-hidden">

                    <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] font-black px-4 py-2 rounded-bl-xl">
                      ⭐ RECOMMANDÉ
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-yellow-400 flex items-center justify-center text-2xl">
                      👑
                    </div>

                    <h3 className="text-2xl font-black mt-5">
                      Premium
                    </h3>

                    <p className="text-3xl font-black mt-2">

                      5 000{" "}

                      <span className="text-sm text-gray-400">
                        FCFA / mois
                      </span>

                    </p>

                    <ul className="space-y-3 mt-6">

                      <li className="text-sm text-gray-700">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Produits illimités
                      </li>

                      <li className="text-sm text-gray-700">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Mise en avant prioritaire
                      </li>

                      <li className="text-sm text-gray-700">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Statistiques avancées
                      </li>

                      <li className="text-sm text-gray-700">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Badge Premium
                      </li>

                      <li className="text-sm text-gray-700">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Boutique personnalisée
                      </li>

                      <li className="text-sm text-gray-700">
                        <span className="text-green-600 font-black">
                          ✓
                        </span>{" "}
                        Support VIP
                      </li>

                    </ul>

                    <button
                      onClick={() =>
                        handleSubscription(
                          "premium"
                        )
                      }
                      disabled={
                        subscriptionLoading
                      }
                      className="w-full mt-7 bg-yellow-400 text-black py-4 rounded-xl font-black hover:bg-yellow-300 transition disabled:opacity-50"
                    >
                      {subscriptionLoading &&
                      subscriptionPlan ===
                        "premium"
                        ? "Redirection vers Paystack..."
                        : subscription?.plan ===
                            "premium"
                        ? "Renouveler Premium — 5 000 FCFA"
                        : "Passer à Premium — 5 000 FCFA"}
                    </button>

                  </div>

                </div>

                {/* SÉCURITÉ */}

                <div className="grid md:grid-cols-3 gap-4 mt-6">

                  <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">

                    <div className="text-2xl mb-3">
                      🔒
                    </div>

                    <p className="font-black">
                      Paiement sécurisé
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Paiement traité de manière
                      sécurisée par Paystack.
                    </p>

                  </div>

                  <div className="bg-green-50 rounded-2xl border border-green-100 p-5">

                    <div className="text-2xl mb-3">
                      ⚡
                    </div>

                    <p className="font-black">
                      Activation rapide
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Votre formule est activée
                      après confirmation.
                    </p>

                  </div>

                  <div className="bg-orange-50 rounded-2xl border border-orange-100 p-5">

                    <div className="text-2xl mb-3">
                      🇨🇮
                    </div>

                    <p className="font-black">
                      Pensé pour la CI
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Des offres adaptées aux
                      vendeurs ivoiriens.
                    </p>

                  </div>

                </div>

              </div>
            )}

            {/* =================================================
                PARAMÈTRES
            ================================================= */}

            {activeMenu ===
              "Paramètres" && (
              <div>

                <div className="mb-8">

                  <span className="inline-flex bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-black mb-3">
                    ⚙️ CONFIGURATION
                  </span>

                  <p className="text-gray-500">
                    Gérez votre compte vendeur.
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Paramètres
                  </h2>

                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100">

                  <div className="p-6">

                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-xl mb-4">
                      👤
                    </div>

                    <h3 className="font-black">
                      Compte vendeur
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      Votre compte est
                      actuellement configuré
                      comme vendeur.
                    </p>

                  </div>

                  <button
                    onClick={
                      handleLogout
                    }
                    className="w-full text-left p-6 hover:bg-red-50 transition"
                  >

                    <p className="font-black text-red-600">
                      ↪ Se déconnecter
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      Fermer votre session
                      actuelle.
                    </p>

                  </button>

                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </main>
  );
}