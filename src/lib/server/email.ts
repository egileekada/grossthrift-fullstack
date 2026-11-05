import { createAdminClient } from '@/lib/server/supabaseAdmin';

export interface TransactionalEmailInput {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export async function sendTransactionalEmail(input: TransactionalEmailInput): Promise<boolean> {
  const resendKey = process.env.RESEND_KEY || process.env.RESEND_API_KEY;
  if (!resendKey || !input.to || !input.to.includes('@')) {
    return false;
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'GrossThrift <onboarding@resend.dev>';
  const html = `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #141c17; background: #ffffff; border: 1px solid #e4e9e5; border-radius: 16px;">
      <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #115c3e; margin-bottom: 12px;">
        GrossThrift Escrow Protection
      </div>
      <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #141c17;">
        ${input.heading}
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 24px;">
        ${input.body}
      </p>
      ${
        input.ctaLabel && input.ctaUrl
          ? `<a href="${input.ctaUrl}" style="display: inline-block; background: #115c3e; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 20px; border-radius: 10px;">${input.ctaLabel}</a>`
          : ''
      }
      <hr style="border: 0; border-top: 1px solid #e4e9e5; margin: 28px 0 16px;" />
      <p style="font-size: 11px; color: #9ca3af; margin: 0;">
        GrossThrift never asks for or stores shared account passwords. Always use the service provider’s official invitation flow.
      </p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [input.to],
        subject: input.subject,
        html,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Resend email delivery warning:', err);
    return false;
  }
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

