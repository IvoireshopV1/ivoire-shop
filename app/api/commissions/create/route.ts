import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      order_number,
      products,
      payment_status = "pending",
    } = body;

    if (!order_number) {
      return NextResponse.json(
        { error: "Numéro de commande manquant." },
        { status: 400 }
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "Aucun produit dans la commande." },
        { status: 400 }
      );
    }

    // Regrouper les produits par vendeur
    const sellerTotals: Record<string, number> = {};

    for (const product of products) {
      const sellerId = product.seller_id;
      const price = Number(product.price) || 0;
      const quantity = Number(product.quantity) || 0;

      if (!sellerId || price <= 0 || quantity <= 0) {
        continue;
      }

      const amount = price * quantity;

      if (!sellerTotals[sellerId]) {
        sellerTotals[sellerId] = 0;
      }

      sellerTotals[sellerId] += amount;
    }

    const financialRows = Object.entries(sellerTotals).map(
      ([sellerId, grossAmount]) => {
        const commissionRate = 10;

        const commissionAmount =
          Math.round(grossAmount * commissionRate) / 100;

        const sellerAmount =
          Math.round((grossAmount - commissionAmount) * 100) / 100;

        return {
          order_number,
          seller_id: sellerId,
          gross_amount: grossAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          seller_amount: sellerAmount,
          payment_status,
          payout_status: "pending",
        };
      }
    );

    if (financialRows.length === 0) {
      return NextResponse.json(
        { error: "Aucun vendeur valide trouvé dans la commande." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("order_seller_financials")
      .upsert(financialRows, {
        onConflict: "order_number,seller_id",
      })
      .select();

    if (error) {
      console.error("Erreur commission:", error);

      return NextResponse.json(
        {
          error: "Impossible d'enregistrer les commissions.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Commission de 10 % enregistrée.",
      financials: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}