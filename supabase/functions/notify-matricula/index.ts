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
    const adminEmail = Deno.env.get("ADMIN_EMAIL");

    if (!resendApiKey || !resendFrom || !adminEmail) {
      console.error("Missing RESEND_API_KEY, RESEND_FROM_EMAIL, or ADMIN_EMAIL");
      return new Response(JSON.stringify({ ok: false, error: "missing env vars" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    // Fetch vendedor codigo_ref
    let vendedorCodigo = "—";
    if (record.vendedor_id) {
      const { data: vendedor } = await supabase
        .from("vendedores")
        .select("codigo_ref")
        .eq("id", record.vendedor_id)
        .single();
      if (vendedor) vendedorCodigo = vendedor.codigo_ref;
    }

    const tipoPagamento =
      record.tipo_pagamento === "a_vista"
        ? "À Vista"
        : `Parcelado (${record.quantidade_parcelas}x)`;

    const valorFormatado = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(record.valor_total);

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px;">
          📋 Nova Matrícula Cadastrada
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555; width: 40%;">Aluno</td>
            <td style="padding: 8px 12px;">${record.nome_completo}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Curso</td>
            <td style="padding: 8px 12px;">${cursoNome}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">WhatsApp</td>
            <td style="padding: 8px 12px;">${record.whatsapp}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Pagamento</td>
            <td style="padding: 8px 12px;">${tipoPagamento}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Valor Total</td>
            <td style="padding: 8px 12px; font-weight: bold; color: #e94560;">${valorFormatado}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Vendedor</td>
            <td style="padding: 8px 12px;">${vendedorCodigo}</td>
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
        to: [adminEmail],
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
