import { COMPANY_INFO } from '@/lib/company-info';

/** Plain-text email to the site admin inbox. Never throws. */
export async function alertAdmin(subject: string, text: string) {
  try {
    const { Resend } = await import('resend');
    if (!process.env.RESEND_API_KEY) return;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@thepatternsplace.com';
    await resend.emails.send({ from: `${COMPANY_INFO.name} <${fromEmail}>`, to: COMPANY_INFO.email.general, subject, text });
  } catch (e) {
    console.error('Admin alert failed:', e);
  }
}
