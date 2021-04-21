import mollie, { MandateStatus, Payment, PaymentStatus, SequenceType, SubscriptionStatus } from '@mollie/api-client'
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

export const isMandateValid = async (mandateId: string, customerId: string): Promise<boolean> => {
  const mandate = await mollieClient.customers_mandates.get(mandateId, { customerId })
  return mandate.status === MandateStatus.valid || mandate.status === MandateStatus.pending
}

export interface NewMollieCustomer {
  name: string
  email: string
}

export interface FirstPaymentResult {
  id: string
  checkoutURL: string
  mandateId: string
  amount: string,
}

export interface TopUpPaymentResult {
  id: string
  checkoutURL: string
}

export interface VerifiedPayment {
  id: string
  amount: string
}

export interface VerifiedSubscriptionPayment extends VerifiedPayment {
  subscriptionId: string
}

export const createCustomer = async (newCustomer: NewMollieCustomer): Promise<string> => {
  const customer = await mollieClient.customers.create({
    email: newCustomer.email,
    name: newCustomer.name,
  })

  return customer.id
}

export const firstPayment = async (customerId: string): Promise<FirstPaymentResult> => {
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

  if (!payment.mandateId) throw new Error('failed to create mandate')

  return {
    id: payment.id,
    checkoutURL: checkoutURL,
    mandateId: payment.mandateId,
    amount: payment.amount.value,
  }
}

export const topUpPayment = async (price: string, description: string): Promise<TopUpPaymentResult> => {
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

export const verifyPaymentSuccess = async (id: string): Promise<VerifiedPayment | null> => {
  const payment = await mollieClient.payments.get(id)
  if (!payment) throw new Error('failed to check payment')
  if (payment.status !== PaymentStatus.paid) return null
  return {
    id: payment.id,
    amount: payment.amount.value,
  }
}

export const verifySubscriptionPaymentSuccess = async (id: string): Promise<VerifiedSubscriptionPayment | null> => {
  const payment = await mollieClient.payments.get(id)
  if (!payment) throw new Error('failed to check payment')
  if (!payment.subscriptionId) return null
  if (payment.status !== PaymentStatus.paid) return null
  return {
    id: payment.id,
    amount: payment.amount.value,
    subscriptionId: payment.subscriptionId,
  }
}

const getPaymentCheckoutURL = (payment: Payment): string | null => {
  return payment && payment._links.checkout && payment._links.checkout.href
    ? payment._links.checkout.href
    : null
}

export interface SubscriptionPaymentData {
  customerId: string
  mandateId: string
  price: number
  credits: number
  description: string
  interval: string
}

export const subscriptionPayment = async (sub: SubscriptionPaymentData): Promise<string> => {
  const startDate = (new Date()).toISOString().split('T')[0]
  const payment = await mollieClient.customers_subscriptions.create({
    customerId: sub.customerId,
    mandateId: sub.mandateId,
    description: sub.description,
    interval: sub.interval,
    amount: {
      currency: 'EUR',
      value: sub.price.toString(),
    },
    metadata: sub.credits,
    webhookUrl: config.get('mollie.subscriptionPaymentWebhookUrl'),
    startDate,
  })

  return payment.id
}

export const cancelSubscription = async (id: string, customerId: string): Promise<void> => {
  const subscription = await mollieClient.customers_subscriptions.cancel(id, { customerId })
  if (subscription.status !== SubscriptionStatus.canceled) throw new Error('failed to cancel subscription')
}