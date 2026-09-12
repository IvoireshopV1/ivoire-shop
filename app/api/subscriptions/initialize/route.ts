
import { NextResponse } from "next/server";

type Plan = "pro" | "premium";

const PLANS = {
  pro: {
    name: "Pro",
    amount: 3000,
  },
  premium: {
    name: "Premium",
    amount: 5000,
  },
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      email,
      plan,
      userId,
      customerName,
      customerPhone,
    } = body;

    // =====================================================
    // 1. Vérification de la clé Paystack
    // =====================================================

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    console.log(
      "PAYSTACK_SECRET_KEY présente :",
      !!secretKey
    );

    if (!secretKey) {
      return NextResponse.json(
        {
          error: "PAYSTACK_SECRET_KEY est manquante.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 2. Vérification de l'email
    // =====================================================

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        {
          error: "Email du vendeur manquant.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 3. Vérification du plan
    // =====================================================

    if (plan !== "pro" && plan !== "premium") {
      return NextResponse.json(
        {
          error: "Formule invalide.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // TypeScript sait maintenant que plan est forcément
    // "pro" ou "premium".
    // =====================================================

    const selectedPlan =
      plan === "pro"
        ? PLANS.pro
        : PLANS.premium;

    // =====================================================
    // 4. Vérification de l'utilisateur
    // =====================================================

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        {
          error: "Utilisateur non identifié.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 5. Création d'une référence unique
    // =====================================================

    const reference = `IVS-${plan.toUpperCase()}-${Date.now()}`;

    console.log("========================================");
    console.log("=== ABONNEMENT IVOIRE SHOP ===");
    console.log("========================================");
    console.log("Utilisateur :", userId);
    console.log("Email :", email);
    console.log("Formule :", selectedPlan.name);
    console.log("Montant XOF :", selectedPlan.amount);
    console.log("Référence :", reference);

    // =====================================================
    // 6. Initialisation Paystack
    // =====================================================

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: email.trim(),

          // Montant envoyé à Paystack
          amount: selectedPlan.amount * 100,

          currency: "XOF",

          reference,

          metadata: {
            type: "seller_subscription",
            user_id: userId,
            plan,
            plan_name: selectedPlan.name,
            amount_xof: selectedPlan.amount,
            customer_name: customerName || "",
            customer_phone: customerPhone || "",
          },

          // Redirection après le paiement
          callback_url:
            `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/seller/subscription/callback`,
        }),
      }
    );

    // =====================================================
    // 7. Lecture de la réponse Paystack
    // =====================================================

    const responseText = await response.text();

    console.log(
      "Paystack HTTP :",
      response.status
    );

    console.log(
      "Paystack réponse :",
      responseText
    );

    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          error:
            "Paystack a renvoyé une réponse impossible à lire.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 8. Vérification de la réponse Paystack
    // =====================================================

    if (!response.ok || !data.status) {
      console.error(
        "Erreur Paystack abonnement :",
        data
      );

      return NextResponse.json(
        {
          error:
            data.message ||
            "Paystack refuse l'initialisation du paiement.",
        },
        {
          status: response.status || 400,
        }
      );
    }

    // =====================================================
    // 9. Vérification du lien de paiement
    // =====================================================

    if (!data.data?.authorization_url) {
      return NextResponse.json(
        {
          error:
            "Paystack n'a pas fourni de lien de paiement.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 10. Retour vers le frontend
    // =====================================================

    return NextResponse.json({
      success: true,

      authorization_url:
        data.data.authorization_url,

      access_code:
        data.data.access_code,

      reference:
        data.data.reference,

      plan,

      plan_name:
        selectedPlan.name,

      amount:
        selectedPlan.amount,
    });
  } catch (error) {
    console.error(
      "Erreur serveur abonnement Paystack :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur serveur lors de l'initialisation du paiement.",
      },
      { status: 500 }
    );
  }
}

