import mollie, {MandateStatus, SequenceType} from '@mollie/api-client'
import config from "../config"

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

export const topUpPayment = async (price: number, description: string): Promise<TopUpPaymentResult> => {
  const payment = await mollieClient.payments.create({
    amount: {
      currency: 'EUR',
      value: price.toString(),
    },
    description,
    sequenceType: SequenceType.oneoff,
    webhookUrl: config.get('mollie.webhookUrl'),
    redirectUrl: config.get('mollie.paymentRedirectUrl'),
  })

  return {
    id: payment.id,
    checkoutURL: payment._links.checkout,
  }
}
