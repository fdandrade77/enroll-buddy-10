import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Download, FileText, Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Curso {
  id: string;
  nome: string;
  slug: string;
  valor_total: number;
  max_parcelas: number;
  ativo: boolean;
}

interface Material {
  id: string;
  curso_id: string;
  nome_arquivo: string;
  url: string;
  tipo: string;
}

export default function VendedorCursos() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [codigoRef, setCodigoRef] = useState<string>("");

  useEffect(() => {
    const fetch = async () => {
      const { data: cData } = await supabase.from("cursos").select("*").eq("ativo", true).order("nome");
      setCursos(cData ?? []);

      const { data: mData } = await supabase.from("curso_materiais").select("*");
      setMateriais(mData ?? []);

      if (user) {
        const { data: vData } = await supabase
          .from("vendedores")
          .select("codigo_ref")
          .eq("user_id", user.id)
          .maybeSingle();
        if (vData) setCodigoRef(vData.codigo_ref);
      }
    };
    fetch();
  }, [user]);

  const getMateriais = (cursoId: string) => materiais.filter((m) => m.curso_id === cursoId);

  const buildLink = (slug: string) =>
    `${window.location.origin}/r/${codigoRef}/${slug}`;

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(buildLink(slug));
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Cursos Disponíveis</h1>

      {cursos.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
          Nenhum curso disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cursos.map((curso) => {
            const cursoMateriais = getMateriais(curso.id);
            return (
              <div key={curso.id} className="bg-card border border-border rounded-xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-foreground">{curso.nome}</h2>
                    <p className="text-sm text-muted-foreground">
                      R$ {Number(curso.valor_total).toFixed(2)} • Até {curso.max_parcelas}x
                    </p>
                  </div>
                </div>

                {codigoRef && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Link de matrícula
                    </p>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground truncate flex-1 font-mono">
                        {buildLink(curso.slug)}
                      </span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyLink(curso.slug)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {cursoMateriais.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Materiais</p>
                    {cursoMateriais.map((mat) => (
                      <div key={mat.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground truncate">{mat.nome_arquivo}</span>
                        </div>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={mat.url} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhum material disponível.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
