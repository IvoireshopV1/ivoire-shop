import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference } = body;

    // ============================================
    // 1. VÉRIFIER LA RÉFÉRENCE
    // ============================================

    if (!reference) {
      return NextResponse.json(
        {
          error: "Référence de paiement manquante.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 2. CLÉ PAYSTACK
    // ============================================

    const paystackSecret =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret) {
      return NextResponse.json(
        {
          error: "PAYSTACK_SECRET_KEY est manquante.",
        },
        { status: 500 }
      );
    }

    // ============================================
    // 3. VÉRIFIER LE PAIEMENT PAYSTACK
    // ============================================

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const responseText =
      await paystackResponse.text();

    let paystackData: any;

    try {
      paystackData = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          error: "Réponse Paystack invalide.",
        },
        { status: 500 }
      );
    }

    if (
      !paystackResponse.ok ||
      !paystackData.status
    ) {
      return NextResponse.json(
        {
          error:
            paystackData.message ||
            "Impossible de vérifier le paiement.",
        },
        { status: 400 }
      );
    }

    const transaction = paystackData.data;

    // ============================================
    // 4. VÉRIFIER LE STATUT
    // ============================================

    if (transaction?.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: "Le paiement n'a pas été validé.",
          status:
            transaction?.status || "unknown",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 5. RÉCUPÉRER LES METADATA
    // ============================================

    const metadata =
      transaction.metadata || {};

    const paymentType =
      metadata.type;

    const userId =
      metadata.user_id;

    const plan =
      metadata.plan;

    const customerName =
      metadata.customer_name || "";

    const customerPhone =
      metadata.customer_phone || "";

    // ============================================
    // 6. VÉRIFIER LE TYPE DE PAIEMENT
    // ============================================

    if (
      paymentType !==
      "seller_subscription"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cette transaction n'est pas un abonnement vendeur.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 7. VÉRIFIER LE PLAN
    // ============================================

    if (
      !userId ||
      (plan !== "pro" &&
        plan !== "premium")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Informations d'abonnement invalides.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 8. VÉRIFIER LE MONTANT
    // ============================================

    const expectedAmount =
      plan === "pro"
        ? 3000
        : 5000;

    const paidAmount =
      Number(transaction.amount);

    const expectedAmountPaystack =
      expectedAmount * 100;

    if (
      paidAmount !==
      expectedAmountPaystack
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le montant du paiement ne correspond pas à la formule choisie.",
        },
        { status: 400 }
      );
    }

    // ============================================
    // 9. SUPABASE ADMIN
    // ============================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !supabaseServiceKey
    ) {
      return NextResponse.json(
        {
          error:
            "Configuration Supabase serveur manquante.",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        supabaseServiceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    // ============================================
    // 10. VÉRIFIER QUE LE COMPTE EXISTE
    // ============================================

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, role, full_name, phone, business_name"
      )
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Erreur lecture profil :",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de vérifier le compte utilisateur.",
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Compte utilisateur introuvable.",
        },
        { status: 404 }
      );
    }

    // ============================================
    // 11. CALCULER LES DATES
    // ============================================

    const startsAt = new Date();

    const endsAt = new Date(
      startsAt
    );

    endsAt.setMonth(
      endsAt.getMonth() + 1
    );

    // ============================================
    // 12. CHERCHER L'ABONNEMENT EXISTANT
    // ============================================

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("seller_subscriptions")
      .select(
        "id, plan, status, ends_at"
      )
      .eq(
        "reference",
        reference
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Erreur recherche abonnement :",
        existingError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de vérifier l'abonnement existant.",
        },
        { status: 500 }
      );
    }

    // ============================================
    // 13. SI DÉJÀ TRAITÉ
    // ============================================

    if (existing) {
      // IMPORTANT :
      // Même si l'abonnement existe déjà,
      // on s'assure que le compte est vendeur.

      const {
        error: roleUpdateError,
      } = await supabaseAdmin
        .from("profiles")
        .update({
          role: "seller",
          business_name:
            customerName ||
            profile.business_name ||
            null,
          phone:
            customerPhone ||
            profile.phone ||
            null,
        })
        .eq("id", userId);

      if (roleUpdateError) {
        console.error(
          "Erreur activation vendeur :",
          roleUpdateError
        );

        return NextResponse.json(
          {
            error:
              "Paiement enregistré, mais impossible d'activer le compte vendeur.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Paiement déjà enregistré. Compte vendeur actif.",
        plan: existing.plan,
        amount: expectedAmount,
        reference,
        ends_at: existing.ends_at,
        role: "seller",
      });
    }

    // ============================================
    // 14. CRÉER L'ABONNEMENT
    // ============================================

    const {
      error: insertError,
    } = await supabaseAdmin
      .from("seller_subscriptions")
      .insert({
        seller_id: userId,
        plan,
        amount: expectedAmount,
        reference,
        status: "active",
        starts_at:
          startsAt.toISOString(),
        ends_at:
          endsAt.toISOString(),
      });

    // ============================================
    // 15. GÉRER UNE RÉFÉRENCE DÉJÀ EXISTANTE
    // ============================================

    if (insertError) {
      if (
        insertError.code ===
        "23505"
      ) {
        console.log(
          "La référence existe déjà."
        );

        // On active quand même le compte vendeur.
        const {
          error: roleUpdateError,
        } = await supabaseAdmin
          .from("profiles")
          .update({
            role: "seller",
            business_name:
              customerName ||
              profile.business_name ||
              null,
            phone:
              customerPhone ||
              profile.phone ||
              null,
          })
          .eq("id", userId);

        if (roleUpdateError) {
          console.error(
            "Erreur activation vendeur :",
            roleUpdateError
          );

          return NextResponse.json(
            {
              error:
                "Paiement validé, mais impossible d'activer le compte vendeur.",
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message:
            "Paiement déjà enregistré. Compte vendeur actif.",
          plan,
          amount: expectedAmount,
          reference,
          role: "seller",
        });
      }

      console.error(
        "Erreur création abonnement :",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "Le paiement est validé, mais l'abonnement n'a pas pu être enregistré.",
        },
        { status: 500 }
      );
    }

    // ============================================
    // 16. TRANSFORMER ACHETEUR → VENDEUR
    // ============================================

    const {
      error: roleUpdateError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        role: "seller",
        business_name:
          customerName ||
          profile.business_name ||
          null,
        phone:
          customerPhone ||
          profile.phone ||
          null,
      })
      .eq("id", userId);

    if (roleUpdateError) {
      console.error(
        "Erreur activation compte vendeur :",
        roleUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Paiement validé et abonnement créé, mais impossible d'activer le compte vendeur.",
        },
        { status: 500 }
      );
    }

    // ============================================
    // 17. SUCCÈS
    // ============================================

    console.log(
      "=========================================="
    );

    console.log(
      "       VENDEUR ACTIVÉ"
    );

    console.log(
      "=========================================="
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
      expectedAmount,
      "FCFA"
    );

    console.log(
      "Référence :",
      reference
    );

    console.log(
      "Expire le :",
      endsAt.toISOString()
    );

    console.log(
      "Rôle : seller"
    );

    console.log(
      "=========================================="
    );

    return NextResponse.json({
      success: true,

      message:
        "Paiement vérifié. Ton compte vendeur est maintenant actif.",

      plan,

      amount:
        expectedAmount,

      reference,

      ends_at:
        endsAt.toISOString(),

      role: "seller",
    });
  } catch (error) {
    console.error(
      "Erreur vérification abonnement :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur serveur lors de la vérification du paiement.",
      },
      { status: 500 }
    );
  }
}