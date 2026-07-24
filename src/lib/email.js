import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(email, otp) {
  // If SMTP is not configured, log OTP to console (dev mode)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
    return { success: true, dev: true };
  }

  const mailOptions = {
    from: `"EMS - Employee Management" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your Verification Code — EMS',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #6366f1; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">E</div>
        </div>
        <h2 style="text-align: center; color: #1a1a1a; font-size: 22px; margin-bottom: 8px;">Verify Your Email</h2>
        <p style="text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 32px;">
          Enter this code to complete your registration
        </p>
        <div style="background: #f8f9fa; border: 2px dashed #d1d5db; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #6366f1;">${otp}</span>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-bottom: 8px;">
          This code expires in <strong>10 minutes</strong>
        </p>
        <p style="text-align: center; color: #9ca3af; font-size: 12px;">
          If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="text-align: center; color: #d1d5db; font-size: 11px;">
          Employee Management System — MedBillingRCM
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return { success: true };
}
