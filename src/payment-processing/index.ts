import mollie, { MandateStatus, Payment, PaymentMethod, PaymentStatus, SequenceType } from '@mollie/api-client'
import config from '../config'

const mollieClient = mollie({
  apiKey: config.get('mollie.apiKey'),
})

export const findValidMandate = async (customerId: string): Promise<string | null> => {
  let mandates = await mollieClient.customers_mandates.list({
    customerId,
  })

  while(mandates) {
    if (!mandates.count) break

    for(const m of mandates) {
      if (m.status === MandateStatus.valid) {
        return m.id
      }
    }

    if (mandates.nextPage) {
      mandates = await mandates.nextPage()
    }
  }

  return null
}

export interface NewMollieCustomer {
  name: string
  email: string
}

export interface TopUpPaymentResult {
  id: string
  checkoutURL: string
}

export const createCustomer = async (newCustomer: NewMollieCustomer): Promise<string> => {
  const customer = await mollieClient.customers.create({
    email: newCustomer.email,
    name: newCustomer.name,
  })

  return customer.id
}

export const firstPayment = async (customerId: string): Promise<TopUpPaymentResult> => {
  const payment = await mollieClient.payments.create({
    amount: {
      currency: 'EUR',
      value: '0.00',
    },
    customerId,
    description: 'Payment method authorization',
    sequenceType: SequenceType.first,
    webhookUrl: config.get('mollie.firstPaymentWebhookUrl'),
    redirectUrl: config.get('mollie.paymentRedirectUrl'),
  })

  const checkoutURL = getPaymentCheckoutURL(payment)
  if (!checkoutURL) throw new Error('failed to create payment')

  return {
    id: payment.id,
    checkoutURL: checkoutURL,
  }
}

export const topUpPayment = async (price: number, description: string): Promise<TopUpPaymentResult> => {
  const payment = await mollieClient.payments.create({
    amount: {
      currency: 'EUR',
      value: price.toString(),
    },
    description,
    sequenceType: SequenceType.oneoff,
    webhookUrl: config.get('mollie.topUpWebhookUrl'),
    redirectUrl: config.get('mollie.paymentRedirectUrl'),
  })

  const checkoutURL = getPaymentCheckoutURL(payment)
  if (!checkoutURL) throw new Error('failed to create payment')

  return {
    id: payment.id,
    checkoutURL: checkoutURL,
  }
}

export const verifyPaymentSuccess = async (id: string): Promise<string | null> => {
  const payment = await mollieClient.payments.get(id)
  if (!payment) throw new Error('failed to check payment')
  return payment.status === PaymentStatus.paid ? payment.id : null
}

const getPaymentCheckoutURL = (payment: Payment): string | null => {
  return payment && payment._links.checkout && payment._links.checkout.href
    ? payment._links.checkout.href
    : null
}