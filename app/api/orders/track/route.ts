import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizePhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("225")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return "225" + cleaned.substring(1);
  }

  return "225" + cleaned;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const orderNumber = String(
      body.order_number || ""
    ).trim();

    const phone = String(
      body.phone || ""
    ).trim();

    if (!orderNumber || !phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Veuillez renseigner le numéro de commande et le téléphone.",
        },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        order_number,
        customer_name,
        customer_phone,
        customer_commune,
        customer_address,
        payment_method,
        products,
        total,
        customer_note,
        status,
        created_at
        `
      )
      .eq("order_number", orderNumber)
      .eq("customer_phone", normalizedPhone)
      .maybeSingle();

    if (error) {
      console.error("Erreur recherche commande :", error);

      return NextResponse.json(
        {
          success: false,
          message:
            "Une erreur est survenue lors de la recherche.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Commande introuvable. Vérifiez le numéro de commande et le téléphone.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Requête invalide.",
      },
      { status: 400 }
    );
  }
}