import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      email,
      userId,
      plan,
      customerName,
      customerPhone,
    } = body;

    const secretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          error:
            "PAYSTACK_SECRET_KEY est manquante.",
        },
        { status: 500 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        {
          error: "Email vendeur manquant.",
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Identifiant vendeur manquant.",
        },
        { status: 400 }
      );
    }

    if (
      plan !== "pro" &&
      plan !== "premium"
    ) {
      return NextResponse.json(
        {
          error: "Formule invalide.",
        },
        { status: 400 }
      );
    }

    const amount =
      plan === "pro"
        ? 3000
        : 5000;

    const reference = `SUB-${plan.toUpperCase()}-${Date.now()}`;

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const paystackBody = {
      email: email.trim(),

      amount: amount * 100,

      currency: "XOF",

      reference,

      callback_url:
        `${siteUrl}/seller/subscription/callback`,

      metadata: {
        type: "seller_subscription",

        user_id: userId,

        plan,

        plan_name:
          plan === "pro"
            ? "Pro"
            : "Premium",

        amount_xof: amount,

        customer_name:
          customerName || "",

        customer_phone:
          customerPhone || "",
      },
    };

    console.log(
      "=== ABONNEMENT VENDEUR ==="
    );

    console.log(
      "Utilisateur :",
      userId
    );

    console.log(
      "Formule :",
      plan
    );

    console.log(
      "Montant :",
      amount,
      "FCFA"
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
          Authorization:
            `Bearer ${secretKey}`,

          "Content-Type":
            "application/json",
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
      data =
        JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          error:
            "Paystack a renvoyé une réponse invalide.",
        },
        { status: 500 }
      );
    }

    if (
      !response.ok ||
      !data.status
    ) {
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

    if (
      !data.data?.authorization_url
    ) {
      return NextResponse.json(
        {
          error:
            "Paystack n'a pas fourni de lien de paiement.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,

      authorization_url:
        data.data.authorization_url,

      access_code:
        data.data.access_code,

      reference:
        data.data.reference,

      plan,

      amount,
    });
  } catch (error) {
    console.error(
      "Erreur abonnement Paystack :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur serveur lors de l'initialisation de l'abonnement.",
      },
      { status: 500 }
    );
  }
}