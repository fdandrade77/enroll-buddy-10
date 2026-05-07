import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload?.record ?? payload;

    if (!record?.nome_completo) {
      console.log("No valid matricula record in payload");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM_EMAIL");
    const adminEmailFallback = Deno.env.get("ADMIN_EMAIL");

    if (!resendApiKey || !resendFrom) {
      console.error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
      return new Response(JSON.stringify({ ok: false, error: "missing env vars" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read recipient(s) from configuracoes table; fallback to ADMIN_EMAIL secret
    let recipientsRaw = "";
    const { data: cfg } = await supabase
      .from("configuracoes")
      .select("valor")
      .eq("chave", "notification_email")
      .maybeSingle();
    if (cfg?.valor) recipientsRaw = cfg.valor;
    if (!recipientsRaw && adminEmailFallback) recipientsRaw = adminEmailFallback;

    const recipients = recipientsRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (recipients.length === 0) {
      console.error("No notification recipient configured");
      return new Response(JSON.stringify({ ok: false, error: "no recipient" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch curso name
    let cursoNome = "—";
    if (record.curso_id) {
      const { data: curso } = await supabase
        .from("cursos")
        .select("nome")
        .eq("id", record.curso_id)
        .single();
      if (curso) cursoNome = curso.nome;
    }

    // Fetch vendedor (codigo_ref + nome via profile)
    let vendedorLabel = "—";
    if (record.vendedor_id) {
      const { data: vendedor } = await supabase
        .from("vendedores")
        .select("codigo_ref, user_id")
        .eq("id", record.vendedor_id)
        .single();
      if (vendedor) {
        let vendedorNome = "";
        const { data: prof } = await supabase
          .from("profiles")
          .select("nome")
          .eq("user_id", vendedor.user_id)
          .maybeSingle();
        if (prof?.nome) vendedorNome = prof.nome;
        vendedorLabel = vendedorNome
          ? `${vendedorNome} (${vendedor.codigo_ref})`
          : vendedor.codigo_ref;
      }
    }

    const tipoPagamento =
      record.tipo_pagamento === "a_vista"
        ? "À Vista"
        : `Parcelado (${record.quantidade_parcelas}x)`;

    const valorFormatado = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(record.valor_total);

    const vencimentoFormatado = record.data_vencimento
      ? new Date(record.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")
      : "—";

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px;">
          📋 Nova Matrícula Cadastrada
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555; width: 40%;">Nome</td>
            <td style="padding: 8px 12px;">${record.nome_completo}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Curso</td>
            <td style="padding: 8px 12px;">${cursoNome}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">CPF</td>
            <td style="padding: 8px 12px;">${record.cpf ?? "—"}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">E-mail</td>
            <td style="padding: 8px 12px;">${record.email ?? "—"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">WhatsApp</td>
            <td style="padding: 8px 12px;">${record.whatsapp}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Data de Vencimento</td>
            <td style="padding: 8px 12px;">${vencimentoFormatado}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Pagamento</td>
            <td style="padding: 8px 12px;">${tipoPagamento}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Valor Total</td>
            <td style="padding: 8px 12px; font-weight: bold; color: #e94560;">${valorFormatado}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Vendedor</td>
            <td style="padding: 8px 12px;">${vendedorLabel}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Notificação automática do sistema de matrículas.
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: recipients,
        subject: `Nova Matrícula: ${record.nome_completo}`,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();
    console.log("Resend response:", JSON.stringify(resendData));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-matricula:", error);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
