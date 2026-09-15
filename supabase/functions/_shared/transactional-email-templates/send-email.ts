import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { TEMPLATES } from './registry.ts'

// Server-only: reads Resend credentials. Import from edge functions only —
// never expose sending to the browser.

export type SendTemplateEmailResult = { sent: true; id?: string }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Dedupes retries of the same logical send; defaults to a random UUID (no dedupe). */
  idempotencyKey?: string
  replyTo?: string
}

/**
 * Renders a registered template and sends it through the project's Resend
 * account. Any provider failure throws so the caller can return a non-2xx
 * response and retain a useful diagnostic in the function logs.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not configured')
  }

  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }

  const templateData = options.templateData ?? {}
  const element = React.createElement(template.component, templateData)
  const html = await renderAsync(element)
  const text = await renderAsync(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': options.idempotencyKey || crypto.randomUUID(),
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject,
      html,
      text,
      reply_to: options.replyTo,
    }),
  })

  const responseBody = await response.text()
  if (!response.ok) {
    throw new Error(`Resend request failed [${response.status}]: ${responseBody}`)
  }

  let id: string | undefined
  try {
    const parsed = JSON.parse(responseBody)
    id = typeof parsed?.id === 'string' ? parsed.id : undefined
  } catch {
    id = undefined
  }

  return { sent: true, id }
}
