import nodemailer from 'nodemailer'
import config from '../config'
import log from '../log'
import handlebars from "handlebars"
import fs from "fs"
import path from "path"
import moment from "moment"

const DEFAULT_LOGO = 'https://cloudcdn.apisuite.io/apisuite_logo.png'

const smtpOptions = {
  ...config.get('mailer.smtpConfig'),
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const transporter = nodemailer.createTransport(smtpOptions)

interface MailerMessage {
  from: string
  to: string
  subject: string
  html: string
}

const send = async (message: MailerMessage): Promise<void> => {
  try {
    await transporter.sendMail(message)
  } catch (err) {
    log.error(err, '[EMAIL SEND]')

    if (err.response) {
      log.error(err.response.body, '[EMAIL SEND body]')
    }
  }
}

const getTemplateContent = (templateName: string): Buffer => {
  return fs.readFileSync(path.join(__dirname, `templates/${templateName}.hbs`))
}

export interface BaseMesssage {
  email: string
}

export interface PaymentConfirmationMessage extends BaseMesssage {
  paymentID: string
  paymentTitle: string
  credits: number
  price: number
  createdAt: string
  portalName: string
  supportURL: string
}

export interface EmailOptions {
  logo?: string
}

export const sendPaymentConfirmation = async (message: PaymentConfirmationMessage, options?: EmailOptions): Promise<void> => {
  const source = getTemplateContent('payment-confirmation')
  const template = handlebars.compile(source.toString())

  const html = template({
    assetsBaseURI: 'https://cloudcdn.apisuite.io',
    date: moment().format('DD-MM-YYYY'),
    billingURL: (new URL('/billing', config.get('apisuite.portal'))).href,
    logo: options?.logo || DEFAULT_LOGO,
    ...message,
  })

  await send({
    to: message.email,
    from: config.get('mailer.from'),
    subject: `${config.get('mailer.title')} payment confirmation`,
    html,
  })
}
