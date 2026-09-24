import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(
  recipientEmail: string,
  resetLink: string
) {
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

  await transporter.sendMail({
    from: `"StartupSpark" <${emailUser}>`,
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