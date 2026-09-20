/**
 * ─────────────────────────────────────────────
 * NOTIFICATION ENGINE
 * ─────────────────────────────────────────────
 * 
 * Yeh file admission ke baad parents ko credentials bhejne ka kaam karti hai.
 * Abhi ke liye console.log se kaam chalata hai.
 * 
 * Future mein aapko bas niche diye gaye functions ke andar
 * apne Email (Resend) aur SMS (Fast2SMS) ka API code likhna hoga.
 * 
 * Setup:
 *  1. .env mein yeh add karein:
 *     RESEND_API_KEY=re_xxxxxxxxxxxxx
 *     FAST2SMS_API_KEY=xxxxxxxxxxxxx
 *  2. npm install resend  (jab ready hon)
 */

// ─────────────────────────────────────────────
// EMAIL SECTION (Resend — Free 3000/month)
// ─────────────────────────────────────────────
// Jab ready ho, uncomment karein:
// import { Resend } from 'resend';
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmailNotification(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // ──── PRODUCTION CODE (uncomment jab API ready ho) ────
    // const { data, error } = await resend.emails.send({
    //   from: 'noreply@yourschool.com',
    //   to: [to],
    //   subject: subject,
    //   html: body,
    // });
    // if (error) return { success: false, error: error.message };
    // return { success: true };

    // ──── DEVELOPMENT / TESTING MODE ────
    console.log("═══════════════════════════════════════════");
    console.log("📧 EMAIL NOTIFICATION (Dev Mode)");
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    ${body}`);
    console.log("═══════════════════════════════════════════");
    return { success: true };
  } catch (error: any) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// SMS SECTION (Fast2SMS — Free ₹50 credits)
// ─────────────────────────────────────────────
// Fast2SMS API docs: https://docs.fast2sms.com/

export async function sendSmsNotification(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // ──── PRODUCTION CODE (uncomment jab API ready ho) ────
    // const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    //   method: "POST",
    //   headers: {
    //     "authorization": process.env.FAST2SMS_API_KEY!,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     route: "q",
    //     message: message,
    //     language: "english",
    //     flash: 0,
    //     numbers: phone,
    //   }),
    // });
    // const data = await response.json();
    // if (!data.return) return { success: false, error: data.message };
    // return { success: true };

    // ──── DEVELOPMENT / TESTING MODE ────
    console.log("═══════════════════════════════════════════");
    console.log("📱 SMS NOTIFICATION (Dev Mode)");
    console.log(`   To:      ${phone}`);
    console.log(`   Message: ${message}`);
    console.log("═══════════════════════════════════════════");
    return { success: true };
  } catch (error: any) {
    console.error("SMS send error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// MASTER FUNCTION: Send Welcome Credentials
// ─────────────────────────────────────────────
// Yeh function admission approve hone par call hota hai.
// Chahe QR se ho, Manual se ho, ya Bulk Import se.

export async function sendWelcomeCredentials(data: {
  schoolName: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string | null;
  studentLoginId: string;
  studentPassword: string;
  parentLoginId: string;
  parentPassword: string;
}) {
  const smsMessage = `Welcome to ${data.schoolName}! ${data.studentName} ka admission confirm hua.\n` +
    `Student Login: ${data.studentLoginId}\n` +
    `Password: ${data.studentPassword}\n` +
    `Parent Login: ${data.parentLoginId}\n` +
    `Password: ${data.parentPassword}`;

  const emailBody = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Welcome to ${data.schoolName}!</h2>
      <p>Dear ${data.parentName},</p>
      <p><strong>${data.studentName}</strong> ka admission successfully confirm ho gaya hai.</p>
      <hr style="border: 1px solid #E2E8F0;" />
      <h3>Login Credentials:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #F1F5F9;">
          <td style="padding: 8px; font-weight: bold;">Student Login ID</td>
          <td style="padding: 8px;">${data.studentLoginId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Student Password</td>
          <td style="padding: 8px;">${data.studentPassword}</td>
        </tr>
        <tr style="background: #F1F5F9;">
          <td style="padding: 8px; font-weight: bold;">Parent Login ID</td>
          <td style="padding: 8px;">${data.parentLoginId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Parent Password</td>
          <td style="padding: 8px;">${data.parentPassword}</td>
        </tr>
      </table>
      <p style="margin-top: 16px; color: #64748B; font-size: 12px;">
        Please change your password after first login.
      </p>
    </div>
  `;

  // Send SMS
  await sendSmsNotification(data.parentPhone, smsMessage);

  // Send Email (if available)
  if (data.parentEmail) {
    await sendEmailNotification(
      data.parentEmail,
      `${data.schoolName} — Admission Confirmed for ${data.studentName}`,
      emailBody
    );
  }
}
