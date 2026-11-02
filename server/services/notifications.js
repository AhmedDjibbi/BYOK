import nodemailer from 'nodemailer'
import twilio from 'twilio'

const emailReady = Boolean(
  process.env.SMTP_HOST &&
    Number.isInteger(Number(process.env.SMTP_PORT)) &&
    Number(process.env.SMTP_PORT) > 0 &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    process.env.NOTIFICATION_EMAIL_FROM &&
    process.env.NOTIFICATION_EMAIL_TO,
)
const smsReady = Boolean(
  process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER &&
    process.env.NOTIFICATION_SMS_TO,
)

const mailTransport = emailReady
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    })
  : null
const smsClient = smsReady
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, { timeout: 10000 })
  : null

export function getNotificationConfiguration() {
  return {
    email: emailReady ? 'configured' : 'not_configured',
    sms: smsReady ? 'configured' : 'not_configured',
  }
}

export function logNotificationConfiguration() {
  const configuration = getNotificationConfiguration()
  for (const [channel, status] of Object.entries(configuration)) {
    if (status !== 'configured') {
      console.warn(`${channel.toUpperCase()} notifications are not configured.`)
    }
  }
}

export async function sendNotifications({ subject, text, customerEmail, customerPhone }) {
  const delivery = getNotificationConfiguration()
  const tasks = []

  if (mailTransport) {
    const recipients = [...new Set([process.env.NOTIFICATION_EMAIL_TO, customerEmail].filter(Boolean))]
    for (const to of recipients) {
      tasks.push(
        Promise.resolve()
          .then(() => mailTransport.sendMail({
            from: process.env.NOTIFICATION_EMAIL_FROM,
            to,
            subject,
            text,
          }))
          .catch((error) => {
            delivery.email = 'failed'
            console.error(`Email notification failed (${error.code ?? 'provider error'}).`)
          }),
      )
    }
    if (delivery.email !== 'failed') delivery.email = 'sent'
  }

  if (smsClient) {
    const recipients = [...new Set([process.env.NOTIFICATION_SMS_TO, customerPhone].filter(Boolean))]
    for (const to of recipients) {
      tasks.push(
        Promise.resolve()
          .then(() => smsClient.messages.create({
            body: text.slice(0, 1500),
            from: process.env.TWILIO_FROM_NUMBER,
            to,
          }))
          .catch((error) => {
            delivery.sms = 'failed'
            console.error(`SMS notification failed (${error.code ?? 'provider error'}).`)
          }),
      )
    }
  }

  await Promise.all(tasks)
  if (smsClient && delivery.sms === 'configured') delivery.sms = 'sent'
  return delivery
}
