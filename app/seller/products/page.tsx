"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

  // PROMOTION
  promo_active: boolean | null;
  promo_price: number | null;
  promo_end: string | null;
  promo_label: string | null;

  created_at: string;
  seller_id: string;
};

const categories = [
  "Mode",
  "Électronique",
  "Téléphones",
  "Maison",
  "Beauté",
  "Chaussures",
  "Accessoires",
  "Alimentation",
  "Sport",
  "Autre",
];

const promoLabels = [
  "🔥 Offre du jour",
  "⚡ Vente flash",
  "🏷️ Promotion",
  "💥 Grande promo",
  "🎉 Offre spéciale",
  "🛍️ Soldes",
];

function formatPrice(price: number) {
  return (
    new Intl.NumberFormat("fr-FR").format(price) +
    " FCFA"
  );
}

function getDiscountPercentage(
  price: number,
  promoPrice: number
) {
  if (!price || !promoPrice || promoPrice >= price) {
    return 0;
  }

  return Math.round(
    ((price - promoPrice) / price) * 100
  );
}

function formatPromoDate(date: string | null) {
  if (!date) return "";

  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isPromoValid(product: Product) {
  if (!product.promo_active) {
    return false;
  }

  if (!product.promo_price) {
    return false;
  }

  if (product.promo_price >= product.price) {
    return false;
  }

  if (
    product.promo_end &&
    new Date(product.promo_end).getTime() <= Date.now()
  ) {
    return false;
  }

  return true;
}

export default function SellerProductsPage() {
  const router = useRouter();
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    old_price: "",
    category: "",
    image: "",
    stock: "1",
    popular: false,
    active: true,

    // PROMOTION
    promo_active: false,
    promo_price: "",
    promo_end: "",
    promo_label: "🔥 Offre du jour",
  });

  async function getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.push("/login");
      return null;
    }

    return user;
  }

  async function loadProducts() {
    setLoading(true);
    setError("");

    const user = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const {
      data,
      error: productsError,
    } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (productsError) {
      console.error(
        "Erreur chargement produits :",
        productsError
      );

      setError(
        productsError.message ||
          "Impossible de charger vos produits."
      );
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function resetForm() {
    setForm({
      name: "",
      description: "",
      price: "",
      old_price: "",
      category: "",
      image: "",
      stock: "1",
      popular: false,
      active: true,

      promo_active: false,
      promo_price: "",
      promo_end: "",
      promo_label: "🔥 Offre du jour",
    });

    setSelectedFile(null);
    setPreviewUrl(null);
    setEditingId(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openAddForm() {
    resetForm();

    setError("");
    setSuccess("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(product: Product) {
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price || ""),
      old_price: product.old_price
        ? String(product.old_price)
        : "",
      category: product.category || "",
      image: product.image || "",
      stock: String(product.stock ?? 0),
      popular: Boolean(product.popular),
      active: product.active !== false,

      promo_active: Boolean(product.promo_active),
      promo_price: product.promo_price
        ? String(product.promo_price)
        : "",
      promo_end: product.promo_end
        ? new Date(product.promo_end)
            .toISOString()
            .slice(0, 16)
        : "",
      promo_label:
        product.promo_label ||
        "🔥 Offre du jour",
    });

    setSelectedFile(null);
    setPreviewUrl(product.image || null);
    setEditingId(product.id);

    setError("");
    setSuccess("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    if (!file.type.startsWith("image/")) {
      setError(
        "Veuillez sélectionner une image."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "L'image ne doit pas dépasser 5 Mo."
      );

      event.target.value = "";
      return;
    }

    setSelectedFile(file);

    const localPreview =
      URL.createObjectURL(file);

    setPreviewUrl(localPreview);
  }

  async function uploadImage(
    file: File,
    userId: string
  ) {
    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}.${extension}`;

    const filePath =
      `${userId}/${fileName}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("product-images")
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          upsert: false,
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    // --------------------------------------------------
    // VALIDATION PRODUIT
    // --------------------------------------------------

    if (!form.name.trim()) {
      setError(
        "Le nom du produit est obligatoire."
      );
      return;
    }

    if (
      !form.price ||
      Number(form.price) <= 0
    ) {
      setError(
        "Veuillez entrer un prix valide."
      );
      return;
    }

    if (
      form.stock === "" ||
      Number(form.stock) < 0
    ) {
      setError(
        "Veuillez entrer un stock valide."
      );
      return;
    }

    // --------------------------------------------------
    // VALIDATION PROMOTION
    // --------------------------------------------------

    if (form.promo_active) {
      if (
        !form.promo_price ||
        Number(form.promo_price) <= 0
      ) {
        setError(
          "Veuillez entrer un prix promotionnel valide."
        );
        return;
      }

      if (
        Number(form.promo_price) >=
        Number(form.price)
      ) {
        setError(
          "Le prix promotionnel doit être inférieur au prix normal."
        );
        return;
      }

      if (!form.promo_end) {
        setError(
          "Veuillez définir une date de fin pour la promotion."
        );
        return;
      }

      const promoEnd =
        new Date(form.promo_end).getTime();

      if (promoEnd <= Date.now()) {
        setError(
          "La date de fin de la promotion doit être dans le futur."
        );
        return;
      }
    }

    setSaving(true);

    try {
      const user = await getCurrentUser();

      if (!user) {
        return;
      }

      let imageUrl = form.image;

      if (selectedFile) {
        imageUrl =
          await uploadImage(
            selectedFile,
            user.id
          );
      }

      const productData = {
        name: form.name.trim(),

        description:
          form.description.trim() ||
          null,

        price: Number(form.price),

        old_price:
          form.old_price &&
          Number(form.old_price) > 0
            ? Number(form.old_price)
            : null,

        category:
          form.category || null,

        image:
          imageUrl.trim() || null,

        stock: Number(form.stock),

        popular: form.popular,

        active: form.active,

        // PROMOTION
        promo_active:
          form.promo_active,

        promo_price:
          form.promo_active &&
          form.promo_price
            ? Number(form.promo_price)
            : null,

        promo_end:
          form.promo_active &&
          form.promo_end
            ? new Date(
                form.promo_end
              ).toISOString()
            : null,

        promo_label:
          form.promo_active
            ? form.promo_label
            : null,
      };

      if (editingId) {
        const {
          error: updateError,
        } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingId)
          .eq(
            "seller_id",
            user.id
          );

        if (updateError) {
          throw updateError;
        }

        setSuccess(
          form.promo_active
            ? "Produit et promotion modifiés avec succès."
            : "Produit modifié avec succès."
        );
      } else {
        const {
          error: insertError,
        } = await supabase
          .from("products")
          .insert({
            ...productData,

            seller_id: user.id,

            rating: 0,

            reviews: 0,
          });

        if (insertError) {
          throw insertError;
        }

        setSuccess(
          form.promo_active
            ? "Produit et promotion ajoutés avec succès."
            : "Produit ajouté avec succès."
        );
      }

      resetForm();
      setShowForm(false);

      await loadProducts();
    } catch (err: any) {
      console.error(
        "Erreur sauvegarde produit :",
        err
      );

      setError(
        err?.message ||
          "Impossible d'enregistrer le produit."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    product: Product
  ) {
    const confirmed =
      window.confirm(
        `Voulez-vous vraiment supprimer "${product.name}" ?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    const user =
      await getCurrentUser();

    if (!user) {
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq(
        "seller_id",
        user.id
      );

    if (deleteError) {
      console.error(
        "Erreur suppression produit :",
        deleteError
      );

      setError(
        deleteError.message ||
          "Impossible de supprimer le produit."
      );

      return;
    }

    setSuccess(
      "Produit supprimé avec succès."
    );

    await loadProducts();
  }

  async function toggleActive(
    product: Product
  ) {
    const user =
      await getCurrentUser();

    if (!user) {
      return;
    }

    const {
      error: updateError,
    } = await supabase
      .from("products")
      .update({
        active: !product.active,
      })
      .eq("id", product.id)
      .eq(
        "seller_id",
        user.id
      );

    if (updateError) {
      setError(
        updateError.message ||
          "Impossible de modifier le statut."
      );

      return;
    }

    await loadProducts();
  }

  async function togglePromotion(
    product: Product
  ) {
    const user =
      await getCurrentUser();

    if (!user) {
      return;
    }

    const disabling =
      Boolean(product.promo_active);

    const {
      error: updateError,
    } = await supabase
      .from("products")
      .update({
        promo_active:
          !disabling,
      })
      .eq("id", product.id)
      .eq(
        "seller_id",
        user.id
      );

    if (updateError) {
      setError(
        updateError.message ||
          "Impossible de modifier la promotion."
      );

      return;
    }

    setSuccess(
      disabling
        ? "Promotion désactivée."
        : "Promotion activée."
    );

    await loadProducts();
  }

  // --------------------------------------------------
  // CALCUL APERCU PROMOTION
  // --------------------------------------------------

  const previewDiscount =
    form.promo_active &&
    form.price &&
    form.promo_price
      ? getDiscountPercentage(
          Number(form.price),
          Number(form.promo_price)
        )
      : 0;

  const previewSavings =
    form.promo_active &&
    form.price &&
    form.promo_price
      ? Number(form.price) -
        Number(form.promo_price)
      : 0;

  return (
    <main className="min-h-screen bg-slate-100">
      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="bg-black text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">
              🇨🇮 Ivoire Shop
            </h1>

            <p className="text-sm text-gray-300 mt-1">
              Gestion de mes produits
            </p>
          </div>

          <button
            onClick={() =>
              router.push("/seller")
            }
            className="bg-white text-black px-5 py-3 rounded-xl font-bold hover:bg-gray-200 transition shadow-sm"
          >
            ← Tableau de bord
          </button>
        </div>
      </header>

      {/* ==================================================
          CONTENU
      ================================================== */}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* TITRE */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950">
              Mes produits
            </h2>

            <p className="text-gray-600 mt-2">
              Ajoutez, modifiez, publiez et
              mettez vos produits en promotion.
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="bg-black text-white px-6 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition shadow-md"
          >
            + Ajouter un produit
          </button>
        </div>

        {/* ==================================================
            MESSAGE ERREUR
        ================================================== */}

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-800 rounded-xl p-4 font-medium">
            ❌ {error}
          </div>
        )}

        {/* ==================================================
            MESSAGE SUCCES
        ================================================== */}

        {success && (
          <div className="mb-6 bg-green-50 border-2 border-green-200 text-green-800 rounded-xl p-4 font-medium">
            ✅ {success}
          </div>
        )}

        {/* ==================================================
            FORMULAIRE
        ================================================== */}

        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 sm:p-7 mb-8">
            <div className="flex items-start justify-between gap-4 mb-7">
              <div>
                <h3 className="text-2xl font-black text-gray-950">
                  {editingId
                    ? "Modifier le produit"
                    : "Ajouter un produit"}
                </h3>

                <p className="text-gray-600 mt-1">
                  Remplissez les informations
                  de votre produit.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-black font-bold text-lg"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-7"
            >
              {/* ==================================================
                  NOM
              ================================================== */}

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Nom du produit *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="Ex : iPhone 13 Pro"
                  className="w-full bg-white text-gray-950 placeholder-gray-400 border-2 border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:border-black focus:ring-2 focus:ring-gray-200 transition"
                  required
                />
              </div>

              {/* ==================================================
                  DESCRIPTION
              ================================================== */}

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description:
                        e.target.value,
                    })
                  }
                  placeholder="Décrivez votre produit..."
                  rows={5}
                  className="w-full bg-white text-gray-950 placeholder-gray-400 border-2 border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:border-black focus:ring-2 focus:ring-gray-200 transition resize-none"
                />
              </div>

              {/* ==================================================
                  PRIX
              ================================================== */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-bold text-gray-900 mb-2">
                    Prix de vente *
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          price:
                            e.target.value,
                        })
                      }
                      placeholder="150000"
                      className="w-full bg-white text-gray-950 placeholder-gray-400 border-2 border-gray-300 rounded-xl px-4 py-3.5 pr-20 outline-none focus:border-black focus:ring-2 focus:ring-gray-200 transition"
                      required
                    />

                    <span className="absolute right-4 top-4 text-sm font-bold text-gray-600">
                      FCFA
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-900 mb-2">
                    Ancien prix
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={form.old_price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          old_price:
                            e.target.value,
                        })
                      }
                      placeholder="180000"
                      className="w-full bg-white text-gray-950 placeholder-gray-400 border-2 border-gray-300 rounded-xl px-4 py-3.5 pr-20 outline-none focus:border-black focus:ring-2 focus:ring-gray-200 transition"
                    />

                    <span className="absolute right-4 top-4 text-sm font-bold text-gray-600">
                      FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* ==================================================
                  PROMOTION
              ================================================== */}

              <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 p-5 sm:p-7">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        🔥
                      </span>

                      <div>
                        <h3 className="text-2xl font-black text-gray-950">
                          Promotion
                        </h3>

                        <p className="text-gray-600 mt-1">
                          Attirez plus de clients
                          avec une offre spéciale.
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 bg-white border-2 border-orange-200 rounded-xl px-5 py-4 cursor-pointer shadow-sm">
                    <input
                      type="checkbox"
                      checked={
                        form.promo_active
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          promo_active:
                            e.target.checked,
                        })
                      }
                      className="w-5 h-5 accent-orange-500 cursor-pointer"
                    />

                    <span className="font-black">
                      Activer la promotion
                    </span>
                  </label>
                </div>

                {form.promo_active ? (
                  <div className="space-y-5">
                    {/* PRIX PROMO */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block font-bold text-gray-900 mb-2">
                          Prix promotionnel *
                        </label>

                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={
                              form.promo_price
                            }
                            onChange={(e) =>
                              setForm({
                                ...form,
                                promo_price:
                                  e.target.value,
                              })
                            }
                            placeholder="12000"
                            className="w-full bg-white border-2 border-orange-200 rounded-xl px-4 py-3.5 pr-20 font-bold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                            required={
                              form.promo_active
                            }
                          />

                          <span className="absolute right-4 top-4 text-sm font-bold text-gray-600">
                            FCFA
                          </span>
                        </div>
                      </div>

                      {/* DATE */}

                      <div>
                        <label className="block font-bold text-gray-900 mb-2">
                          Fin de la promotion *
                        </label>

                        <input
                          type="datetime-local"
                          value={
                            form.promo_end
                          }
                          onChange={(e) =>
                            setForm({
                              ...form,
                              promo_end:
                                e.target.value,
                            })
                          }
                          className="w-full bg-white border-2 border-orange-200 rounded-xl px-4 py-3.5 font-bold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                          required={
                            form.promo_active
                          }
                        />
                      </div>
                    </div>

                    {/* LIBELLE */}

                    <div>
                      <label className="block font-bold text-gray-900 mb-2">
                        Badge de promotion
                      </label>

                      <select
                        value={
                          form.promo_label
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            promo_label:
                              e.target.value,
                          })
                        }
                        className="w-full bg-white border-2 border-orange-200 rounded-xl px-4 py-3.5 font-bold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      >
                        {promoLabels.map(
                          (label) => (
                            <option
                              key={label}
                              value={label}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* APERCU */}

                    {form.price &&
                      form.promo_price &&
                      Number(
                        form.promo_price
                      ) <
                        Number(
                          form.price
                        ) && (
                        <div className="bg-black text-white rounded-2xl p-5 sm:p-6">
                          <p className="text-yellow-400 font-black text-sm uppercase tracking-wide">
                            Aperçu de votre promotion
                          </p>

                          <div className="flex flex-wrap items-end gap-3 mt-3">
                            <span className="text-3xl sm:text-4xl font-black">
                              {formatPrice(
                                Number(
                                  form.promo_price
                                )
                              )}
                            </span>

                            <span className="text-gray-400 line-through font-bold">
                              {formatPrice(
                                Number(
                                  form.price
                                )
                              )}
                            </span>

                            <span className="bg-red-500 text-white px-3 py-1.5 rounded-lg font-black">
                              -
                              {
                                previewDiscount
                              }
                              %
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3 text-sm">
                            <span className="bg-white/10 px-3 py-2 rounded-lg">
                              {form.promo_label}
                            </span>

                            <span className="bg-green-500/20 text-green-300 px-3 py-2 rounded-lg font-bold">
                              💰 Économie :{" "}
                              {formatPrice(
                                previewSavings
                              )}
                            </span>
                          </div>

                          {form.promo_end && (
                            <p className="text-gray-300 text-sm mt-4">
                              ⏰ Jusqu'au{" "}
                              {formatPromoDate(
                                new Date(
                                  form.promo_end
                                ).toISOString()
                              )}
                            </p>
                          )}
                        </div>
                      )}

                    <div className="bg-orange-100 border border-orange-200 rounded-xl p-4 text-sm text-orange-900">
                      💡 <strong>Conseil :</strong>{" "}
                      une promotion avec un prix
                      réellement inférieur au prix
                      normal augmente les chances
                      d'attirer les clients.
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/70 border border-orange-100 rounded-xl p-4 text-gray-600">
                    🔕 La promotion est actuellement
                    désactivée. Active-la pour
                    afficher une offre spéciale sur
                    ce produit.
                  </div>
                )}
              </div>

              {/* ==================================================
                  CATEGORIE + STOCK
              ================================================== */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-bold text-gray-900 mb-2">
                    Catégorie
                  </label>

                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category:
                          e.target.value,
                      })
                    }
                    className="w-full bg-white text-gray-950 border-2 border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:border-black focus:ring-2 focus:ring-gray-200 transition"
                  >
                    <option value="">
                      Sélectionner une catégorie
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-900 mb-2">
                    Stock disponible *
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stock:
                          e.target.value,
                      })
                    }
                    className="w-full bg-white text-gray-950 border-2 border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:border-black focus:ring-2 focus:ring-gray-200 transition"
                    required
                  />
                </div>
              </div>

              {/* ==================================================
                  PHOTO
              ================================================== */}

              <div>
                <label className="block text-base font-bold text-gray-900 mb-2">
                  📸 Photo du produit
                </label>

                <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-2xl p-6 sm:p-8">
                  {previewUrl ? (
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                      <div className="w-52 h-52 rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm flex-shrink-0">
                        <img
                          src={previewUrl}
                          alt="Aperçu du produit"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 text-center md:text-left">
                        <p className="font-bold text-gray-950 text-lg mb-2">
                          {selectedFile
                            ? selectedFile.name
                            : "Photo actuelle"}
                        </p>

                        {selectedFile && (
                          <p className="text-sm text-gray-600 mb-5">
                            Taille :{" "}
                            {(
                              selectedFile.size /
                              1024 /
                              1024
                            ).toFixed(2)}{" "}
                            Mo
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            fileInputRef.current?.click()
                          }
                          className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition"
                        >
                          📷 Changer la photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-6xl mb-4">
                        📸
                      </div>

                      <h4 className="font-extrabold text-gray-950 text-xl mb-2">
                        Ajoutez une photo
                      </h4>

                      <p className="text-gray-600 text-sm mb-6">
                        JPG, PNG ou WEBP — maximum
                        5 Mo
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        className="bg-black text-white px-7 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition shadow-md"
                      >
                        📷 Choisir une photo
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <p className="text-sm text-gray-600 mt-2">
                  La photo sera automatiquement
                  envoyée sur Ivoire Shop lors de
                  la publication.
                </p>
              </div>

              {/* ==================================================
                  OPTIONS
              ================================================== */}

              <div>
                <p className="block text-base font-bold text-gray-900 mb-3">
                  Options du produit
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-4 border-2 border-gray-300 bg-white rounded-xl px-5 py-4 cursor-pointer hover:border-black transition">
                    <input
                      type="checkbox"
                      checked={form.popular}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          popular:
                            e.target.checked,
                        })
                      }
                      className="w-5 h-5 accent-black cursor-pointer"
                    />

                    <div>
                      <p className="font-bold text-gray-950">
                        ⭐ Produit populaire
                      </p>

                      <p className="text-sm text-gray-600 mt-1">
                        Mettre ce produit en
                        avant.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-4 border-2 border-gray-300 bg-white rounded-xl px-5 py-4 cursor-pointer hover:border-black transition">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          active:
                            e.target.checked,
                        })
                      }
                      className="w-5 h-5 accent-black cursor-pointer"
                    />

                    <div>
                      <p className="font-bold text-gray-950">
                        🟢 Publier immédiatement
                      </p>

                      <p className="text-sm text-gray-600 mt-1">
                        Le produit sera visible
                        dans la boutique.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* ==================================================
                  BOUTONS
              ================================================== */}

              <div className="flex flex-col md:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? "⏳ Enregistrement..."
                    : editingId
                    ? "Enregistrer les modifications"
                    : "Publier le produit"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="md:w-48 border-2 border-gray-300 bg-white text-gray-800 py-4 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================
            LISTE DES PRODUITS
        ================================================== */}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-5 sm:px-6 py-5 border-b border-gray-200">
            <h3 className="text-xl font-extrabold text-gray-950">
              Vos produits
            </h3>

            <p className="text-gray-600 mt-1">
              {products.length} produit
              {products.length > 1
                ? "s"
                : ""}
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">
                ⏳
              </div>

              <p className="text-gray-600 font-medium">
                Chargement de vos produits...
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">
                📦
              </div>

              <h3 className="text-xl font-extrabold text-gray-950 mb-2">
                Aucun produit
              </h3>

              <p className="text-gray-600 mb-6">
                Commencez à vendre en ajoutant
                votre premier produit.
              </p>

              <button
                onClick={openAddForm}
                className="bg-black text-white px-6 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition"
              >
                + Ajouter mon premier produit
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {products.map((product) => {
                const activePromo =
                  isPromoValid(product);

                const discount =
                  activePromo &&
                  product.promo_price
                    ? getDiscountPercentage(
                        Number(
                          product.price
                        ),
                        Number(
                          product.promo_price
                        )
                      )
                    : 0;

                return (
                  <div
                    key={product.id}
                    className="p-5 sm:p-6"
                  >
                    <div className="flex flex-col md:flex-row gap-5">
                      {/* IMAGE */}

                      <div className="w-full md:w-36 h-36 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-200">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">
                            📦
                          </div>
                        )}
                      </div>

                      {/* INFORMATIONS */}

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xl font-extrabold text-gray-950">
                                {product.name}
                              </h4>

                              {product.popular && (
                                <span className="bg-yellow-100 text-yellow-900 border border-yellow-200 text-xs font-bold px-3 py-1 rounded-full">
                                  ⭐ Populaire
                                </span>
                              )}

                              <span
                                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                                  product.active
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-gray-100 text-gray-700 border-gray-200"
                                }`}
                              >
                                {product.active
                                  ? "Publié"
                                  : "Masqué"}
                              </span>

                              {activePromo && (
                                <span className="bg-red-100 text-red-700 border border-red-200 text-xs font-black px-3 py-1 rounded-full">
                                  🔥 PROMO -
                                  {discount}%
                                </span>
                              )}
                            </div>

                            <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                              {product.description ||
                                "Aucune description"}
                            </p>
                          </div>

                          {/* PRIX */}

                          <div className="text-left lg:text-right flex-shrink-0">
                            {activePromo &&
                            product.promo_price ? (
                              <>
                                <p className="text-2xl font-extrabold text-red-600">
                                  {formatPrice(
                                    Number(
                                      product.promo_price
                                    )
                                  )}
                                </p>

                                <p className="text-sm text-gray-500 line-through mt-1">
                                  {formatPrice(
                                    Number(
                                      product.price
                                    )
                                  )}
                                </p>

                                <p className="text-xs text-green-600 font-bold mt-1">
                                  Économie{" "}
                                  {formatPrice(
                                    Number(
                                      product.price
                                    ) -
                                      Number(
                                        product.promo_price
                                      )
                                  )}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-2xl font-extrabold text-gray-950">
                                  {formatPrice(
                                    Number(
                                      product.price
                                    )
                                  )}
                                </p>

                                {product.old_price &&
                                  product.old_price >
                                    product.price && (
                                    <p className="text-sm text-gray-500 line-through mt-1">
                                      {formatPrice(
                                        Number(
                                          product.old_price
                                        )
                                      )}
                                    </p>
                                  )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* INFOS */}

                        <div className="flex flex-wrap gap-3 mt-4">
                          <span className="bg-gray-100 border border-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">
                            📦 Stock :{" "}
                            <strong>
                              {product.stock ??
                                0}
                            </strong>
                          </span>

                          {product.category && (
                            <span className="bg-gray-100 border border-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm">
                              🗂️{" "}
                              {product.category}
                            </span>
                          )}

                          {activePromo && (
                            <span className="bg-orange-50 border border-orange-200 text-orange-800 px-3 py-2 rounded-lg text-sm font-bold">
                              {product.promo_label ||
                                "🔥 Promotion"}
                            </span>
                          )}
                        </div>

                        {/* FIN PROMO */}

                        {activePromo &&
                          product.promo_end && (
                            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                              <p className="text-sm text-orange-800 font-bold">
                                ⏰ Promotion jusqu'au{" "}
                                {formatPromoDate(
                                  product.promo_end
                                )}
                              </p>
                            </div>
                          )}

                        {/* BOUTONS */}

                        <div className="flex flex-wrap gap-2 mt-5">
                          <button
                            onClick={() =>
                              openEditForm(
                                product
                              )
                            }
                            className="border-2 border-gray-300 bg-white text-gray-800 px-4 py-2.5 rounded-lg font-bold hover:border-black hover:bg-gray-50 transition"
                          >
                            ✏️ Modifier
                          </button>

                          <button
                            onClick={() =>
                              toggleActive(
                                product
                              )
                            }
                            className="border-2 border-gray-300 bg-white text-gray-800 px-4 py-2.5 rounded-lg font-bold hover:border-black hover:bg-gray-50 transition"
                          >
                            {product.active
                              ? "👁️ Masquer"
                              : "🟢 Publier"}
                          </button>

                          <button
                            onClick={() =>
                              togglePromotion(
                                product
                              )
                            }
                            className={`border-2 px-4 py-2.5 rounded-lg font-bold transition ${
                              activePromo
                                ? "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
                                : "border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                            }`}
                          >
                            {activePromo
                              ? "🔥 Désactiver promo"
                              : "🔥 Activer promo"}
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(
                                product
                              )
                            }
                            className="border-2 border-red-200 bg-white text-red-700 px-4 py-2.5 rounded-lg font-bold hover:bg-red-50 transition"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}