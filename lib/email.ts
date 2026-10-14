import nodemailer from "nodemailer";

// All outgoing email goes through Gmail with an app password
// (EMAIL_USER / EMAIL_APP_PASSWORD in .env). Throws if email isn't set up
// or sending fails; callers decide whether that should stop what they're doing.
async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPassword) {
    throw new Error("Email configuration is missing.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  await transporter.sendMail({ from: `"StartupSpark" <${emailUser}>`, to, subject, text, html });
}

// Names and reasons are typed by users, so they're escaped before going
// into the HTML version of an email.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function appUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${path}`;
}

export async function sendPasswordResetEmail(recipientEmail: string, resetLink: string) {
  await sendEmail({
    to: recipientEmail,
    subject: "StartupSpark - Password Reset",
    text: `
You requested to reset your StartupSpark password.

Click the link below to create a new password:
${resetLink}

This link will expire in 1 hour.

If you did not request a password reset, you can ignore this email.
    `,
    html: `
      <h2>StartupSpark Password Reset</h2>

      <p>You requested to reset your StartupSpark password.</p>

      <p>
        <a href="${resetLink}">Reset Your Password</a>
      </p>

      <p>This link will expire in 1 hour.</p>

      <p>
        If you did not request a password reset, you can ignore this email.
      </p>
    `,
  });
}

export async function sendApplicationApprovedEmail(recipientEmail: string, name: string) {
  const loginLink = appUrl("/entrepreneur/login");

  await sendEmail({
    to: recipientEmail,
    subject: "StartupSpark - Your application has been approved",
    text: `
Hi ${name},

Good news: your StartupSpark entrepreneur application has been approved.

You can now sign in, add your products and start selling on campus:
${loginLink}

Each product is reviewed by the Startup Spark team before it goes live.
    `,
    html: `
      <h2>Your application has been approved 🎉</h2>

      <p>Hi ${escapeHtml(name)},</p>

      <p>Good news: your StartupSpark entrepreneur application has been approved.</p>

      <p>You can now sign in, add your products and start selling on campus.</p>

      <p><a href="${loginLink}">Sign in to StartupSpark</a></p>

      <p>Each product is reviewed by the Startup Spark team before it goes live.</p>
    `,
  });
}

export async function sendApplicationRejectedEmail(recipientEmail: string, name: string, reason: string | null) {
  await sendEmail({
    to: recipientEmail,
    subject: "StartupSpark - Update on your application",
    text: `
Hi ${name},

Thank you for applying to sell on StartupSpark. Unfortunately your application was not approved this time.
${reason ? `\nReason: ${reason}\n` : ""}
If you think this is a mistake, please contact the Startup Spark team.
    `,
    html: `
      <h2>Update on your application</h2>

      <p>Hi ${escapeHtml(name)},</p>

      <p>Thank you for applying to sell on StartupSpark. Unfortunately your application was not approved this time.</p>

      ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ""}

      <p>If you think this is a mistake, please contact the Startup Spark team.</p>
    `,
  });
}
