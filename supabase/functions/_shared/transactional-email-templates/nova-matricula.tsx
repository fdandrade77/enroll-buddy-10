import * as React from 'npm:react@18.3.1'
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface NovaMatriculaProps {
  nome?: string
  curso?: string
  cpf?: string
  email?: string
  whatsapp?: string
  vencimento?: string
  pagamento?: string
  valorTotal?: string
  vendedor?: string
}

const fields: Array<[keyof NovaMatriculaProps, string]> = [
  ['nome', 'Nome'],
  ['curso', 'Curso'],
  ['cpf', 'CPF'],
  ['email', 'E-mail'],
  ['whatsapp', 'WhatsApp'],
  ['vencimento', 'Data de vencimento'],
  ['pagamento', 'Pagamento'],
  ['valorTotal', 'Valor total'],
  ['vendedor', 'Vendedor'],
]

const NovaMatriculaEmail = (props: NovaMatriculaProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Nova matrícula de {props.nome || 'um aluno'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>FATEB</Text>
          <Heading style={heading}>Nova matrícula cadastrada</Heading>
        </Section>
        <Section style={details}>
          {fields.map(([key, label], index) => (
            <Row key={key} style={index % 2 === 0 ? row : alternateRow}>
              <Column style={labelCell}>{label}</Column>
              <Column style={valueCell}>{props[key] || '—'}</Column>
            </Row>
          ))}
        </Section>
        <Text style={footer}>Notificação automática do sistema de matrículas FATEB.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NovaMatriculaEmail,
  subject: (data) => `Nova Matrícula: ${data.nome || 'Novo aluno'}`,
  displayName: 'Nova matrícula',
  previewData: {
    nome: 'Maria da Silva',
    curso: 'Neuropsicanálise',
    cpf: '000.000.000-00',
    email: 'maria@example.com',
    whatsapp: '(12) 99999-9999',
    vencimento: '20/09/2026',
    pagamento: 'Parcelado (12x)',
    valorTotal: 'R$ 1.200,00',
    vendedor: 'Fernando (fernando)',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  color: '#182033',
  fontFamily: 'Arial, sans-serif',
  margin: '0',
  padding: '32px 12px',
}
const container = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '600px',
  overflow: 'hidden',
}
const header = { backgroundColor: '#0a0a0a', padding: '24px' }
const brand = { color: '#cda520', fontSize: '13px', fontWeight: '700', margin: '0 0 8px' }
const heading = { color: '#ffffff', fontSize: '24px', fontWeight: '700', margin: '0' }
const details = { padding: '16px 24px' }
const row = { backgroundColor: '#ffffff' }
const alternateRow = { backgroundColor: '#f7f8fa' }
const labelCell = { color: '#657080', fontSize: '14px', fontWeight: '700', padding: '10px 12px', width: '40%' }
const valueCell = { color: '#182033', fontSize: '14px', padding: '10px 12px' }
const footer = { color: '#657080', fontSize: '12px', margin: '0', padding: '8px 24px 24px' }