// Email sending helper (stub implementation)
// In production, replace with actual email service like Resend

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // TODO: Implement actual email sending with Resend or similar service
  //
  // Example with Resend:
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'Bilgi Santa <noreply@bilgisanta.com>',
  //   to: options.to,
  //   subject: options.subject,
  //   html: options.html,
  // })

  console.log("[Email] Would send email:")
  console.log(`  To: ${options.to}`)
  console.log(`  Subject: ${options.subject}`)
  console.log(`  HTML: ${options.html.substring(0, 100)}...`)

  return true
}

export function createMatchNotificationEmail(params: {
  recipientName: string
  meetingDate: string
  meetingTime: string
  meetingLocation: string | null
  meetingCode: string
  partnerInterests: string[]
}): string {
  const { recipientName, meetingDate, meetingTime, meetingLocation, meetingCode, partnerInterests } = params
  const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/bilgi-santa-logo.png`

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #0D0D0D; color: #FFFFFF; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px; }
    .logo img { max-width: 200px; height: auto; }
    .card { background-color: #151515; border: 1px solid #2A2A2A; border-radius: 16px; padding: 30px; margin-bottom: 20px; }
    .code { font-size: 28px; font-weight: bold; color: #FFD700; text-align: center; }
    .detail { margin: 10px 0; }
    .label { color: #A0A0A0; font-size: 14px; }
    .value { font-size: 16px; font-weight: 500; }
    .interests { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .tag { background-color: rgba(227, 30, 36, 0.1); color: #E31E24; padding: 6px 12px; border-radius: 20px; font-size: 14px; }
    .footer { text-align: center; color: #666666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="${logoUrl}" alt="Bilgi Santa" />
      </div>
      <p>Eşleşmen hazır!</p>
    </div>
    
    <div class="card">
      <p>Merhaba ${recipientName},</p>
      <p>Seni bir arkadaşınla eşleştirdik! İşte buluşma detayların:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <div class="label">Buluşma Kodu</div>
        <div class="code">${meetingCode}</div>
      </div>
      
      <div class="detail">
        <div class="label">Tarih</div>
        <div class="value">${meetingDate}</div>
      </div>
      
      <div class="detail">
        <div class="label">Saat</div>
        <div class="value">${meetingTime}</div>
      </div>
      
      ${
        meetingLocation
          ? `
      <div class="detail">
        <div class="label">Yer</div>
        <div class="value">${meetingLocation}</div>
      </div>
      `
          : ""
      }
      
      <div class="detail">
        <div class="label">Eşinin İlgi Alanları</div>
        <div class="interests">
          ${partnerInterests.map((i) => `<span class="tag">${i}</span>`).join("")}
        </div>
      </div>
    </div>
    
    <p style="text-align: center; color: #A0A0A0;">
      Hediyeni hazırla ve belirlenen saatte buluşma noktasında ol!
    </p>
    
    <div class="footer">
      <p>İstanbul Bilgi Üniversitesi Hediyeleşme Platformu</p>
      <p>© 2026 Bilgi Santa</p>
    </div>
  </div>
</body>
</html>
  `
}
