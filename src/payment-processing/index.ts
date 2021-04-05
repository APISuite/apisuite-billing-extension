import mollie, {MandateStatus} from '@mollie/api-client'
import config from "../config"

export const findValidMandate = async (customerId: string): Promise<string | null> => {
  const mollieClient = mollie({
    apiKey: config.get('mollie.apiKey'),
  })

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

