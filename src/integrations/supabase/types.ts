export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      comissoes_parcelas: {
        Row: {
          criado_em: string
          data_pagamento: string | null
          data_prevista: string | null
          id: string
          matricula_id: string
          numero_parcela: number
          percentual: number
          status: string
          valor_comissao: number
          valor_parcela_curso: number
          vendedor_id: string
        }
        Insert: {
          criado_em?: string
          data_pagamento?: string | null
          data_prevista?: string | null
          id?: string
          matricula_id: string
          numero_parcela: number
          percentual: number
          status?: string
          valor_comissao: number
          valor_parcela_curso: number
          vendedor_id: string
        }
        Update: {
          criado_em?: string
          data_pagamento?: string | null
          data_prevista?: string | null
          id?: string
          matricula_id?: string
          numero_parcela?: number
          percentual?: number
          status?: string
          valor_comissao?: number
          valor_parcela_curso?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_parcelas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_parcelas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      curso_materiais: {
        Row: {
          criado_em: string
          curso_id: string
          id: string
          nome_arquivo: string
          tipo: string
          url: string
        }
        Insert: {
          criado_em?: string
          curso_id: string
          id?: string
          nome_arquivo: string
          tipo?: string
          url: string
        }
        Update: {
          criado_em?: string
          curso_id?: string
          id?: string
          nome_arquivo?: string
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "curso_materiais_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          ativo: boolean
          comissao_primeira_parcela: number
          criado_em: string
          id: string
          max_parcelas: number
          nome: string
          valor_total: number
        }
        Insert: {
          ativo?: boolean
          comissao_primeira_parcela: number
          criado_em?: string
          id?: string
          max_parcelas: number
          nome: string
          valor_total: number
        }
        Update: {
          ativo?: boolean
          comissao_primeira_parcela?: number
          criado_em?: string
          id?: string
          max_parcelas?: number
          nome?: string
          valor_total?: number
        }
        Relationships: []
      }
      despesas_matricula: {
        Row: {
          criado_em: string
          descricao: string | null
          id: string
          matricula_id: string
          tipo: string
          valor: number
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          id?: string
          matricula_id: string
          tipo: string
          valor: number
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          id?: string
          matricula_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_matricula_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          cpf: string
          criado_em: string
          curso_id: string
          data_vencimento: string
          email: string
          id: string
          nome_completo: string
          quantidade_parcelas: number | null
          status: Database["public"]["Enums"]["status_matricula"]
          tipo_pagamento: Database["public"]["Enums"]["tipo_pagamento"]
          valor_total: number
          vendedor_id: string | null
          whatsapp: string
        }
        Insert: {
          cpf: string
          criado_em?: string
          curso_id: string
          data_vencimento: string
          email: string
          id?: string
          nome_completo: string
          quantidade_parcelas?: number | null
          status?: Database["public"]["Enums"]["status_matricula"]
          tipo_pagamento: Database["public"]["Enums"]["tipo_pagamento"]
          valor_total: number
          vendedor_id?: string | null
          whatsapp: string
        }
        Update: {
          cpf?: string
          criado_em?: string
          curso_id?: string
          data_vencimento?: string
          email?: string
          id?: string
          nome_completo?: string
          quantidade_parcelas?: number | null
          status?: Database["public"]["Enums"]["status_matricula"]
          tipo_pagamento?: Database["public"]["Enums"]["tipo_pagamento"]
          valor_total?: number
          vendedor_id?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          criado_em: string
          email: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          email: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendedores: {
        Row: {
          chave_pix: string
          cnpj: string | null
          codigo_ref: string
          comissao_percentual: number
          cpf: string
          criado_em: string
          id: string
          modelo_comissao: Database["public"]["Enums"]["modelo_comissao"]
          senha_gerada: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          chave_pix: string
          cnpj?: string | null
          codigo_ref: string
          comissao_percentual?: number
          cpf: string
          criado_em?: string
          id?: string
          modelo_comissao?: Database["public"]["Enums"]["modelo_comissao"]
          senha_gerada?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          chave_pix?: string
          cnpj?: string | null
          codigo_ref?: string
          comissao_percentual?: number
          cpf?: string
          criado_em?: string
          id?: string
          modelo_comissao?: Database["public"]["Enums"]["modelo_comissao"]
          senha_gerada?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendedores_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vendedor"
      modelo_comissao: "fixo" | "parcelado"
      status_matricula: "nao_pago" | "pago"
      tipo_pagamento: "a_vista" | "parcelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vendedor"],
      modelo_comissao: ["fixo", "parcelado"],
      status_matricula: ["nao_pago", "pago"],
      tipo_pagamento: ["a_vista", "parcelado"],
    },
  },
} as const
