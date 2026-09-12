"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  price: number;
  old_price?: number | null;
  category?: string | null;
  image?: string | null;
  rating?: number | null;
  reviews?: number | null;
  stock?: number | null;
  popular?: boolean | null;
  description?: string | null;
  active?: boolean | null;
  seller_id?: string | null;
};

type CartItem = Product & {
  quantity: number;
};

const categories = [
  "Toutes",
  "Électronique",
  "Mode",
  "Beauté",
  "Maison",
  "Accessoires",
  "Téléphones",
  "Chaussures",
  "Alimentation",
  "Sport",
  "Autre",
];

const communes = [
  "Abobo",
  "Adjamé",
  "Anyama",
  "Attécoubé",
  "Bingerville",
  "Cocody",
  "Koumassi",
  "Marcory",
  "Plateau",
  "Port-Bouët",
  "Songon",
  "Treichville",
  "Yopougon",
  "Autre",
];

const WHATSAPP_NUMBER = "2250747395798";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fr-FR").format(price) + " FCFA";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Toutes");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [showOrder, setShowOrder] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(false);

  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCommune, setCustomerCommune] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("delivery");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setDatabaseError("");

    const { data, error } = await supabase
      .from("products")
      .select(
        "id,name,price,old_price,category,image,rating,reviews,stock,popular,description,active,seller_id"
      )
      .eq("active", true)
      .gt("stock", 0)
      .order("popular", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Erreur produits :", error);

      setDatabaseError(
        error.message ||
          "Impossible de charger les produits."
      );

      setProducts([]);
    } else {
      setProducts((data || []) as Product[]);
    }

    setLoading(false);
  }

  const filteredProducts = useMemo(() => {
    const text = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !text ||
        product.name?.toLowerCase().includes(text) ||
        product.description
          ?.toLowerCase()
          .includes(text) ||
        product.category
          ?.toLowerCase()
          .includes(text);

      const matchesCategory =
        category === "Toutes" ||
        product.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const popularProducts = useMemo(() => {
    return products.filter(
      (product) => product.popular === true
    );
  }, [products]);

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total + Number(item.price) * item.quantity,
    0
  );

  function addToCart(product: Product) {
    const stock = Number(product.stock ?? 0);

    if (stock <= 0) {
      alert(
        "Ce produit est actuellement en rupture de stock."
      );
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      );

      if (existing) {
        if (existing.quantity >= stock) {
          alert(
            `Il ne reste que ${stock} unité${
              stock > 1 ? "s" : ""
            } de ce produit.`
          );

          return current;
        }

        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  }

  function increaseQuantity(id: number) {
    setCart((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const stock = Number(item.stock ?? 0);

        if (item.quantity >= stock) {
          alert(
            `Stock maximum atteint : ${stock} unité${
              stock > 1 ? "s" : ""
            }.`
          );

          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        };
      })
    );
  }

  function decreaseQuantity(id: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id: number) {
    setCart((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  function generateOrderNumber() {
    const random = Math.floor(
      100000 + Math.random() * 900000
    );

    return `IVO-${new Date().getFullYear()}-${random}`;
  }

  function openOrder() {
    if (cart.length === 0) {
      alert("Ton panier est vide.");
      return;
    }

    setShowCart(false);
    setShowOrder(true);
  }

  async function confirmOrder() {
    if (!customerName.trim()) {
      alert("Entre ton nom complet.");
      return;
    }

    if (
      paymentMethod === "paystack" &&
      !customerEmail.trim()
    ) {
      alert(
        "Entre ton adresse email pour le paiement en ligne."
      );
      return;
    }

    if (
      paymentMethod === "paystack" &&
      !customerEmail.includes("@")
    ) {
      alert("Entre une adresse email valide.");
      return;
    }

    if (!customerPhone.trim()) {
      alert("Entre ton numéro de téléphone.");
      return;
    }

    if (!customerCommune) {
      alert("Choisis ta commune.");
      return;
    }

    if (!customerAddress.trim()) {
      alert("Entre ton adresse de livraison.");
      return;
    }

    if (cart.length === 0) {
      alert("Ton panier est vide.");
      return;
    }

    setSendingOrder(true);

    const number = generateOrderNumber();

    const productsForOrder = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      seller_id: item.seller_id ?? null,
    }));

    const sellerIds = Array.from(
      new Set(
        cart
          .map((item) => item.seller_id)
          .filter(
            (sellerId): sellerId is string =>
              Boolean(sellerId)
          )
      )
    );

    if (sellerIds.length === 0) {
      console.error(
        "Impossible de déterminer le vendeur des produits.",
        cart
      );

      alert(
        "Impossible d'identifier le vendeur de ce produit.\n\n" +
          "Actualise la page puis réessaie."
      );

      setSendingOrder(false);
      return;
    }

    const { error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: number,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_commune: customerCommune,
        customer_address: customerAddress.trim(),
        payment_method:
          paymentMethod === "paystack"
            ? "Paystack - Paiement en ligne"
            : "Paiement à la livraison",
        products: productsForOrder,
        total: cartTotal,
        customer_note: customerNote.trim(),
        status: "Nouvelle",
        seller_ids: sellerIds,
      });

    if (orderError) {
      console.error(
        "Erreur commande :",
        orderError
      );

      alert(
        "Impossible d'enregistrer la commande.\n\n" +
          orderError.message
      );

      setSendingOrder(false);
      return;
    }

    try {
      const commissionResponse = await fetch(
        "/api/commissions/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_number: number,
            products: cart,
            payment_status: "pending",
          }),
        }
      );

      const commissionData =
        await commissionResponse.json();

      if (!commissionResponse.ok) {
        console.error(
          "Erreur lors de l'enregistrement de la commission :",
          commissionData
        );
      } else {
        console.log(
          "✅ Commission de 10 % enregistrée :",
          commissionData
        );
      }
    } catch (commissionError) {
      console.error(
        "Erreur réseau commission :",
        commissionError
      );
    }

    if (paymentMethod === "delivery") {
      setOrderNumber(number);
      setOrderSuccess(true);
      setCart([]);
      setSendingOrder(false);

      await loadProducts();

      return;
    }

    try {
      const response = await fetch(
        "/api/paystack/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: customerEmail.trim(),
            amount: cartTotal,
            orderNumber: number,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.authorization_url) {
        console.error(
          "Erreur Paystack :",
          data
        );

        alert(
          data.error ||
            "Impossible d'ouvrir le paiement Paystack."
        );

        setSendingOrder(false);
        return;
      }

      window.location.href =
        data.authorization_url;
    } catch (error) {
      console.error(
        "Erreur connexion Paystack :",
        error
      );

      alert(
        "Impossible de contacter Paystack.\n\n" +
          "Vérifie ta connexion internet puis réessaie."
      );

      setSendingOrder(false);
    }
  }

  function closeOrder() {
    setShowOrder(false);
    setOrderSuccess(false);
    setOrderNumber("");
  }

  function productWhatsApp(product: Product) {
    const message = encodeURIComponent(
      `Bonjour Ivoire Shop 👋\n\nJe suis intéressé(e) par le produit : ${product.name}\nPrix : ${formatPrice(
        Number(product.price)
      )}\n\nEst-il disponible ?`
    );

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  }

  const generalWhatsApp =
    `https://wa.me/${WHATSAPP_NUMBER}?text=` +
    encodeURIComponent(
      "Bonjour Ivoire Shop 👋 Je souhaite avoir des informations sur vos produits."
    );

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-gray-900">

      {/* =========================================================
          NOUVEL EN-TÊTE PROFESSIONNEL
      ========================================================= */}

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm">

        {/* BARRE PRINCIPALE */}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="min-h-[76px] flex items-center gap-4">

            {/* LOGO */}

            <a
              href="/"
              className="
                flex
                items-center
                gap-2
                flex-shrink-0
                group
              "
            >

              <div
                className="
                  w-11
                  h-11
                  rounded-2xl
                  bg-black
                  text-yellow-400
                  flex
                  items-center
                  justify-center
                  text-xl
                  shadow-lg
                  group-hover:rotate-3
                  transition
                "
              >
                🇨🇮
              </div>

              <div className="hidden sm:block">

                <div className="text-xl font-black tracking-tight leading-none">
                  Ivoire<span className="text-yellow-500">Shop</span>
                </div>

                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em] mt-1">
                  Marketplace ivoirienne
                </div>

              </div>

            </a>

            {/* RECHERCHE DESKTOP */}

            <div className="hidden md:block flex-1 max-w-2xl mx-auto">

              <div className="relative">

                <span
                  className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-gray-400
                    text-lg
                  "
                >
                  🔎
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Rechercher un produit, une catégorie..."
                  className="
                    w-full
                    h-12
                    bg-gray-100
                    border
                    border-transparent
                    rounded-2xl
                    pl-12
                    pr-5
                    text-sm
                    font-medium
                    text-gray-900
                    outline-none
                    transition
                    focus:bg-white
                    focus:border-yellow-400
                    focus:ring-4
                    focus:ring-yellow-400/10
                  "
                />

              </div>

            </div>

            {/* ACTIONS DESKTOP */}

            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">

              <a
                href="/become-seller"
                className="
                  flex
                  items-center
                  gap-2
                  px-4
                  py-2.5
                  rounded-xl
                  text-sm
                  font-black
                  text-gray-700
                  hover:bg-yellow-50
                  hover:text-black
                  transition
                "
              >
                <span className="text-lg">
                  🏪
                </span>

                <span>
                  Vendre
                </span>
              </a>

              <a
                href="/suivi"
                className="
                  flex
                  items-center
                  gap-2
                  px-4
                  py-2.5
                  rounded-xl
                  text-sm
                  font-black
                  text-gray-700
                  hover:bg-gray-100
                  transition
                "
              >
                <span className="text-lg">
                  📦
                </span>

                <span>
                  Suivi
                </span>
              </a>

              <button
                onClick={() => setShowCart(true)}
                className="
                  relative
                  flex
                  items-center
                  gap-2
                  bg-black
                  text-white
                  px-5
                  py-3
                  rounded-xl
                  font-black
                  text-sm
                  shadow-lg
                  hover:bg-gray-800
                  hover:-translate-y-0.5
                  transition
                "
              >
                <span className="text-lg">
                  🛒
                </span>

                <span>
                  Panier
                </span>

                {cartCount > 0 && (
                  <span
                    className="
                      absolute
                      -top-2
                      -right-2
                      min-w-6
                      h-6
                      px-1.5
                      rounded-full
                      bg-yellow-400
                      text-black
                      text-xs
                      font-black
                      flex
                      items-center
                      justify-center
                      border-2
                      border-white
                    "
                  >
                    {cartCount}
                  </span>
                )}

              </button>

            </div>

            {/* ACTIONS MOBILE */}

            <div className="ml-auto flex md:hidden items-center gap-2">

              <a
                href="/suivi"
                aria-label="Suivre ma commande"
                className="
                  w-11
                  h-11
                  rounded-xl
                  bg-gray-100
                  flex
                  items-center
                  justify-center
                  text-lg
                  hover:bg-yellow-400
                  transition
                "
              >
                📦
              </a>

              <button
                onClick={() => setShowCart(true)}
                aria-label="Ouvrir le panier"
                className="
                  relative
                  w-11
                  h-11
                  rounded-xl
                  bg-black
                  text-white
                  flex
                  items-center
                  justify-center
                  text-lg
                "
              >
                🛒

                {cartCount > 0 && (
                  <span
                    className="
                      absolute
                      -top-2
                      -right-2
                      min-w-5
                      h-5
                      px-1
                      rounded-full
                      bg-yellow-400
                      text-black
                      text-[10px]
                      font-black
                      flex
                      items-center
                      justify-center
                      border-2
                      border-white
                    "
                  >
                    {cartCount}
                  </span>
                )}

              </button>

            </div>

          </div>

          {/* RECHERCHE MOBILE */}

          <div className="md:hidden pb-4">

            <div className="relative">

              <span
                className="
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              >
                🔎
              </span>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Rechercher un produit..."
                className="
                  w-full
                  h-11
                  bg-gray-100
                  border
                  border-gray-200
                  rounded-xl
                  pl-11
                  pr-4
                  text-sm
                  outline-none
                  focus:bg-white
                  focus:border-yellow-400
                  focus:ring-4
                  focus:ring-yellow-400/10
                  transition
                "
              />

            </div>

          </div>

        </div>

        {/* NAVIGATION MOBILE / TABLET */}

        <div className="border-t border-gray-100">

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-hide">

              <a
                href="/become-seller"
                className="
                  lg:hidden
                  flex
                  items-center
                  gap-1.5
                  flex-shrink-0
                  px-3.5
                  py-2
                  rounded-lg
                  bg-yellow-400
                  text-black
                  text-xs
                  font-black
                "
              >
                🏪 Vendre
              </a>

              <span className="lg:hidden text-gray-300">
                |
              </span>

              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`
                    flex
                    items-center
                    gap-1.5
                    flex-shrink-0
                    whitespace-nowrap
                    px-3.5
                    py-2
                    rounded-lg
                    text-xs
                    font-bold
                    transition
                    ${
                      category === item
                        ? "bg-black text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }
                  `}
                >

                  <span>
                    {item === "Toutes" && "✨"}
                    {item === "Électronique" && "⚡"}
                    {item === "Mode" && "👕"}
                    {item === "Beauté" && "💄"}
                    {item === "Maison" && "🏠"}
                    {item === "Accessoires" && "👜"}
                    {item === "Téléphones" && "📱"}
                    {item === "Chaussures" && "👟"}
                    {item === "Alimentation" && "🍴"}
                    {item === "Sport" && "⚽"}
                    {item === "Autre" && "📦"}
                  </span>

                  {item}

                </button>
              ))}

            </div>

          </div>

        </div>

      </header>

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="bg-black text-white">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">

          <div className="max-w-4xl">

            <div className="
              inline-flex
              items-center
              gap-2
              bg-yellow-400
              text-black
              px-4
              py-2
              rounded-full
              font-black
              text-xs
              md:text-sm
              mb-6
            ">
              🇨🇮 SHOPPING EN CÔTE D'IVOIRE
            </div>

            <h1 className="
              text-4xl
              sm:text-5xl
              md:text-6xl
              lg:text-7xl
              font-black
              leading-[0.98]
              tracking-tight
            ">
              Achète.
              <br />

              <span className="text-yellow-400">
                Vends.
              </span>

              <br />

              Grandis avec
              <br />

              <span className="text-white">
                Ivoire Shop.
              </span>
            </h1>

            <p className="
              text-gray-300
              text-base
              md:text-xl
              mt-7
              leading-relaxed
              max-w-3xl
            ">
              Découvre les produits proposés par nos vendeurs,
              commande facilement et fais-toi livrer partout en
              Côte d'Ivoire.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">

              <button
                onClick={() =>
                  document
                    .getElementById("produits")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
                className="
                  bg-yellow-400
                  text-black
                  px-6
                  md:px-7
                  py-4
                  rounded-xl
                  font-black
                  hover:bg-yellow-300
                  hover:-translate-y-1
                  shadow-xl
                  shadow-yellow-400/10
                  transition
                "
              >
                🛍️ Voir les produits
              </button>

              <a
                href="/become-seller"
                className="
                  bg-white
                  text-black
                  px-6
                  md:px-7
                  py-4
                  rounded-xl
                  font-black
                  hover:bg-yellow-400
                  hover:-translate-y-1
                  transition
                  flex
                  items-center
                  gap-2
                "
              >
                🏪 Devenir vendeur
              </a>

              <a
                href="/suivi"
                className="
                  border-2
                  border-white/30
                  text-white
                  px-6
                  md:px-7
                  py-4
                  rounded-xl
                  font-black
                  hover:border-yellow-400
                  hover:text-yellow-400
                  transition
                  flex
                  items-center
                  gap-2
                "
              >
                📦 Suivre ma commande
              </a>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          PRODUITS POPULAIRES
      ========================================================= */}

      {!loading &&
        !search &&
        category === "Toutes" &&
        popularProducts.length > 0 && (

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">

          <div className="mb-6">

            <p className="text-yellow-600 font-black text-sm">
              LES PLUS RECHERCHÉS
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-1">
              ⭐ Produits populaires
            </h2>

          </div>

          <div className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-6
          ">

            {popularProducts
              .slice(0, 4)
              .map((product) => (

              <ProductCard
                key={product.id}
                product={product}
                onSelect={() =>
                  setSelectedProduct(product)
                }
                onAddToCart={() =>
                  addToCart(product)
                }
                onWhatsApp={() =>
                  window.open(
                    productWhatsApp(product),
                    "_blank"
                  )
                }
              />

            ))}

          </div>

        </section>
      )}

      {/* =========================================================
          PRODUITS
      ========================================================= */}

      <section
        id="produits"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14"
      >

        <div className="
          flex
          flex-col
          sm:flex-row
          sm:items-end
          justify-between
          gap-3
          mb-7
        ">

          <div>

            <p className="text-yellow-600 font-black text-sm">
              NOS PRODUITS
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-1">
              {search
                ? `Résultats pour « ${search} »`
                : category !== "Toutes"
                ? category
                : "Découvre notre sélection"}
            </h2>

          </div>

          <p className="text-gray-500 font-medium">
            {filteredProducts.length} produit
            {filteredProducts.length > 1 ? "s" : ""}
          </p>

        </div>

        {databaseError && (

          <div className="
            bg-red-50
            border-2
            border-red-200
            text-red-800
            rounded-2xl
            p-5
            mb-7
          ">

            <p className="font-black">
              ⚠️ Impossible de charger les produits
            </p>

            <p className="text-sm mt-2">
              {databaseError}
            </p>

            <button
              onClick={loadProducts}
              className="
                mt-4
                bg-black
                text-white
                px-5
                py-3
                rounded-xl
                font-bold
                hover:bg-gray-800
                transition
              "
            >
              Réessayer
            </button>

          </div>
        )}

        {loading && (

          <div className="
            bg-white
            rounded-3xl
            p-16
            text-center
            shadow-sm
          ">

            <div className="text-6xl mb-5">
              ⏳
            </div>

            <h3 className="text-xl font-black">
              Chargement des produits...
            </h3>

            <p className="text-gray-500 mt-2">
              Connexion à Ivoire Shop
            </p>

          </div>
        )}

        {!loading &&
          !databaseError &&
          filteredProducts.length === 0 && (

          <div className="
            bg-white
            rounded-3xl
            p-16
            text-center
            shadow-sm
          ">

            <div className="text-6xl">
              🔎
            </div>

            <h3 className="text-2xl font-black mt-5">
              Aucun produit trouvé
            </h3>

            <p className="text-gray-500 mt-2">
              Essaie une autre recherche ou une autre catégorie.
            </p>

            <button
              onClick={() => {
                setSearch("");
                setCategory("Toutes");
              }}
              className="
                mt-6
                bg-black
                text-white
                px-6
                py-3
                rounded-xl
                font-bold
                hover:bg-gray-800
                transition
              "
            >
              Voir tous les produits
            </button>

          </div>
        )}

        {!loading &&
          !databaseError &&
          filteredProducts.length > 0 && (

          <div className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            gap-6
          ">

            {filteredProducts.map((product) => (

              <ProductCard
                key={product.id}
                product={product}
                onSelect={() =>
                  setSelectedProduct(product)
                }
                onAddToCart={() =>
                  addToCart(product)
                }
                onWhatsApp={() =>
                  window.open(
                    productWhatsApp(product),
                    "_blank"
                  )
                }
              />

            ))}

          </div>
        )}

      </section>

      {/* =========================================================
          AVANTAGES
      ========================================================= */}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="
          grid
          grid-cols-1
          sm:grid-cols-3
          gap-4
        ">

          <div className="
            bg-white
            rounded-2xl
            p-6
            shadow-sm
            border
            border-gray-100
            hover:shadow-lg
            transition
          ">

            <div className="text-3xl">
              🚚
            </div>

            <h3 className="font-black mt-3">
              Livraison
            </h3>

            <p className="text-gray-500 text-sm mt-1">
              Livraison dans plusieurs communes d'Abidjan.
            </p>

          </div>

          <div className="
            bg-white
            rounded-2xl
            p-6
            shadow-sm
            border
            border-gray-100
            hover:shadow-lg
            transition
          ">

            <div className="text-3xl">
              🔒
            </div>

            <h3 className="font-black mt-3">
              Commande simple
            </h3>

            <p className="text-gray-500 text-sm mt-1">
              Commande rapidement depuis ton téléphone ou PC.
            </p>

          </div>

          <div className="
            bg-white
            rounded-2xl
            p-6
            shadow-sm
            border
            border-gray-100
            hover:shadow-lg
            transition
          ">

            <div className="text-3xl">
              💬
            </div>

            <h3 className="font-black mt-3">
              Assistance WhatsApp
            </h3>

            <p className="text-gray-500 text-sm mt-1">
              Une question ? Contacte directement notre équipe.
            </p>

          </div>

        </div>

      </section>

      {/* =========================================================
          SUIVI DE COMMANDE
      ========================================================= */}

      <section className="bg-yellow-400 text-black">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

          <div className="
            bg-black
            text-white
            rounded-3xl
            p-6
            md:p-10
            shadow-2xl
            flex
            flex-col
            md:flex-row
            items-center
            justify-between
            gap-7
          ">

            <div className="flex items-center gap-5">

              <div className="
                w-16
                h-16
                md:w-20
                md:h-20
                rounded-2xl
                bg-yellow-400
                text-black
                flex
                items-center
                justify-center
                text-4xl
                md:text-5xl
              ">
                📦
              </div>

              <div>

                <p className="text-yellow-400 font-black text-sm uppercase tracking-wide">
                  ESPACE CLIENT
                </p>

                <p className="text-2xl md:text-3xl font-black mt-1">
                  Tu as déjà commandé ?
                </p>

                <p className="text-gray-400 mt-2">
                  Vérifie l'état de ta commande en quelques secondes.
                </p>

              </div>

            </div>

            <a
              href="/suivi"
              className="
                w-full
                md:w-auto
                bg-yellow-400
                text-black
                px-8
                py-5
                rounded-2xl
                font-black
                text-lg
                text-center
                shadow-xl
                hover:bg-yellow-300
                hover:scale-105
                transition-all
                flex
                items-center
                justify-center
                gap-3
              "
            >
              📦 SUIVRE MA COMMANDE
            </a>

          </div>

        </div>

      </section>

      {/* =========================================================
          WHATSAPP
      ========================================================= */}

      <section className="bg-green-600 text-white">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <div className="
            flex
            flex-col
            md:flex-row
            items-center
            justify-between
            gap-6
          ">

            <div>

              <p className="text-3xl font-black">
                Une question ?
              </p>

              <p className="text-green-100 mt-2">
                Notre équipe est disponible sur WhatsApp.
              </p>

            </div>

            <a
              href={generalWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="
                bg-white
                text-green-700
                px-8
                py-4
                rounded-xl
                font-black
                hover:bg-green-50
                hover:scale-105
                transition
              "
            >
              💬 Écrire sur WhatsApp
            </a>

          </div>

        </div>

      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer className="bg-black text-white">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          <div className="grid md:grid-cols-4 gap-8">

            <div>

              <div className="flex items-center gap-2">

                <div className="
                  w-10
                  h-10
                  rounded-xl
                  bg-yellow-400
                  text-black
                  flex
                  items-center
                  justify-center
                ">
                  🇨🇮
                </div>

                <h2 className="text-2xl font-black">
                  Ivoire<span className="text-yellow-400">Shop</span>
                </h2>

              </div>

              <p className="text-gray-400 mt-3">
                Ton shopping en ligne en Côte d'Ivoire.
              </p>

            </div>

            <div>

              <h3 className="font-bold">
                Catégories
              </h3>

              <div className="text-gray-400 text-sm mt-3 space-y-1">

                <p>Électronique</p>
                <p>Mode</p>
                <p>Beauté</p>
                <p>Maison</p>
                <p>Accessoires</p>

              </div>

            </div>

            <div>

              <h3 className="font-bold">
                Espace client
              </h3>

              <div className="mt-3 space-y-2">

                <a
                  href="/suivi"
                  className="
                    text-yellow-400
                    hover:text-yellow-300
                    block
                    font-black
                  "
                >
                  📦 Suivre ma commande
                </a>

                <a
                  href="#produits"
                  className="
                    text-gray-400
                    hover:text-white
                    block
                  "
                >
                  🛍️ Voir les produits
                </a>

                <a
                  href="/become-seller"
                  className="
                    text-gray-400
                    hover:text-white
                    block
                  "
                >
                  🏪 Devenir vendeur
                </a>

              </div>

            </div>

            <div>

              <h3 className="font-bold">
                Contact
              </h3>

              <a
                href={generalWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  text-green-400
                  hover:text-green-300
                  block
                  mt-3
                "
              >
                💬 WhatsApp
              </a>

            </div>

          </div>

          <div className="
            border-t
            border-gray-800
            mt-8
            pt-6
            text-sm
            text-gray-500
          ">

            © {new Date().getFullYear()} Ivoire Shop.
            Tous droits réservés.

          </div>

        </div>

      </footer>

      {/* =========================================================
          BOUTON SUIVI FLOTTANT MOBILE
      ========================================================= */}

      <a
        href="/suivi"
        className="
          fixed
          bottom-24
          right-5
          z-40
          md:hidden
          flex
          items-center
          gap-2
          bg-yellow-400
          text-black
          px-5
          py-3.5
          rounded-full
          font-black
          shadow-2xl
          border-2
          border-black
          hover:bg-yellow-300
          hover:scale-105
          transition-all
        "
      >
        <span className="text-xl animate-bounce">
          📦
        </span>

        <span>
          Suivre ma commande
        </span>

      </a>

      {/* =========================================================
          WHATSAPP FLOTTANT
      ========================================================= */}

      <a
        href={generalWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contacter Ivoire Shop sur WhatsApp"
        className="
          fixed
          bottom-5
          right-5
          z-40
          w-16
          h-16
          rounded-full
          bg-green-500
          text-white
          flex
          items-center
          justify-center
          text-3xl
          shadow-2xl
          hover:bg-green-600
          hover:scale-110
          transition
        "
      >
        💬
      </a>

      {/* =========================================================
          MODAL PRODUIT
      ========================================================= */}

      {selectedProduct && (

        <div className="
          fixed
          inset-0
          z-50
          flex
          items-center
          justify-center
          p-4
        ">

          <div
            className="absolute inset-0 bg-black/70"
            onClick={() =>
              setSelectedProduct(null)
            }
          />

          <div className="
            relative
            bg-white
            rounded-3xl
            w-full
            max-w-2xl
            max-h-[90vh]
            overflow-y-auto
            shadow-2xl
          ">

            <button
              onClick={() =>
                setSelectedProduct(null)
              }
              className="
                absolute
                right-4
                top-4
                z-10
                w-10
                h-10
                rounded-full
                bg-white
                shadow
                font-bold
                hover:bg-yellow-400
                transition
              "
            >
              ✕
            </button>

            {selectedProduct.image ? (

              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-full h-72 object-cover"
              />

            ) : (

              <div className="
                w-full
                h-72
                bg-gray-100
                flex
                items-center
                justify-center
                text-8xl
              ">
                🛍️
              </div>

            )}

            <div className="p-7">

              <p className="text-sm text-gray-500">
                {selectedProduct.category || "Produit"}
              </p>

              <h2 className="text-3xl font-black mt-1">
                {selectedProduct.name}
              </h2>

              <p className="
                text-3xl
                font-black
                mt-5
                text-yellow-600
              ">
                {formatPrice(
                  Number(selectedProduct.price)
                )}
              </p>

              {selectedProduct.old_price &&
                Number(selectedProduct.old_price) >
                  Number(selectedProduct.price) && (

                <p className="
                  text-gray-400
                  line-through
                  mt-1
                ">
                  {formatPrice(
                    Number(selectedProduct.old_price)
                  )}
                </p>

              )}

              <div className="
                mt-4
                bg-gray-100
                rounded-xl
                px-4
                py-3
              ">

                📦 Stock disponible :{" "}

                <strong>
                  {selectedProduct.stock ?? 0}
                </strong>

              </div>

              {selectedProduct.description && (

                <p className="
                  text-gray-600
                  leading-relaxed
                  mt-5
                ">
                  {selectedProduct.description}
                </p>

              )}

              <div className="
                grid
                sm:grid-cols-2
                gap-3
                mt-7
              ">

                <button
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                    setShowCart(true);
                  }}
                  className="
                    bg-black
                    text-white
                    py-4
                    rounded-xl
                    font-black
                    hover:bg-gray-800
                    transition
                  "
                >
                  🛒 Ajouter au panier
                </button>

                <a
                  href={productWhatsApp(
                    selectedProduct
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    bg-green-600
                    text-white
                    py-4
                    rounded-xl
                    font-black
                    text-center
                    hover:bg-green-700
                    transition
                  "
                >
                  💬 WhatsApp
                </a>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* =========================================================
          PANIER
      ========================================================= */}

      {showCart && (

        <div className="fixed inset-0 z-50">

          <div
            className="absolute inset-0 bg-black/60"
            onClick={() =>
              setShowCart(false)
            }
          />

          <div className="
            absolute
            right-0
            top-0
            h-full
            w-full
            max-w-md
            bg-white
            shadow-2xl
            flex
            flex-col
          ">

            <div className="
              p-5
              border-b
              flex
              items-center
              justify-between
            ">

              <div>

                <h2 className="text-2xl font-black">
                  🛒 Mon panier
                </h2>

                <p className="text-gray-500 text-sm">
                  {cartCount} article
                  {cartCount > 1 ? "s" : ""}
                </p>

              </div>

              <button
                onClick={() =>
                  setShowCart(false)
                }
                className="
                  w-10
                  h-10
                  rounded-full
                  bg-gray-100
                  font-bold
                  hover:bg-yellow-400
                  transition
                "
              >
                ✕
              </button>

            </div>

            <div className="flex-1 overflow-y-auto p-5">

              {cart.length === 0 ? (

                <div className="text-center py-16">

                  <div className="text-6xl">
                    🛒
                  </div>

                  <h3 className="text-xl font-black mt-5">
                    Ton panier est vide
                  </h3>

                  <p className="text-gray-500 mt-2">
                    Ajoute des produits pour commencer.
                  </p>

                </div>

              ) : (

                <div className="space-y-4">

                  {cart.map((item) => (

                    <div
                      key={item.id}
                      className="
                        border
                        rounded-2xl
                        p-4
                      "
                    >

                      <div className="flex gap-4">

                        <div className="
                          w-20
                          h-20
                          rounded-xl
                          bg-gray-100
                          overflow-hidden
                          flex-shrink-0
                        ">

                          {item.image ? (

                            <img
                              src={item.image}
                              alt={item.name}
                              className="
                                w-full
                                h-full
                                object-cover
                              "
                            />

                          ) : (

                            <div className="
                              w-full
                              h-full
                              flex
                              items-center
                              justify-center
                              text-3xl
                            ">
                              🛍️
                            </div>

                          )}

                        </div>

                        <div className="flex-1">

                          <p className="font-black">
                            {item.name}
                          </p>

                          <p className="font-bold mt-1">
                            {formatPrice(
                              Number(item.price)
                            )}
                          </p>

                          <div className="
                            flex
                            items-center
                            gap-2
                            mt-3
                          ">

                            <button
                              onClick={() =>
                                decreaseQuantity(
                                  item.id
                                )
                              }
                              className="
                                w-8
                                h-8
                                rounded-lg
                                bg-gray-100
                                font-bold
                                hover:bg-yellow-400
                                transition
                              "
                            >
                              −
                            </button>

                            <span className="
                              w-8
                              text-center
                              font-bold
                            ">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                increaseQuantity(
                                  item.id
                                )
                              }
                              className="
                                w-8
                                h-8
                                rounded-lg
                                bg-gray-100
                                font-bold
                                hover:bg-yellow-400
                                transition
                              "
                            >
                              +
                            </button>

                            <button
                              onClick={() =>
                                removeFromCart(
                                  item.id
                                )
                              }
                              className="
                                ml-auto
                                text-red-600
                                text-sm
                                font-bold
                                hover:text-red-800
                              "
                            >
                              Supprimer
                            </button>

                          </div>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

            {cart.length > 0 && (

              <div className="border-t p-5">

                <div className="
                  flex
                  justify-between
                  text-xl
                  font-black
                  mb-4
                ">

                  <span>
                    Total
                  </span>

                  <span>
                    {formatPrice(cartTotal)}
                  </span>

                </div>

                <button
                  onClick={openOrder}
                  className="
                    w-full
                    bg-yellow-400
                    text-black
                    py-4
                    rounded-xl
                    font-black
                    hover:bg-yellow-300
                    transition
                  "
                >
                  📦 Passer la commande
                </button>

              </div>

            )}

          </div>

        </div>
      )}

      {/* =========================================================
          MODAL COMMANDE
      ========================================================= */}

      {showOrder && (

        <div className="
          fixed
          inset-0
          z-50
          flex
          items-center
          justify-center
          p-4
        ">

          <div
            className="absolute inset-0 bg-black/70"
            onClick={closeOrder}
          />

          <div className="
            relative
            bg-white
            rounded-3xl
            w-full
            max-w-2xl
            max-h-[92vh]
            overflow-y-auto
            shadow-2xl
          ">

            <div className="
              sticky
              top-0
              bg-white
              border-b
              p-5
              flex
              justify-between
              items-center
              z-10
            ">

              <div>

                <p className="text-sm text-gray-500">
                  Ivoire Shop
                </p>

                <h2 className="text-2xl font-black">
                  Finaliser ma commande
                </h2>

              </div>

              <button
                onClick={closeOrder}
                className="
                  w-10
                  h-10
                  rounded-full
                  bg-gray-100
                  font-bold
                  hover:bg-yellow-400
                  transition
                "
              >
                ✕
              </button>

            </div>

            {!orderSuccess ? (

              <div className="p-6">

                <div className="
                  bg-gray-100
                  rounded-2xl
                  p-5
                  mb-6
                ">

                  <div className="
                    flex
                    justify-between
                    gap-4
                  ">

                    <span className="font-bold">
                      Total de la commande
                    </span>

                    <span className="
                      text-xl
                      font-black
                      text-right
                    ">
                      {formatPrice(cartTotal)}
                    </span>

                  </div>

                </div>

                <div className="space-y-5">

                  <div>

                    <label className="block font-bold mb-2">
                      Nom complet
                    </label>

                    <input
                      value={customerName}
                      onChange={(e) =>
                        setCustomerName(
                          e.target.value
                        )
                      }
                      placeholder="Ex : Said Silue"
                      className="
                        w-full
                        border-2
                        border-gray-200
                        rounded-xl
                        px-4
                        py-3
                        outline-none
                        focus:border-black
                      "
                    />

                  </div>

                  <div>

                    <label className="block font-bold mb-2">
                      Adresse email
                    </label>

                    <input
                      value={customerEmail}
                      onChange={(e) =>
                        setCustomerEmail(
                          e.target.value
                        )
                      }
                      type="email"
                      placeholder="Ex : exemple@gmail.com"
                      className="
                        w-full
                        border-2
                        border-gray-200
                        rounded-xl
                        px-4
                        py-3
                        outline-none
                        focus:border-black
                      "
                    />

                    <p className="
                      text-xs
                      text-gray-500
                      mt-2
                    ">
                      Obligatoire pour le paiement en ligne.
                    </p>

                  </div>

                  <div>

                    <label className="block font-bold mb-2">
                      Numéro de téléphone
                    </label>

                    <input
                      value={customerPhone}
                      onChange={(e) =>
                        setCustomerPhone(
                          e.target.value
                        )
                      }
                      type="tel"
                      placeholder="Ex : 0700000000"
                      className="
                        w-full
                        border-2
                        border-gray-200
                        rounded-xl
                        px-4
                        py-3
                        outline-none
                        focus:border-black
                      "
                    />

                  </div>

                  <div>

                    <label className="block font-bold mb-2">
                      Commune
                    </label>

                    <select
                      value={customerCommune}
                      onChange={(e) =>
                        setCustomerCommune(
                          e.target.value
                        )
                      }
                      className="
                        w-full
                        border-2
                        border-gray-200
                        rounded-xl
                        px-4
                        py-3
                        bg-white
                        outline-none
                        focus:border-black
                      "
                    >

                      <option value="">
                        Choisir une commune
                      </option>

                      {communes.map((commune) => (

                        <option
                          key={commune}
                          value={commune}
                        >
                          {commune}
                        </option>

                      ))}

                    </select>

                  </div>

                  <div>

                    <label className="block font-bold mb-2">
                      Adresse de livraison
                    </label>

                    <textarea
                      value={customerAddress}
                      onChange={(e) =>
                        setCustomerAddress(
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Quartier, rue, repère..."
                      className="
                        w-full
                        border-2
                        border-gray-200
                        rounded-xl
                        px-4
                        py-3
                        outline-none
                        focus:border-black
                        resize-none
                      "
                    />

                  </div>

                  <div>

                    <label className="block font-bold mb-2">
                      Mode de paiement
                    </label>

                    <div className="
                      grid
                      sm:grid-cols-2
                      gap-3
                    ">

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            "delivery"
                          )
                        }
                        className={`p-4 rounded-xl border-2 text-left transition ${
                          paymentMethod ===
                          "delivery"
                            ? "border-black bg-gray-100 shadow-md"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >

                        <p className="font-black">
                          💵 Paiement à la livraison
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                          Paie à la réception.
                        </p>

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            "paystack"
                          )
                        }
                        className={`p-4 rounded-xl border-2 text-left transition ${
                          paymentMethod ===
                          "paystack"
                            ? "border-black bg-gray-100 shadow-md"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >

                        <p className="font-black">
                          📱 Paiement en ligne
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                          Wave, Orange Money, MTN...
                        </p>

                      </button>

                    </div>

                  </div>

                  {paymentMethod ===
                    "paystack" && (

                    <div className="
                      bg-yellow-50
                      border
                      border-yellow-200
                      rounded-2xl
                      p-4
                    ">

                      <p className="font-black">
                        🔒 Paiement sécurisé
                      </p>

                      <p className="text-sm text-gray-600 mt-1">
                        Tu seras redirigé vers Paystack
                        pour effectuer ton paiement.
                      </p>

                    </div>

                  )}

                  <div>

                    <label className="block font-bold mb-2">
                      Note pour la livraison
                    </label>

                    <textarea
                      value={customerNote}
                      onChange={(e) =>
                        setCustomerNote(
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Une précision pour le livreur ?"
                      className="
                        w-full
                        border-2
                        border-gray-200
                        rounded-xl
                        px-4
                        py-3
                        outline-none
                        focus:border-black
                        resize-none
                      "
                    />

                  </div>

                </div>

                <button
                  onClick={confirmOrder}
                  disabled={sendingOrder}
                  className="
                    w-full
                    bg-black
                    text-white
                    py-4
                    rounded-xl
                    font-black
                    mt-7
                    disabled:opacity-50
                    hover:bg-gray-800
                    transition
                  "
                >

                  {sendingOrder
                    ? paymentMethod ===
                      "paystack"
                      ? "⏳ Ouverture du paiement..."
                      : "⏳ Enregistrement..."
                    : paymentMethod ===
                      "paystack"
                    ? "💳 Payer avec Paystack"
                    : "✅ Confirmer ma commande"}

                </button>

              </div>

            ) : (

              <div className="p-8 text-center">

                <div className="text-7xl">
                  🎉
                </div>

                <h2 className="
                  text-3xl
                  font-black
                  mt-5
                ">
                  Commande confirmée !
                </h2>

                <p className="text-gray-500 mt-3">
                  Merci pour ta commande chez Ivoire Shop.
                </p>

                <div className="
                  bg-yellow-50
                  border-2
                  border-yellow-200
                  rounded-2xl
                  p-5
                  mt-6
                ">

                  <p className="text-sm text-gray-500">
                    Numéro de commande
                  </p>

                  <p className="
                    text-2xl
                    font-black
                    mt-1
                  ">
                    {orderNumber}
                  </p>

                </div>

                <a
                  href="/suivi"
                  className="
                    block
                    bg-yellow-400
                    text-black
                    py-5
                    rounded-xl
                    font-black
                    text-lg
                    mt-5
                    shadow-lg
                    hover:bg-yellow-300
                    hover:scale-[1.02]
                    transition
                  "
                >
                  📦 SUIVRE MA COMMANDE
                </a>

                <a
                  href={
                    `https://wa.me/${WHATSAPP_NUMBER}?text=` +
                    encodeURIComponent(
                      `Bonjour Ivoire Shop 👋 Je viens de passer la commande ${orderNumber}.`
                    )
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    block
                    bg-green-600
                    text-white
                    py-4
                    rounded-xl
                    font-black
                    mt-3
                    hover:bg-green-700
                    transition
                  "
                >
                  💬 Envoyer ma commande sur WhatsApp
                </a>

                <button
                  onClick={closeOrder}
                  className="
                    w-full
                    bg-black
                    text-white
                    py-4
                    rounded-xl
                    font-black
                    mt-3
                    hover:bg-gray-800
                    transition
                  "
                >
                  Retour à la boutique
                </button>

              </div>

            )}

          </div>

        </div>
      )}

    </main>
  );
}

/* =============================================================
   PRODUCT CARD
============================================================= */

function ProductCard({
  product,
  onSelect,
  onAddToCart,
  onWhatsApp,
}: {
  product: Product;
  onSelect: () => void;
  onAddToCart: () => void;
  onWhatsApp: () => void;
}) {
  const stock = Number(product.stock ?? 0);

  return (
    <div className="
      bg-white
      rounded-3xl
      overflow-hidden
      shadow-sm
      border
      border-gray-100
      hover:shadow-xl
      hover:-translate-y-1
      transition
      duration-300
    ">

      <button
        onClick={onSelect}
        className="w-full text-left"
      >

        <div className="
          relative
          h-64
          bg-gray-100
          overflow-hidden
        ">

          {product.image ? (

            <img
              src={product.image}
              alt={product.name}
              className="
                w-full
                h-full
                object-cover
                hover:scale-105
                transition
                duration-500
              "
            />

          ) : (

            <div className="
              w-full
              h-full
              flex
              items-center
              justify-center
              text-7xl
            ">
              🛍️
            </div>

          )}

          {product.popular && (

            <span className="
              absolute
              top-4
              left-4
              bg-yellow-400
              text-black
              px-3
              py-1.5
              rounded-full
              text-xs
              font-black
              shadow
            ">
              ⭐ POPULAIRE
            </span>

          )}

          {product.old_price &&
            Number(product.old_price) >
              Number(product.price) && (

            <span className="
              absolute
              top-4
              right-4
              bg-red-600
              text-white
              px-3
              py-1.5
              rounded-full
              text-xs
              font-black
              shadow
            ">
              🔥 PROMO
            </span>

          )}

        </div>

        <div className="p-5">

          <p className="
            text-xs
            text-gray-500
            font-bold
            uppercase
          ">
            {product.category || "Produit"}
          </p>

          <h3 className="
            text-xl
            font-black
            mt-1
          ">
            {product.name}
          </h3>

          {product.description && (

            <p className="
              text-gray-500
              text-sm
              mt-2
              line-clamp-2
            ">
              {product.description}
            </p>

          )}

          <div className="
            flex
            flex-wrap
            items-end
            gap-3
            mt-4
          ">

            <span className="
              text-2xl
              font-black
              text-yellow-600
            ">
              {formatPrice(
                Number(product.price)
              )}
            </span>

            {product.old_price &&
              Number(product.old_price) >
                Number(product.price) && (

              <span className="
                text-sm
                text-gray-400
                line-through
                mb-1
              ">
                {formatPrice(
                  Number(product.old_price)
                )}
              </span>

            )}

          </div>

          <div className="
            flex
            items-center
            justify-between
            mt-4
          ">

            <span
              className={`text-sm font-bold ${
                stock <= 5
                  ? "text-orange-600"
                  : "text-gray-500"
              }`}
            >
              📦 Stock : {stock}
            </span>

            {product.rating !== null &&
              product.rating !== undefined &&
              Number(product.rating) > 0 && (

              <span className="text-sm font-bold">

                ⭐ {product.rating}

                {product.reviews
                  ? ` (${product.reviews})`
                  : ""}

              </span>

            )}

          </div>

        </div>

      </button>

      <div className="
        px-5
        pb-5
        space-y-2
      ">

        <button
          onClick={onAddToCart}
          disabled={stock <= 0}
          className="
            w-full
            bg-black
            text-white
            py-3.5
            rounded-xl
            font-black
            hover:bg-yellow-400
            hover:text-black
            transition
            disabled:bg-gray-300
            disabled:text-gray-500
            disabled:cursor-not-allowed
          "
        >
          {stock > 0
            ? "🛒 Ajouter au panier"
            : "❌ Rupture de stock"}
        </button>

        <button
          onClick={onWhatsApp}
          className="
            w-full
            bg-green-100
            text-green-700
            py-3
            rounded-xl
            text-center
            font-bold
            hover:bg-green-200
            transition
          "
        >
          💬 Commander sur WhatsApp
        </button>

      </div>

    </div>
  );
}