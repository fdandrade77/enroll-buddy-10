import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StatCard";
import { FileText, CheckCircle, XCircle, DollarSign, Copy, Link, ChevronDown, ChevronUp, TrendingUp, MinusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function VendedorDashboard() {
  const { user } = useAuth();
  const [vendedor, setVendedor] = useState<any>(null);
  const [matriculas, setMatriculas] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [comissoesParcelas, setComissoesParcelas] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [filtroCurso, setFiltroCurso] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [linkCurso, setLinkCurso] = useState("all");
  const [showResults, setShowResults] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const { data: vData } = await supabase
        .from("vendedores")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setVendedor(vData);

      if (vData) {
        const [mRes, cpRes, dRes] = await Promise.all([
          supabase
            .from("matriculas")
            .select("*, cursos(nome, comissao_primeira_parcela, valor_total, max_parcelas)")
            .eq("vendedor_id", vData.id)
            .order("criado_em", { ascending: false }),
          supabase
            .from("comissoes_parcelas")
            .select("*")
            .eq("vendedor_id", vData.id),
          supabase
            .from("despesas_matricula")
            .select("*"),
        ]);
        setMatriculas(mRes.data ?? []);
        setComissoesParcelas(cpRes.data ?? []);
        // Filter despesas to only this vendor's matriculas
        const matriculaIds = new Set((mRes.data ?? []).map((m: any) => m.id));
        setDespesas((dRes.data ?? []).filter((d: any) => matriculaIds.has(d.matricula_id)));

        // Load indicadores referenced by these matriculas (for showing affiliate name)
        const indicadorIds = Array.from(
          new Set((mRes.data ?? []).map((m: any) => m.indicador_id).filter(Boolean))
        );
        if (indicadorIds.length > 0) {
          const { data: iData } = await supabase
            .from("indicadores")
            .select("id, nome, slug")
            .in("id", indicadorIds);
          setIndicadores(iData ?? []);
        } else {
          setIndicadores([]);
        }
      }

      const { data: cData } = await supabase.from("cursos").select("*").eq("ativo", true);
      setCursos(cData ?? []);
    };
    fetchAll();
  }, [user]);

  const filtered = matriculas.filter((m) => {
    if (filtroCurso !== "all" && m.curso_id !== filtroCurso) return false;
    if (filtroStatus !== "all" && m.status !== filtroStatus) return false;
    if (dataInicio && m.criado_em < dataInicio) return false;
    if (dataFim && m.criado_em > dataFim + "T23:59:59") return false;
    return true;
  });

  const modelo = (vendedor as any)?.modelo_comissao ?? 'fixo';
  const percentual = (vendedor as any)?.comissao_percentual ?? 15;

  const calcComissao = (m: any): number => {
    if (modelo === 'fixo') {
      return m.cursos?.comissao_primeira_parcela ?? 0;
    }
    const parcelas = comissoesParcelas.filter((p) => p.matricula_id === m.id);
    if (parcelas.length > 0) {
      return parcelas.reduce((s: number, p: any) => s + Number(p.valor_comissao), 0);
    }
    const qtd = m.quantidade_parcelas ?? m.cursos?.max_parcelas ?? 1;
    const valorParcela = Number(m.valor_total) / qtd;
    return (valorParcela * percentual / 100) * qtd;
  };

  // Mensal: next pending parcela per matricula (only from paid enrollments)
  const calcMensal = (): number => {
    if (modelo === 'fixo') return 0;
    const matriculasPagas = new Set(matriculas.filter(m => m.status === 'pago').map(m => m.id));
    let mensal = 0;
    const seen = new Set<string>();
    const sorted = [...comissoesParcelas]
      .filter(p => p.status === 'pendente' && matriculasPagas.has(p.matricula_id))
      .sort((a, b) => a.numero_parcela - b.numero_parcela);
    for (const p of sorted) {
      if (!seen.has(p.matricula_id)) {
        seen.add(p.matricula_id);
        mensal += Number(p.valor_comissao);
      }
    }
    return mensal;
  };

  const totalPago = filtered.filter((m) => m.status === "pago").length;
  const totalNaoPago = filtered.filter((m) => m.status === "nao_pago").length;
  const comissaoTotal = filtered.reduce((sum, m) => sum + calcComissao(m), 0);
  const comissaoMensal = calcMensal();

  const comissaoRecebida = filtered.reduce((sum, m) => {
    if (modelo === 'parcelado') {
      const parcelas = comissoesParcelas.filter((p) => p.matricula_id === m.id && p.status === 'pago');
      return sum + parcelas.reduce((s: number, p: any) => s + Number(p.valor_comissao), 0);
    }
    return sum + (m.status === 'pago' ? calcComissao(m) : 0);
  }, 0);
  const comissaoAReceber = comissaoTotal - comissaoRecebida;

  // Despesas totais do vendedor (tráfego padrão + FATEB padrão + despesas específicas)
  const despesaTrafego = vendedor?.despesa_trafego_padrao ?? 0;
  const despesaFateb = vendedor?.despesa_fateb_padrao ?? 0;
  const despesasEspecificas = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const totalDespesas = despesaTrafego + despesaFateb + despesasEspecificas;

  const link = vendedor ? `${window.location.origin}/r/${vendedor.codigo_ref}` : "";

  const exportCSV = () => {
    const headers = ["Nome", "CPF", "Email", "WhatsApp", "Curso", "Valor", "Tipo Pgto", "Parcelas", "Vencimento", "Indicador", "Comissão", "Status", "Data"];
    const rows = filtered.map((m) => [
      m.nome_completo, m.cpf, m.email, m.whatsapp,
      m.cursos?.nome ?? "", m.valor_total, m.tipo_pagamento, m.quantidade_parcelas ?? "",
      m.data_vencimento, getIndicador(m.indicador_id)?.nome ?? "",
      calcComissao(m).toFixed(2), m.status,
      new Date(m.criado_em).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "minhas-matriculas.csv";
    a.click();
  };

  const getRowParcelas = (matriculaId: string) => {
    return comissoesParcelas
      .filter((p) => p.matricula_id === matriculaId)
      .sort((a, b) => a.numero_parcela - b.numero_parcela);
  };

  const getRowDespesas = (matriculaId: string) =>
    despesas.filter((d) => d.matricula_id === matriculaId);

  const getIndicador = (indicadorId?: string | null) =>
    indicadorId ? indicadores.find((i) => i.id === indicadorId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Meu Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Matrículas" value={filtered.length} icon={FileText} />
        <StatCard title="Pagas" value={totalPago} icon={CheckCircle} variant="success" />
        <StatCard title="Não Pagas" value={totalNaoPago} icon={XCircle} variant="destructive" />
        <StatCard title="Comissão Total" value={`R$ ${comissaoTotal.toFixed(2)}`} icon={DollarSign} variant="warning" />
      </div>

      {/* Sub-cards: Já recebido / A receber / Mensal / Despesas */}
      <div className={`grid grid-cols-1 ${modelo === 'parcelado' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Já Recebido</p>
            <p className="text-xl font-bold text-success">R$ {comissaoRecebida.toFixed(2)}</p>
          </div>
          <CheckCircle className="h-8 w-8 text-success/40" />
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">A Receber</p>
            <p className="text-xl font-bold text-amber-600">R$ {comissaoAReceber.toFixed(2)}</p>
          </div>
          <DollarSign className="h-8 w-8 text-amber-500/40" />
        </div>
        {modelo === 'parcelado' && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Valor Mensal (próximas parcelas)</p>
              <p className="text-xl font-bold text-blue-600">R$ {comissaoMensal.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500/40" />
          </div>
        )}
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Despesas (Descontos)</p>
            <p className="text-xl font-bold text-destructive">R$ {totalDespesas.toFixed(2)}</p>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {despesaTrafego > 0 && <p>Tráfego: R$ {despesaTrafego.toFixed(2)}</p>}
              {despesaFateb > 0 && <p>FATEB: R$ {despesaFateb.toFixed(2)}</p>}
              {despesasEspecificas > 0 && <p>Específicas: R$ {despesasEspecificas.toFixed(2)}</p>}
            </div>
          </div>
          <MinusCircle className="h-8 w-8 text-destructive/40" />
        </div>
      </div>

      {/* Gerar Link */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Link className="h-5 w-5" /> Gerar Link de Matrícula
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Selecione o curso para gerar seu link personalizado de venda.
        </p>
        {(() => {
          const selected: any = linkCurso !== "all" ? cursos.find((x: any) => x.id === linkCurso) : null;
          const hasSlug = !!selected?.slug;
          const finalUrl = hasSlug ? `${link}/${selected.slug}` : "";
          return (
            <>
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Curso</label>
                  <Select value={linkCurso} onValueChange={setLinkCurso}>
                    <SelectTrigger><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
                    <SelectContent>
                      {cursos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Input
                    readOnly
                    value={finalUrl}
                    placeholder="O link aparecerá aqui após selecionar o curso"
                    className="bg-muted"
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={!hasSlug}
                  onClick={() => {
                    if (!hasSlug) return;
                    navigator.clipboard.writeText(finalUrl);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copiar
                </Button>
              </div>
              {linkCurso !== "all" && !hasSlug && (
                <p className="text-xs text-destructive mt-2">
                  Este curso não tem apelido para link configurado. Peça ao administrador para definir um.
                </p>
              )}
            </>
          );
        })()}
      </div>

      {/* Lista rápida: todos os links por curso */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Link className="h-5 w-5" /> Meus Links por Curso
        </h2>
        {cursos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum curso ativo no momento.</p>
        ) : (
          <div className="space-y-2">
            {cursos.map((c: any) => {
              const url = c.slug ? `${link}/${c.slug}` : "";
              return (
                <div key={c.id} className="flex items-center gap-3 bg-muted/40 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">
                      {url || "Sem apelido configurado"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!url}
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      toast.success(`Link de "${c.nome}" copiado!`);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copiar
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Curso</label>
            <Select value={filtroCurso} onValueChange={setFiltroCurso}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {cursos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="nao_pago">Não pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Data início</label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Data fim</label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={() => setShowResults(true)}>Filtrar</Button>
        <Button variant="outline" onClick={exportCSV} disabled={!showResults}>Exportar CSV</Button>
      </div>

      {showResults && (
      <>
      {/* Matriculas Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 text-muted-foreground font-medium">Nome</th>
                <th className="text-left p-3 text-muted-foreground font-medium">CPF</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Email</th>
                <th className="text-left p-3 text-muted-foreground font-medium">WhatsApp</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Curso</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Valor total</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Tipo Pgto</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Parcelas</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Vencimento</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Indicador</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Comissão</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const rowParcelas = getRowParcelas(m.id);
                const pagas = rowParcelas.filter(p => p.status === 'pago').length;
                const isExpanded = expandedRow === m.id;
                const rowDespesas = getRowDespesas(m.id);
                const ind = getIndicador(m.indicador_id);
                const totalDespesasMat = rowDespesas.reduce((s, d) => s + Number(d.valor), 0);
                const comissaoMat = calcComissao(m);
                const liquido = Number(m.valor_total) - totalDespesasMat - comissaoMat;
                return (
                  <>
                    <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-foreground whitespace-nowrap">{m.nome_completo}</td>
                      <td className="p-3 text-foreground whitespace-nowrap">{m.cpf}</td>
                      <td className="p-3 text-foreground whitespace-nowrap">{m.email}</td>
                      <td className="p-3 text-foreground whitespace-nowrap">{m.whatsapp}</td>
                      <td className="p-3 text-foreground">{m.cursos?.nome}</td>
                      <td className="p-3 text-foreground whitespace-nowrap">R$ {Number(m.valor_total).toFixed(2)}</td>
                      <td className="p-3 text-foreground whitespace-nowrap">{m.tipo_pagamento === "a_vista" ? "À vista" : "Parcelado"}</td>
                      <td className="p-3 text-foreground">{m.quantidade_parcelas ?? "-"}</td>
                      <td className="p-3 text-foreground whitespace-nowrap">{m.data_vencimento}</td>
                      <td className="p-3 text-foreground whitespace-nowrap">{ind?.nome ?? "-"}</td>
                      <td className="p-3 text-foreground">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">R$ {comissaoMat.toFixed(2)}</span>
                          {rowParcelas.length > 0 && (
                            <button
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                              onClick={() => setExpandedRow(isExpanded ? null : m.id)}
                            >
                              ({pagas}/{rowParcelas.length})
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          )}
                          {rowParcelas.length === 0 && (
                            <button
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                              onClick={() => setExpandedRow(isExpanded ? null : m.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.status === "pago" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}>
                          {m.status === "pago" ? "Pago" : "Não pago"}
                        </span>
                      </td>
                      <td className="p-3 text-foreground whitespace-nowrap">{new Date(m.criado_em).toLocaleDateString("pt-BR")}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${m.id}-expanded`} className="bg-muted/20">
                        <td colSpan={13} className="p-4 space-y-4">
                          {rowParcelas.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Parcelas de comissão</div>
                              <div className="flex flex-wrap gap-2">
                                {rowParcelas.map((p) => (
                                  <div
                                    key={p.id}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                                      p.status === 'pago'
                                        ? 'bg-success/20 text-success'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    P{p.numero_parcela}: R$ {Number(p.valor_comissao).toFixed(2)}
                                    {p.status === 'pago' && p.data_pagamento && (
                                      <span className="ml-1 opacity-70">
                                        ({new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')})
                                      </span>
                                    )}
                                    {p.status !== 'pago' && p.data_prevista && (
                                      <span className="ml-1 opacity-70">
                                        (prev. {new Date(p.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR')})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Detalhes da matrícula</div>
                              <ul className="text-xs text-foreground space-y-1">
                                <li><span className="text-muted-foreground">ID:</span> {m.id.slice(-8)}</li>
                                <li><span className="text-muted-foreground">Email:</span> {m.email}</li>
                                <li><span className="text-muted-foreground">WhatsApp:</span> {m.whatsapp}</li>
                                <li><span className="text-muted-foreground">Indicador:</span> {ind?.nome ?? "—"}</li>
                                <li><span className="text-muted-foreground">Valor total:</span> R$ {Number(m.valor_total).toFixed(2)}</li>
                              </ul>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Despesas da matrícula</div>
                              {rowDespesas.length === 0 ? (
                                <div className="text-xs text-muted-foreground">Nenhuma despesa registrada.</div>
                              ) : (
                                <ul className="text-xs text-foreground space-y-1">
                                  {rowDespesas.map((d) => (
                                    <li key={d.id} className="flex justify-between gap-3">
                                      <span>{d.tipo}{d.descricao ? ` — ${d.descricao}` : ""}</span>
                                      <span className="font-medium">R$ {Number(d.valor).toFixed(2)}</span>
                                    </li>
                                  ))}
                                  <li className="flex justify-between gap-3 pt-1 border-t border-border">
                                    <span className="text-muted-foreground">Total despesas</span>
                                    <span className="font-semibold">R$ {totalDespesasMat.toFixed(2)}</span>
                                  </li>
                                </ul>
                              )}
                              <div className="mt-3 text-xs grid grid-cols-3 gap-2">
                                <div className="bg-muted/40 rounded px-2 py-1">
                                  <div className="text-muted-foreground">Valor</div>
                                  <div className="font-medium">R$ {Number(m.valor_total).toFixed(2)}</div>
                                </div>
                                <div className="bg-muted/40 rounded px-2 py-1">
                                  <div className="text-muted-foreground">Comissão</div>
                                  <div className="font-medium">R$ {comissaoMat.toFixed(2)}</div>
                                </div>
                                <div className="bg-muted/40 rounded px-2 py-1">
                                  <div className="text-muted-foreground">Líquido</div>
                                  <div className="font-medium">R$ {liquido.toFixed(2)}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="p-8 text-center text-muted-foreground">Nenhuma matrícula encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
