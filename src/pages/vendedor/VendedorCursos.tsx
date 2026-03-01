import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Curso {
  id: string;
  nome: string;
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
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: cData } = await supabase.from("cursos").select("*").eq("ativo", true).order("nome");
      setCursos(cData ?? []);

      const { data: mData } = await supabase.from("curso_materiais").select("*");
      setMateriais(mData ?? []);
    };
    fetch();
  }, []);

  const getMateriais = (cursoId: string) => materiais.filter((m) => m.curso_id === cursoId);

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
