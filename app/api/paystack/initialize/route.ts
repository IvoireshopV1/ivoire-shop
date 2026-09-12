import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      email,
      amount,
      orderNumber,
      customerName,
      customerPhone,
      userId,
      plan,
    } = body;

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

    // ============================================
    // EMAIL
    // ============================================

    if (!email || !email.trim()) {
      return NextResponse.json(
        {
          error: "Email client manquant.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // TYPE DE PAIEMENT
    // ============================================

    const isSubscription =
      plan === "pro" ||
      plan === "premium";

    let finalAmount: number;
    let reference: string;

    // ============================================
    // ABONNEMENT VENDEUR
    // ============================================

    if (isSubscription) {
      if (!userId) {
        return NextResponse.json(
          {
            error: "Identifiant vendeur manquant.",
          },
          { status: 400 }
        );
      }

      if (plan === "pro") {
        finalAmount = 3000;
      } else {
        finalAmount = 5000;
      }

      reference = `SUB-${plan.toUpperCase()}-${Date.now()}`;

      console.log(
        "=== ABONNEMENT VENDEUR ==="
      );

      console.log("Utilisateur :", userId);
      console.log("Formule :", plan);
      console.log("Montant XOF :", finalAmount);
      console.log("Référence :", reference);
    }

    // ============================================
    // PAIEMENT COMMANDE
    // ============================================

    else {
      if (!amount || Number(amount) <= 0) {
        return NextResponse.json(
          {
            error: "Montant invalide.",
          },
          { status: 400 }
        );
      }

      finalAmount = Number(amount);

      reference =
        orderNumber ||
        `ORDER-${Date.now()}`;

      console.log(
        "=== PAIEMENT COMMANDE ==="
      );

      console.log(
        "Montant XOF :",
        finalAmount
      );

      console.log(
        "Référence :",
        reference
      );
    }

    // ============================================
    // METADATA
    // ============================================

    const metadata = isSubscription
      ? {
          type: "seller_subscription",
          user_id: userId,
          plan: plan,
          plan_name:
            plan === "pro"
              ? "Pro"
              : "Premium",
          amount_xof: finalAmount,
          customer_name:
            customerName || "",
          customer_phone:
            customerPhone || "",
        }
      : {
          type: "order",
          order_number: reference,
          customer_name:
            customerName || "",
          customer_phone:
            customerPhone || "",
        };

    // ============================================
    // INITIALISATION PAYSTACK
    // ============================================

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const paystackBody: any = {
      email: email.trim(),

      // XOF × 100
      amount:
        Math.round(finalAmount) * 100,

      currency: "XOF",

      reference,

      metadata,
    };

    // Callback uniquement pour les abonnements
    if (isSubscription) {
      paystackBody.callback_url =
        `${siteUrl}/seller/subscription/callback`;
    }

    console.log(
      "=== INITIALISATION PAYSTACK ==="
    );

    console.log("Email :", email);
    console.log(
      "Montant XOF :",
      finalAmount
    );
    console.log(
      "Référence :",
      reference
    );

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify(
          paystackBody
        ),
      }
    );

    const responseText =
      await response.text();

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

    // ============================================
    // ERREUR PAYSTACK
    // ============================================

    if (
      !response.ok ||
      !data.status
    ) {
      console.error(
        "Erreur Paystack :",
        data
      );

      return NextResponse.json(
        {
          error:
            data.message ||
            "Paystack refuse l'initialisation du paiement.",
        },
        {
          status:
            response.status || 400,
        }
      );
    }

    // ============================================
    // LIEN DE PAIEMENT
    // ============================================

    if (
      !data.data?.authorization_url
    ) {
      return NextResponse.json(
        {
          error:
            "Paystack n'a pas fourni de lien de paiement.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // SUCCÈS
    // ============================================

    return NextResponse.json({
      authorization_url:
        data.data.authorization_url,

      access_code:
        data.data.access_code,

      reference:
        data.data.reference,

      type: isSubscription
        ? "seller_subscription"
        : "order",

      plan:
        isSubscription
          ? plan
          : null,

      amount:
        finalAmount,
    });
  } catch (error) {
    console.error(
      "Erreur serveur Paystack :",
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