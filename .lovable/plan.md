

## Melhorias no Sistema: Credenciais, Alunos, Dashboard e Painel do Vendedor

### Resumo das mudancas

Voce pediu 4 coisas principais. Aqui esta o plano para cada uma:

---

### 1. Ao criar vendedor, mostrar credenciais de acesso (nao link de matricula)

Atualmente, ao criar um vendedor, a tela mostra a senha gerada e o link de matricula. O correto e mostrar:
- Email e senha do vendedor
- Link de acesso a plataforma (ex: `https://seusite.com/login`)
- O link de matricula fica disponivel **dentro do painel do vendedor**, nao na tela de criacao do admin.

**Arquivo:** `src/pages/admin/AdminVendedores.tsx`
- Trocar o "Link de matricula" pelo "Link de acesso" apontando para `/login`
- Manter email + senha visivel para o admin copiar e enviar ao vendedor

---

### 2. Dashboard Admin: Botao "Filtrar" e lista visivel antes de exportar

Atualmente os filtros aplicam automaticamente. O usuario quer:
- Um botao "Filtrar" explicito
- A tabela so aparece apos clicar em Filtrar
- Exportar CSV continua funcionando sobre os dados filtrados

**Arquivo:** `src/pages/admin/AdminDashboard.tsx`
- Adicionar estado `showResults` (inicia `false`)
- Adicionar botao "Filtrar" ao lado dos filtros
- Tabela so renderiza quando `showResults === true`
- Ao clicar Filtrar, seta `showResults = true`

---

### 3. Nova aba "Alunos" no painel Admin

Uma pagina dedicada para ver todas as matriculas com dados completos dos alunos (nome, CPF, email, WhatsApp, curso, vendedor, status). Isso permite ao admin consultar os dados para efetuar matricula na plataforma do polo.

**Novos arquivos:**
- `src/pages/admin/AdminAlunos.tsx` -- Pagina com tabela completa de matriculas/alunos, com filtros e busca por nome/CPF

**Arquivos editados:**
- `src/components/AdminLayout.tsx` -- Adicionar link "Alunos" no menu lateral (icone GraduationCap)
- `src/App.tsx` -- Adicionar rota `/admin/alunos`

A pagina mostrara: Nome Completo, CPF, Email, WhatsApp, Curso, Vendedor, Tipo Pagamento, Parcelas, Vencimento, Valor, Status, Data -- todos os dados necessarios para realizar a matricula no polo.

---

### 4. Melhorar o painel do Vendedor para visualizacao pelo admin

O painel do vendedor ja existe em `/vendedor/dashboard`, mas precisa estar mais completo. Para o admin poder visualizar como ficou, basta fazer login com as credenciais do vendedor.

Melhorias no painel do vendedor:
- O link de matricula ja esta disponivel (secao "Gerar Link de Matricula")
- Adicionar botao "Filtrar" igual ao dashboard admin
- A tabela de matriculas mostra os cadastros realizados pelo vendedor

**Arquivo:** `src/pages/vendedor/VendedorDashboard.tsx`
- Adicionar botao "Filtrar" com mesmo comportamento do admin

---

### Detalhes Tecnicos

Arquivos criados:
- `src/pages/admin/AdminAlunos.tsx`

Arquivos editados:
- `src/pages/admin/AdminVendedores.tsx` -- credenciais de acesso em vez de link de matricula
- `src/pages/admin/AdminDashboard.tsx` -- botao Filtrar + tabela condicional
- `src/pages/vendedor/VendedorDashboard.tsx` -- botao Filtrar
- `src/components/AdminLayout.tsx` -- link Alunos no menu
- `src/App.tsx` -- rota /admin/alunos

Nenhuma alteracao no banco de dados e necessaria.

