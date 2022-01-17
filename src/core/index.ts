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
    log.error(err, '[getOwnerData]')
  }

  return null
}

interface CoreSettingsData {
  portalName: string
  supportURL: string
}

export const getPortalSettings = async (): Promise<CoreSettingsData|null> => {
  const url = new URL('/settings', config.get('apisuite.api')).href

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
      portalName: data.portalName,
      supportURL: data.supportURL,
    }
  } catch (err) {
    log.error(err, '[getPortalSettings]')
  }

  return null
}

interface CoreOrganizationData {
  name: string
  taxExempt: boolean
}

export interface CoreRequestOptions {
  authorizationHeader?: string
  cookieHeader?: string
}

export const getOrganizationData = async (orgId: string|number, options: CoreRequestOptions|null): Promise<CoreOrganizationData|null> => {
  const url = new URL(`/organizations/${orgId}`, config.get('apisuite.api')).href

  const reqOptions = {
    method: 'GET',
    headers: {},
  }

  if (options?.authorizationHeader) {
    reqOptions.headers = { authorization: options.authorizationHeader }
  }

  if (options?.cookieHeader) {
    reqOptions.headers = { cookie: options.cookieHeader }
  }

  try {
    const response = await fetch(url, reqOptions)
    if (!response || response.status !== 200) {
      return null
    }

    const data = await response.json()
    return {
      name: data.name,
      taxExempt: data.taxExempt,
    }
  } catch (err) {
    log.error(err, '[getOrganizationData]')
  }

  return null
}