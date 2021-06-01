import config from '../config'
import fetch from 'node-fetch'
import log from '../log'

export const getPaymentRedirectURL = async (role: string): Promise<URL> => {
  const paymentRedirectURL = (path: string): URL => new URL(path, config.get('apisuite.portal'))

  const url = new URL(config.get('apisuite.portalSettingsEndpoint'), config.get('apisuite.api')).href
  const options = {
    method: 'GET',
    headers: {},
  }

  try {
    const response = await fetch(url, options)
    if (!response || response.status !== 200) {
      return paymentRedirectURL(config.get('apisuite.paymentRedirectPath'))
    }

    const settings = await response.json()
    if (settings?.navigation[role]?.events?.onBillingPayment) {
      return paymentRedirectURL(settings.navigation[role].events.onBillingPayment)
    }
  } catch (err) {
    log.error(err, '[getPaymentRedirectURL]')
  }

  return paymentRedirectURL(config.get('apisuite.paymentRedirectPath'))
}