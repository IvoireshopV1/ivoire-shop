import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // Récupérer le corps brut envoyé par Paystack
    const rawBody = await request.text();

    // Récupérer la signature Paystack
    const signature = request.headers.get("x-paystack-signature");

    if (!signature) {
      console.error("Signature Paystack absente.");

      return NextResponse.json(
        { error: "Signature absente" },
        { status: 401 }
      );
    }

    // Clé secrète Paystack
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY manquante.");

      return NextResponse.json(
        { error: "Configuration serveur incorrecte" },
        { status: 500 }
      );
    }

    // Vérifier que la requête vient bien de Paystack
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.error("Signature Paystack invalide.");

      return NextResponse.json(
        { error: "Signature invalide" },
        { status: 401 }
      );
    }

    // Lire l'événement
    const event = JSON.parse(rawBody);

    console.log("=== WEBHOOK PAYSTACK ===");
    console.log("Événement :", event.event);

    // Nous traitons uniquement les paiements réussis
    if (event.event !== "charge.success") {
      return NextResponse.json({
        received: true,
      });
    }

    const transaction = event.data;

    const reference = transaction?.reference;
    const transactionStatus = transaction?.status;

    console.log("Référence :", reference);
    console.log("Statut Paystack :", transactionStatus);

    if (!reference) {
      console.error("Référence Paystack absente.");

      return NextResponse.json(
        { error: "Référence absente" },
        { status: 400 }
      );
    }

    // Vérifier que Paystack considère bien la transaction comme réussie
    if (transactionStatus !== "success") {
      console.log(
        "Transaction reçue mais pas encore confirmée comme success."
      );

      return NextResponse.json({
        received: true,
      });
    }

    // Client Supabase serveur
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error(
        "Variables Supabase serveur manquantes."
      );

      return NextResponse.json(
        { error: "Configuration Supabase incorrecte" },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Mettre la commande Ivoire Shop à jour
    const { data, error } = await supabase
      .from("orders")
      .update({
        status: "Payée",
        payment_method: "Paystack",
      })
      .eq("order_number", reference)
      .select();

    if (error) {
      console.error(
        "Erreur mise à jour commande :",
        error
      );

      return NextResponse.json(
        {
          error: "Impossible de mettre à jour la commande",
        },
        { status: 500 }
      );
    }

    console.log(
      "Commande mise à jour :",
      data
    );

    return NextResponse.json({
      received: true,
      success: true,
    });
  } catch (error) {
    console.error(
      "Erreur webhook Paystack :",
      error
    );

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}