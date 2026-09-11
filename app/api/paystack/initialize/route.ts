
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
    } = body;

    // Vérification de la clé Paystack
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

    // Vérification de l'email
    if (!email || !email.trim()) {
      return NextResponse.json(
        {
          error: "Email client manquant.",
        },
        { status: 400 }
      );
    }

    // Vérification du montant
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        {
          error: "Montant invalide.",
        },
        { status: 400 }
      );
    }

    console.log("=== INITIALISATION PAYSTACK ===");
    console.log("Email :", email);
    console.log("Montant XOF :", amount);
    console.log("Référence :", orderNumber);

    // Appel de l'API Paystack
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

          // Paystack demande x100 pour le XOF
          amount: Math.round(Number(amount) * 100),

          currency: "XOF",

          reference: orderNumber,

          metadata: {
            order_number: orderNumber,
            customer_name: customerName,
            customer_phone: customerPhone,
          },
        }),
      }
    );

    const responseText = await response.text();

    console.log("Paystack HTTP :", response.status);
    console.log("Paystack réponse :", responseText);

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

    // Paystack a refusé la transaction
    if (!response.ok || !data.status) {
      console.error("Erreur Paystack :", data);

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

    // Vérification du lien de paiement
    if (!data.data?.authorization_url) {
      return NextResponse.json(
        {
          error:
            "Paystack n'a pas fourni de lien de paiement.",
        },
        { status: 400 }
      );
    }

    // Tout est OK
    return NextResponse.json({
      authorization_url:
        data.data.authorization_url,

      access_code:
        data.data.access_code,

      reference:
        data.data.reference,
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

