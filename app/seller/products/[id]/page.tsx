"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
  category: string | null;
  image: string | null;
  rating: number | null;
  reviews: number | null;
  stock: number | null;
  popular: boolean | null;
  active: boolean | null;
  seller_id: string | null;
};

type Seller = {
  business_name: string | null;
  full_name: string | null;
};

type Review = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const [message, setMessage] = useState("");
  const [favorite, setFavorite] = useState(false);

  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    async function loadProduct() {
      try {
        const productId = Number(params.id);

        if (!productId) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("active", true)
          .single();

        if (error || !data) {
          console.error("Erreur produit :", error);
          setLoading(false);
          return;
        }

        setProduct(data);

        // --------------------------------------------------
        // CHARGEMENT DU VENDEUR
        // --------------------------------------------------

        if (data.seller_id) {
          const { data: sellerData } = await supabase
            .from("profiles")
            .select("business_name, full_name")
            .eq("id", data.seller_id)
            .maybeSingle();

          if (sellerData) {
            setSeller(sellerData);
          }
        }

        // --------------------------------------------------
        // PRODUITS SIMILAIRES
        // --------------------------------------------------

        if (data.category) {
          const { data: related } = await supabase
            .from("products")
            .select("*")
            .eq("active", true)
            .eq("category", data.category)
            .neq("id", productId)
            .limit(4);

          if (related) {
            setRelatedProducts(related);
          }
        }

        // --------------------------------------------------
        // AVIS DE DEMONSTRATION
        // --------------------------------------------------
        // Pour l'instant les avis sont stockés localement.
        // Plus tard nous pourrons créer une vraie table
        // "product_reviews" dans Supabase.

        const savedReviews = localStorage.getItem(
          `ivoire_reviews_${productId}`
        );

        if (savedReviews) {
          setReviews(JSON.parse(savedReviews));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [params.id]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fr-FR").format(price) + " FCFA";

  const showMessage = (text: string) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const addToCart = () => {
    if (!product) return;

    const savedCart = localStorage.getItem("ivoire_shop_cart");
    const cart = savedCart ? JSON.parse(savedCart) : [];

    const existingIndex = cart.findIndex(
      (item: Product & { quantity?: number }) =>
        item.id === product.id
    );

    if (existingIndex >= 0) {
      cart[existingIndex].quantity =
        (cart[existingIndex].quantity || 1) + quantity;
    } else {
      cart.push({
        ...product,
        quantity,
      });
    }

    localStorage.setItem(
      "ivoire_shop_cart",
      JSON.stringify(cart)
    );

    showMessage("✅ Produit ajouté au panier !");
  };

  const buyNow = () => {
    if (!product) return;

    const savedCart = localStorage.getItem("ivoire_shop_cart");
    const cart = savedCart ? JSON.parse(savedCart) : [];

    const existingIndex = cart.findIndex(
      (item: Product & { quantity?: number }) =>
        item.id === product.id
    );

    if (existingIndex >= 0) {
      cart[existingIndex].quantity =
        (cart[existingIndex].quantity || 1) + quantity;
    } else {
      cart.push({
        ...product,
        quantity,
      });
    }

    localStorage.setItem(
      "ivoire_shop_cart",
      JSON.stringify(cart)
    );

    router.push("/?openCart=true");
  };

  const shareProduct = async () => {
    if (!product) return;

    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Découvre ce produit sur Ivoire Shop 🇨🇮`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showMessage("🔗 Lien du produit copié !");
      }
    } catch {
      // L'utilisateur a simplement annulé le partage.
    }
  };

  const submitReview = () => {
    if (!product) return;

    if (!reviewName.trim()) {
      showMessage("⚠️ Entre ton nom.");
      return;
    }

    if (!reviewComment.trim()) {
      showMessage("⚠️ Écris ton avis.");
      return;
    }

    const newReview: Review = {
      id: Date.now(),
      name: reviewName.trim(),
      rating: selectedRating,
      comment: reviewComment.trim(),
      date: new Date().toLocaleDateString("fr-FR"),
    };

    const updatedReviews = [newReview, ...reviews];

    setReviews(updatedReviews);

    localStorage.setItem(
      `ivoire_reviews_${product.id}`,
      JSON.stringify(updatedReviews)
    );

    setReviewName("");
    setReviewComment("");
    setSelectedRating(5);

    showMessage("⭐ Merci pour ton avis !");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-black border-t-yellow-400 rounded-full animate-spin mx-auto mb-5" />

          <p className="font-black text-gray-700">
            Chargement du produit...
          </p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-100">
        <header className="bg-black text-white px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl font-black"
            >
              🇨🇮 Ivoire Shop
            </Link>

            <Link
              href="/"
              className="bg-yellow-400 text-black px-5 py-3 rounded-xl font-black"
            >
              Boutique
            </Link>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="bg-white rounded-3xl shadow-lg p-10">
            <div className="text-7xl mb-6">
              😕
            </div>

            <h1 className="text-3xl font-black mb-3">
              Produit introuvable
            </h1>

            <p className="text-gray-600 mb-8">
              Ce produit n'existe plus ou n'est actuellement
              plus disponible.
            </p>

            <Link
              href="/"
              className="inline-block bg-black text-white px-7 py-4 rounded-xl font-black"
            >
              🛍️ Retour aux produits
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const stock = product.stock ?? 0;

  const hasDiscount =
    product.old_price &&
    product.old_price > product.price;

  const discount =
    hasDiscount && product.old_price
      ? Math.round(
          ((product.old_price - product.price) /
            product.old_price) *
            100
        )
      : 0;

  const savedAmount =
    hasDiscount && product.old_price
      ? product.old_price - product.price
      : 0;

  const sellerName =
    seller?.business_name ||
    seller?.full_name ||
    "Vendeur Ivoire Shop";

  const averageRating =
    product.rating && product.rating > 0
      ? Number(product.rating).toFixed(1)
      : "Nouveau";

  return (
    <main className="min-h-screen bg-gray-100">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="bg-black text-white sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-xl md:text-2xl font-black whitespace-nowrap"
            >
              🇨🇮 Ivoire Shop
            </Link>

            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/suivi"
                className="hidden sm:block bg-white text-black px-4 py-2.5 rounded-xl font-bold hover:bg-gray-100 transition"
              >
                📦 Suivre ma commande
              </Link>

              <Link
                href="/"
                className="bg-yellow-400 text-black px-4 py-2.5 rounded-xl font-black hover:bg-yellow-300 transition"
              >
                🛒 Boutique
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          PROMOTION BAR
      ===================================================== */}

      {hasDiscount && (
        <div className="bg-red-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-3 text-center font-black">
            🔥 PROMOTION — Économise {formatPrice(savedAmount)} sur ce produit !
          </div>
        </div>
      )}

      {/* =====================================================
          BREADCRUMB
      ===================================================== */}

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        <div className="text-sm text-gray-500">
          <Link
            href="/"
            className="hover:text-black font-semibold"
          >
            Accueil
          </Link>

          <span className="mx-2">›</span>

          <span>
            {product.category || "Produit"}
          </span>

          <span className="mx-2">›</span>

          <span className="text-black font-bold">
            {product.name}
          </span>
        </div>
      </div>

      {/* =====================================================
          PRODUIT PRINCIPAL
      ===================================================== */}

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* IMAGE */}

          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <div className="relative bg-gray-50 min-h-[400px] md:min-h-[550px] flex items-center justify-center p-8">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-w-full max-h-[500px] object-contain rounded-2xl"
                />
              ) : (
                <div className="text-center">
                  <div className="text-8xl mb-4">
                    📦
                  </div>

                  <p className="text-gray-400 font-bold">
                    Aucune image disponible
                  </p>
                </div>
              )}

              {/* PROMO */}

              {hasDiscount && (
                <div className="absolute top-5 left-5 bg-red-500 text-white px-5 py-3 rounded-2xl font-black shadow-lg text-lg">
                  -{discount}%
                </div>
              )}

              {/* POPULAIRE */}

              {product.popular && (
                <div className="absolute top-5 right-5 bg-yellow-400 text-black px-4 py-2 rounded-xl font-black shadow-lg">
                  ⭐ Populaire
                </div>
              )}

              {/* FAVORI */}

              <button
                onClick={() => {
                  setFavorite(!favorite);
                  showMessage(
                    favorite
                      ? "♡ Retiré des favoris"
                      : "❤️ Ajouté aux favoris"
                  );
                }}
                className="absolute bottom-5 right-5 w-14 h-14 bg-white rounded-full shadow-lg text-2xl hover:scale-110 transition"
              >
                {favorite ? "❤️" : "♡"}
              </button>
            </div>

            {/* PARTAGE */}

            <div className="p-5 border-t border-gray-100">
              <button
                onClick={shareProduct}
                className="w-full border-2 border-gray-200 rounded-xl py-3 font-black hover:bg-gray-50 transition"
              >
                🔗 Partager ce produit
              </button>
            </div>
          </div>

          {/* INFOS */}

          <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8">
            {/* CATEGORIE */}

            {product.category && (
              <div className="inline-block bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-black mb-4">
                {product.category}
              </div>
            )}

            {/* TITRE */}

            <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight mb-5">
              {product.name}
            </h1>

            {/* AVIS */}

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-1">
                <span className="text-yellow-500 text-xl">
                  ★
                </span>

                <span className="font-black">
                  {averageRating}
                </span>
              </div>

              {product.reviews !== null &&
                product.reviews > 0 && (
                  <span className="text-gray-500">
                    ({product.reviews} avis)
                  </span>
                )}

              <span className="text-gray-300">
                •
              </span>

              <span
                className={`font-bold ${
                  stock > 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {stock > 0
                  ? `✓ ${stock} disponible${
                      stock > 1 ? "s" : ""
                    }`
                  : "✕ Rupture de stock"}
              </span>
            </div>

            {/* PRIX */}

            <div className="border-y border-gray-200 py-6 mb-6">
              <div className="flex flex-wrap items-end gap-4">
                <span className="text-4xl md:text-5xl font-black text-black">
                  {formatPrice(Number(product.price))}
                </span>

                {hasDiscount &&
                  product.old_price && (
                    <span className="text-xl text-gray-400 line-through mb-1">
                      {formatPrice(
                        Number(product.old_price)
                      )}
                    </span>
                  )}
              </div>

              {hasDiscount && (
                <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-red-600 font-black">
                    🔥 Offre promotionnelle
                  </p>

                  <p className="text-green-600 font-bold mt-1">
                    💰 Tu économises{" "}
                    {formatPrice(savedAmount)}
                  </p>
                </div>
              )}
            </div>

            {/* DESCRIPTION */}

            <div className="mb-7">
              <h2 className="text-xl font-black mb-3">
                Description
              </h2>

              <p className="text-gray-600 leading-7 whitespace-pre-line">
                {product.description ||
                  "Aucune description disponible pour ce produit."}
              </p>
            </div>

            {/* VENDEUR */}

            <div className="bg-gray-50 rounded-2xl p-5 mb-7">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-black text-yellow-400 flex items-center justify-center text-2xl">
                  🏪
                </div>

                <div>
                  <p className="text-sm text-gray-500 font-semibold">
                    Vendu par
                  </p>

                  <p className="font-black text-lg">
                    {sellerName}
                  </p>

                  <p className="text-sm text-green-600 font-bold">
                    ✓ Vendeur vérifié Ivoire Shop
                  </p>
                </div>
              </div>
            </div>

            {/* QUANTITE */}

            {stock > 0 && (
              <div className="mb-6">
                <p className="font-black mb-3">
                  Quantité
                </p>

                <div className="flex items-center border border-gray-300 rounded-xl w-fit overflow-hidden">
                  <button
                    onClick={() =>
                      setQuantity((q) =>
                        Math.max(1, q - 1)
                      )
                    }
                    className="w-12 h-12 bg-gray-100 hover:bg-gray-200 font-black text-xl"
                  >
                    −
                  </button>

                  <div className="w-14 text-center font-black text-lg">
                    {quantity}
                  </div>

                  <button
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(stock, q + 1)
                      )
                    }
                    className="w-12 h-12 bg-gray-100 hover:bg-gray-200 font-black text-xl"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* BOUTONS */}

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={addToCart}
                disabled={stock <= 0}
                className={`py-4 rounded-xl font-black text-lg transition ${
                  stock > 0
                    ? "bg-yellow-400 text-black hover:bg-yellow-300"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                🛒 Ajouter au panier
              </button>

              <button
                onClick={buyNow}
                disabled={stock <= 0}
                className={`py-4 rounded-xl font-black text-lg transition ${
                  stock > 0
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                ⚡ Commander maintenant
              </button>
            </div>

            {/* MESSAGE */}

            {message && (
              <div className="mt-4 bg-green-100 text-green-700 border border-green-200 rounded-xl px-5 py-4 text-center font-bold">
                {message}
              </div>
            )}

            {/* GARANTIES */}

            <div className="grid grid-cols-2 gap-3 mt-7">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl mb-2">
                  🚚
                </div>

                <p className="font-black text-sm">
                  Livraison disponible
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Partout en Côte d'Ivoire
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl mb-2">
                  🔒
                </div>

                <p className="font-black text-sm">
                  Paiement sécurisé
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Paiement à la livraison ou en ligne
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl mb-2">
                  🛡️
                </div>

                <p className="font-black text-sm">
                  Achat sécurisé
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Vendeurs présents sur Ivoire Shop
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl mb-2">
                  📞
                </div>

                <p className="font-black text-sm">
                  Assistance
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Support client disponible
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION AVIS
      ===================================================== */}

      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
        <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black">
                ⭐ Avis clients
              </h2>

              <p className="text-gray-500 mt-2">
                Découvre ce que les clients pensent de ce produit.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-6 py-4">
              <div className="text-3xl font-black">
                {averageRating}
              </div>

              <div className="text-yellow-500 tracking-widest">
                ★★★★★
              </div>
            </div>
          </div>

          {/* AVIS EXISTANTS */}

          {reviews.length > 0 ? (
            <div className="space-y-4 mb-10">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-gray-200 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <p className="font-black">
                        {review.name}
                      </p>

                      <p className="text-xs text-gray-400">
                        {review.date}
                      </p>
                    </div>

                    <div className="text-yellow-500">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </div>
                  </div>

                  <p className="text-gray-600 leading-7">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-8 text-center mb-10">
              <div className="text-5xl mb-3">
                💬
              </div>

              <h3 className="font-black text-xl">
                Aucun avis pour le moment
              </h3>

              <p className="text-gray-500 mt-2">
                Sois le premier à donner ton avis sur ce produit.
              </p>
            </div>
          )}

          {/* FORMULAIRE AVIS */}

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-2xl font-black mb-5">
              ✍️ Donner mon avis
            </h3>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block font-bold mb-2">
                  Ton nom
                </label>

                <input
                  type="text"
                  value={reviewName}
                  onChange={(e) =>
                    setReviewName(e.target.value)
                  }
                  placeholder="Ex : Jean"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block font-bold mb-2">
                  Ta note
                </label>

                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() =>
                        setSelectedRating(star)
                      }
                      className={`text-3xl transition ${
                        star <= selectedRating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      } hover:scale-110`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label className="block font-bold mb-2">
                Ton commentaire
              </label>

              <textarea
                value={reviewComment}
                onChange={(e) =>
                  setReviewComment(e.target.value)
                }
                placeholder="Dis-nous ce que tu penses de ce produit..."
                rows={5}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
              />
            </div>

            <button
              onClick={submitReview}
              className="mt-5 bg-black text-white px-7 py-4 rounded-xl font-black hover:bg-gray-800 transition"
            >
              ⭐ Publier mon avis
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          PRODUITS SIMILAIRES
      ===================================================== */}

      {relatedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
          <div className="mb-6">
            <h2 className="text-3xl font-black">
              🛍️ Tu pourrais aussi aimer
            </h2>

            <p className="text-gray-500 mt-2">
              D'autres produits de la même catégorie.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                href={`/product/${item.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition group"
              >
                <div className="relative h-48 bg-gray-100 flex items-center justify-center p-4">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition"
                    />
                  ) : (
                    <span className="text-5xl">
                      📦
                    </span>
                  )}

                  {item.old_price &&
                    item.old_price > item.price && (
                      <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-lg font-black">
                        PROMO
                      </span>
                    )}
                </div>

                <div className="p-4">
                  <h3 className="font-black line-clamp-2">
                    {item.name}
                  </h3>

                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-yellow-500">
                      ★
                    </span>

                    <span className="text-sm font-bold">
                      {item.rating
                        ? Number(item.rating).toFixed(1)
                        : "Nouveau"}
                    </span>
                  </div>

                  <p className="text-xl font-black mt-3">
                    {formatPrice(Number(item.price))}
                  </p>

                  {item.old_price &&
                    item.old_price > item.price && (
                      <p className="text-sm text-gray-400 line-through">
                        {formatPrice(
                          Number(item.old_price)
                        )}
                      </p>
                    )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================
          RETOUR
      ===================================================== */}

      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-white px-6 py-4 rounded-xl font-black shadow-sm hover:shadow-md transition"
        >
          ← Continuer mes achats
        </Link>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="bg-black text-white mt-10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <h3 className="text-2xl font-black mb-4">
                🇨🇮 Ivoire Shop
              </h3>

              <p className="text-gray-400 leading-7">
                La marketplace ivoirienne pour acheter et vendre
                facilement en ligne.
              </p>
            </div>

            <div>
              <h3 className="font-black text-lg mb-4">
                Navigation
              </h3>

              <Link
                href="/"
                className="text-gray-400 hover:text-yellow-400 block mb-3"
              >
                🛍️ Boutique
              </Link>

              <Link
                href="/suivi"
                className="text-gray-400 hover:text-yellow-400 block mb-3"
              >
                📦 Suivre ma commande
              </Link>

              <Link
                href="/seller"
                className="text-gray-400 hover:text-yellow-400 block"
              >
                🏪 Devenir vendeur
              </Link>
            </div>

            <div>
              <h3 className="font-black text-lg mb-4">
                Nos engagements
              </h3>

              <p className="text-gray-400 mb-2">
                🔒 Paiement sécurisé
              </p>

              <p className="text-gray-400 mb-2">
                🚚 Livraison en Côte d'Ivoire
              </p>

              <p className="text-gray-400">
                🇨🇮 Marketplace ivoirienne
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 text-center text-gray-500 text-sm">
            © 2026 Ivoire Shop — Tous droits réservés.
          </div>
        </div>
      </footer>
    </main>
  );
}