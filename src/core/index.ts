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

interface CoreUserData {
  name: string
  email: string
}

export const getUserData = async (userId: string|number): Promise<CoreUserData|null> => {
  const url = new URL(`/users/${userId}`, config.get('apisuite.api')).href

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {},
    })
    if (!response || response.status !== 200) {
      return null
    }

    const data = await response.json()
    return {
      name: data.name,
      email: data.email,
    }
  } catch (err) {
    log.error(err, '[getUserData]')
  }

  return null
}

interface CoreOwnerData {
  name: string
  description: string
  logo: string
}

export const getOwnerData = async (): Promise<CoreOwnerData|null> => {
  const url = new URL('/owner', config.get('apisuite.api')).href

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {},
    })
    if (!response || response.status !== 200) {
      return null
    }

    const data = await response.json()
    return {
      name: data.name,
      description: data.description,
      logo: data.logo,
    }
  } catch (err) {
    log.error(err, '[getUserData]')
  }

  return null
}
