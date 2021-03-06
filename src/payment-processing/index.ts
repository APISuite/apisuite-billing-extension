import moment from 'moment'
import mollie, {
  MandateStatus,
  Payment,
  PaymentStatus,
  SequenceType,
  SubscriptionStatus,
  SubscriptionUpdateParams,
} from '@mollie/api-client'
import config from '../config'
import { Subscription } from '../models/subscription'
import { Package } from '../models/package'

const mollieClient = mollie({
  apiKey: config.get('mollie.apiKey'),
})

enum PaymentType {
  TopUp = 'topup',
  Subscription = 'subscription'
}

export interface FirstPaymentResult {
  id: string
  checkoutURL: string
  amount: number
}

export interface TopUpPaymentResult {
  id: string
  checkoutURL: string
}

export interface VerifiedPayment {
  id: string
  amount: number
  mandateId: string
  metadata: {
    userId: number
    organizationId: number
    credits: number
    type: string
    invoiceNotes: string
  }
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
  credits: number
  type: string
}

export interface SubscriptionPaymentData {
  customerId: string
  price: number
  credits: number
  description: string
  interval: string
  startAfterFirstInterval: boolean
}

export interface UserInformation {
  userId: number
  organizationId: number
  invoiceNotes: string
}

export type SimplifiedPayment = Pick<Payment, 'id' | 'description' | 'method' | 'metadata'
  | 'status' | 'createdAt' | 'amount' >

export type SubscriptionUpdateParameters = Pick<SubscriptionUpdateParams, 'customerId' | 'mandateId'>

const getPaymentCheckoutURL = (payment: Payment): string | null => {
  return payment && payment._links.checkout && payment._links.checkout.href
    ? payment._links.checkout.href
    : null
}

export const isMandateValid = async (mandateId: string, customerId: string): Promise<boolean> => {
  const mandate = await mollieClient.customers_mandates.get(mandateId, { customerId })
  return mandate.status === MandateStatus.valid || mandate.status === MandateStatus.pending
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
    credits: payment.metadata?.credits,
    type: payment.metadata?.type,
  }))
}

export const subscriptionFirstPayment = async (customerId: string, subscription: Subscription, userInformation: UserInformation, update: boolean): Promise<FirstPaymentResult> => {
  let webHookUrl = config.get('mollie.subscriptionFirstPaymentWebhookUrl')
  if (update) webHookUrl = config.get('mollie.subscriptionPaymentUpdateWebhookUrl')

  const payment = await mollieClient.payments.create({
    amount: {
      currency: 'EUR',
      value: subscription.price.toFixed(2).toString(),
    },
    customerId,
    description: 'Payment authorization - ' + subscription.name,
    sequenceType: SequenceType.first,
    webhookUrl: webHookUrl,
    redirectUrl: config.get('mollie.paymentRedirectUrl'), // URL will be changed to include the payment ID after the payment is created
    metadata: {
      userId: userInformation.userId,
      organizationId: userInformation.organizationId,
      credits: subscription.credits,
      type: PaymentType.Subscription,
      invoiceNotes: userInformation.invoiceNotes,
    },
  })
  const checkoutURL = getPaymentCheckoutURL(payment)
  if (!checkoutURL) throw new Error('failed to create payment')

  return {
    id: payment.id,
    checkoutURL: checkoutURL,
    amount: parseFloat(payment.amount.value),
  }
}

export const topUpPayment = async (pkg: Package, customerId: string, userInformation: UserInformation): Promise<TopUpPaymentResult> => {
  const payment = await mollieClient.payments.create({
    customerId,
    description: pkg.name,
    amount: {
      currency: 'EUR',
      value: pkg.price.toFixed(2).toString(),
    },
    sequenceType: SequenceType.oneoff,
    webhookUrl: config.get('mollie.topUpWebhookUrl'),
    redirectUrl: config.get('mollie.paymentRedirectUrl'), // URL will be changed to include the payment ID after the payment is created
    metadata: {
      userId: userInformation.userId,
      organizationId: userInformation.organizationId,
      credits: pkg.credits,
      type: PaymentType.TopUp,
      invoiceNotes: userInformation.invoiceNotes,
    },
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
    mandateId: payment.mandateId ?? '',
    metadata: payment.metadata,
  }
}

export const verifySubscriptionPaymentSuccess = async (id: string): Promise<VerifiedSubscriptionPayment | null> => {
  const payment = await mollieClient.payments.get(id)
  if (!payment) throw new Error('failed to check payment')
  if (!payment.subscriptionId) return null
  if (payment.status !== PaymentStatus.paid) return null
  if (!payment.mandateId) return null
  return {
    id: payment.id,
    amount: parseFloat(payment.amount.value),
    subscriptionId: payment.subscriptionId,
    mandateId: payment.mandateId ?? '',
    metadata: payment.metadata,
  }
}

export const subscriptionPayment = async (sub: SubscriptionPaymentData, userInformation: UserInformation): Promise<string> => {
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
    metadata:{
      userId: userInformation.userId,
      organizationId: userInformation.organizationId,
      credits: sub.credits,
      type: PaymentType.Subscription,
      invoiceNotes: userInformation.invoiceNotes,
    },
    webhookUrl: config.get('mollie.subscriptionPaymentWebhookUrl'),
    startDate,
  })

  return subscription.id
}

export const cancelSubscription = async (id: string, customerId: string): Promise<void> => {
  const subscription = await mollieClient.customers_subscriptions.get(id, { customerId })
  if (subscription.status == SubscriptionStatus.active) {
    const cancelled = await mollieClient.customers_subscriptions.cancel(id, { customerId })
    if (cancelled.status !== SubscriptionStatus.canceled) throw new Error('failed to cancel subscription')
  }
}

export const createCustomer = async (name: string, email: string): Promise<string> => {
  const customer = await mollieClient.customers.create({
    name,
    email,
  })
  return customer.id
}

export const updatePaymentRedirectURL = async (id: string, redirectUrl: string): Promise<void> => {
  await mollieClient.payments.update(id, { redirectUrl })
}

export const getPaymentDetails = (id: string): Promise<SimplifiedPayment> => {
  return mollieClient.payments.get(id)
}

export const getSubscriptionNextPaymentDate = async (subscriptionId: string, customerId: string): Promise<string | null> => {
  const subscription = await mollieClient.customers_subscriptions.get(subscriptionId, { customerId })
  return subscription?.nextPaymentDate || null
}

export const updateSubscription = async (subscriptionId: string, updatable: SubscriptionUpdateParameters): Promise<void> => {
  await mollieClient.customers_subscriptions.update(subscriptionId, updatable)
}
