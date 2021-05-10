import moment from 'moment'
import mollie, { MandateStatus, Payment, PaymentStatus, SequenceType, SubscriptionStatus } from '@mollie/api-client'
import config from '../config'
import { Subscription } from '../models/subscription'

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
  amount: number,
}

export interface TopUpPaymentResult {
  id: string
  checkoutURL: string
}

export interface VerifiedPayment {
  id: string
  amount: number
}

export interface VerifiedSubscriptionPayment extends VerifiedPayment {
  subscriptionId: string
}

export interface CustomerPayment {
  id: string
  description: string
  method: string
  status: string
  createdAt: string
  amount: {
    value: string
    currency: string
  }
}

export interface SubscriptionPaymentData {
  customerId: string
  price: number
  credits: number
  description: string
  interval: string
  startAfterFirstInterval: boolean
}

const getPaymentCheckoutURL = (payment: Payment): string | null => {
  return payment && payment._links.checkout && payment._links.checkout.href
    ? payment._links.checkout.href
    : null
}

export const createCustomer = async (newCustomer: NewMollieCustomer): Promise<string> => {
  const customer = await mollieClient.customers.create({
    email: newCustomer.email,
    name: newCustomer.name,
  })

  return customer.id
}

export const listCustomerPayments = async (id: string): Promise<CustomerPayment[]> => {
  const payments = await mollieClient.customers_payments.list({
    customerId: id,
  })
  let nextPage = payments.nextPage

  while(nextPage) {
    const nextPayments = await nextPage()
    payments.concat(nextPayments)
    nextPage = nextPayments.nextPage
  }

  return payments.map((payment) => ({
    id: payment.id,
    description: payment.description,
    method: <string>payment.method,
    status: payment.status,
    createdAt: payment.createdAt,
    amount: {
      currency: payment.amount.currency,
      value: payment.amount.value,
    },
  }))
}

export const firstPayment = async (customerId: string, value: number): Promise<FirstPaymentResult> => {
  const payment = await mollieClient.payments.create({
    amount: {
      currency: 'EUR',
      value: value.toFixed(2).toString(),
    },
    customerId,
    description: 'Payment authorization',
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
    amount: parseFloat(payment.amount.value),
  }
}

export const subscriptionFirstPayment = async (customerId: string, subscription: Subscription): Promise<FirstPaymentResult> => {
  const payment = await mollieClient.payments.create({
    amount: {
      currency: 'EUR',
      value: subscription.price.toFixed(2).toString(),
    },
    customerId,
    description: 'Payment authorization - ' + subscription.name,
    sequenceType: SequenceType.first,
    webhookUrl: config.get('mollie.subscriptionFirstPaymentWebhookUrl'),
    redirectUrl: config.get('mollie.paymentRedirectUrl'),
  })

  const checkoutURL = getPaymentCheckoutURL(payment)
  if (!checkoutURL) throw new Error('failed to create payment')

  if (!payment.mandateId) throw new Error('failed to create mandate')

  return {
    id: payment.id,
    checkoutURL: checkoutURL,
    mandateId: payment.mandateId,
    amount: parseFloat(payment.amount.value),
  }
}

export const topUpPayment = async (price: number, description: string, customerId: string): Promise<TopUpPaymentResult> => {
  const payment = await mollieClient.payments.create({
    customerId,
    description,
    amount: {
      currency: 'EUR',
      value: price.toFixed(2).toString(),
    },
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
    amount: parseFloat(payment.amount.value),
  }
}

export const verifySubscriptionPaymentSuccess = async (id: string): Promise<VerifiedSubscriptionPayment | null> => {
  const payment = await mollieClient.payments.get(id)
  if (!payment) throw new Error('failed to check payment')
  if (!payment.subscriptionId) return null
  if (payment.status !== PaymentStatus.paid) return null
  return {
    id: payment.id,
    amount: parseFloat(payment.amount.value),
    subscriptionId: payment.subscriptionId,
  }
}

export const subscriptionPayment = async (sub: SubscriptionPaymentData): Promise<string> => {
  const startDate = sub.startAfterFirstInterval ?
    moment().add(...sub.interval.split(' ')).format('YYYY-MM-DD') :
    moment().format('YYYY-MM-DD')
  const subscription = await mollieClient.customers_subscriptions.create({
    customerId: sub.customerId,
    description: sub.description,
    interval: sub.interval,
    amount: {
      currency: 'EUR',
      value: sub.price.toFixed(2).toString(),
    },
    metadata: sub.credits,
    webhookUrl: config.get('mollie.subscriptionPaymentWebhookUrl'),
    startDate,
  })

  return subscription.id
}

export const cancelSubscription = async (id: string, customerId: string): Promise<void> => {
  const subscription = await mollieClient.customers_subscriptions.cancel(id, { customerId })
  if (subscription.status !== SubscriptionStatus.canceled) throw new Error('failed to cancel subscription')
}

export const createUser = async (name: string, email: string): Promise<string> => {
  const customer = await mollieClient.customers.create({
    name,
    email,
  })
  return customer.id
}

export const updatePaymentRedirectURL = async (id: string, redirectUrl: string): Promise<void> => {
  await mollieClient.payments.update(id, { redirectUrl })
}