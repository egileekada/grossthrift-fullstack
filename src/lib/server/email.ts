import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { getSiteUrl } from '@/lib/server/siteUrl';

export interface TransactionalEmailInput {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface TransactionalEmailResult {
  ok: boolean;
  error?: string;
}

function normalizeCtaUrl(rawUrl?: string): string | undefined {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/')) {
    return new URL(trimmed, getSiteUrl()).toString();
  }
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendTransactionalEmailWithResult(
  input: TransactionalEmailInput
): Promise<TransactionalEmailResult> {
  const resendKey = process.env.RESEND_KEY || process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { ok: false, error: 'RESEND_KEY is not configured.' };
  }
  if (!input.to || !input.to.includes('@')) {
    return { ok: false, error: 'Invalid recipient email address.' };
  }

  const safeCtaUrl = normalizeCtaUrl(input.ctaUrl);
  const safeHeading = escapeHtml(input.heading);
  const safeBody = escapeHtml(input.body);
  const safeCtaLabel = input.ctaLabel ? escapeHtml(input.ctaLabel) : undefined;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'GrossThrift <onboarding@resend.dev>';
  const replyToAddress = process.env.SUPPORT_EMAIL || 'miracle4424@gmail.com';
  const html = `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #141c17; background: #ffffff; border: 1px solid #e4e9e5; border-radius: 16px;">
      <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #115c3e; margin-bottom: 12px;">
        GrossThrift Escrow Protection
      </div>
      <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #141c17;">
        ${safeHeading}
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 24px;">
        ${safeBody}
      </p>
      ${safeCtaLabel && safeCtaUrl
      ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 18px;">
          <tr>
            <td align="center" bgcolor="#115c3e" style="border-radius: 10px;">
              <a href="${escapeHtml(safeCtaUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #115c3e; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 20px; border-radius: 10px;">${safeCtaLabel}</a>
            </td>
          </tr>
        </table>
        <p style="font-size: 12px; line-height: 1.5; color: #6b7280; margin: 0 0 8px; word-break: break-all;">
          If the button does not work, open this link: <a href="${escapeHtml(safeCtaUrl)}" target="_blank" rel="noopener noreferrer" style="color: #115c3e; text-decoration: underline;">${escapeHtml(safeCtaUrl)}</a>
        </p>`
      : ''
    }
      <hr style="border: 0; border-top: 1px solid #e4e9e5; margin: 28px 0 16px;" />
      <p style="font-size: 11px; color: #9ca3af; margin: 0;">
        GrossThrift never asks for or stores shared account passwords. Always use the service provider’s official invitation flow.
      </p>
    </div>
  `;

  const text = [
    input.heading,
    '',
    input.body,
    safeCtaUrl ? `\n${input.ctaLabel || 'Open link'}: ${safeCtaUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        reply_to: replyToAddress,
        to: [input.to],
        subject: input.subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      let message = `Resend API error (${res.status})`;
      try {
        const errJson = (await res.json()) as { message?: string };
        if (errJson?.message) message = errJson.message;
      } catch {
        // ignore JSON parse failure
      }
      console.warn('Resend email delivery failed:', message);
      return { ok: false, error: message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error sending email';
    console.warn('Resend email delivery warning:', message);
    return { ok: false, error: message };
  }
}

export async function sendTransactionalEmail(input: TransactionalEmailInput): Promise<boolean> {
  const result = await sendTransactionalEmailWithResult(input);
  return result.ok;
}

export async function createInAppNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}): Promise<void> {
  if (!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) return;
  try {
    const admin = createAdminClient();
    await admin.from('notifications').insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link || '/dashboard',
    });
  } catch {
    // Notifications table is optional if migration 202611050001 has not been run yet
  }
}

