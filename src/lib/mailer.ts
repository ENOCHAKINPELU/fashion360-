/**
 * Minimal transactional-email boundary. Logs to the console until RESEND_API_KEY
 * (or another provider key) is configured — swap the implementation here without
 * touching call sites.
 */
export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ to, subject, body }: SendEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    console.info(`[email:dev] to=${to} subject="${subject}"\n${body}`);
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Fashion360 <no-reply@fashion360.app>",
      to,
      subject,
      text: body,
    }),
  });
}
