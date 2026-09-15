import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import { z } from 'npm:zod@3.24.2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MatriculaSchema = z.object({
  id: z.string().uuid(),
  nome_completo: z.string().min(1).max(255),
  curso_id: z.string().uuid().nullable().optional(),
  vendedor_id: z.string().uuid().nullable().optional(),
  cpf: z.string().max(30).nullable().optional(),
  email: z.string().email().max(320).nullable().optional(),
  whatsapp: z.string().max(30).nullable().optional(),
  data_vencimento: z.string().max(30).nullable().optional(),
  tipo_pagamento: z.string().max(40).nullable().optional(),
  quantidade_parcelas: z.number().int().positive().nullable().optional(),
  valor_total: z.number().finite().nonnegative(),
})

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const parsed = MatriculaSchema.safeParse(payload?.record ?? payload)
    if (!parsed.success) {
      console.error('Invalid matricula payload', parsed.error.flatten().fieldErrors)
      return new Response(JSON.stringify({ ok: false, error: 'invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const record = parsed.data

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminEmailFallback = Deno.env.get("ADMIN_EMAIL");

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

    const templateData = {
      nome: record.nome_completo,
      curso: cursoNome,
      cpf: record.cpf ?? '—',
      email: record.email ?? '—',
      whatsapp: record.whatsapp ?? '—',
      vencimento: vencimentoFormatado,
      pagamento: tipoPagamento,
      valorTotal: valorFormatado,
      vendedor: vendedorLabel,
    }

    const results = []
    for (let index = 0; index < recipients.length; index += 1) {
      const result = await sendTemplateEmail('nova-matricula', recipients[index], {
        templateData,
        idempotencyKey: `nova-matricula-${record.id}-${index}`,
      })
      results.push(result)
    }

    console.log('Matricula notification processed', {
      matricula_id: record.id,
      sent: results.length,
    })

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-matricula:", error);
    return new Response(JSON.stringify({ ok: false, error: "send failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
