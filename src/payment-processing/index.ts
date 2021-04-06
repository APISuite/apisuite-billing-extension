import mollie, {MandateStatus} from '@mollie/api-client'
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

export const createCustomer = async (newCustomer: NewMollieCustomer): Promise<string> => {
  const customer = await mollieClient.customers.create({
    email: newCustomer.email,
    name: newCustomer.name,
  })

  return customer.id
}

