import sinon from 'sinon'
import { expect } from 'chai'
import config from '../config'
import { getPaymentRedirectURL } from './index'

describe('core connector', () => {
  describe('getPaymentRedirectURL', () => {
    it('should a URL', async () => {
      sinon
        .stub(config, 'get')
        .withArgs('apisuite.portalSettingsEndpoint').returns('/settings/portal')
        .withArgs('apisuite.api').returns('http://localhost:9999')
        .withArgs('apisuite.portal').returns('http://localhost:9900')
        .withArgs('apisuite.paymentRedirectPath').returns('/payment/path')
      sinon.stub()

      const res = await getPaymentRedirectURL('noRole')
      expect(res).to.be.an.instanceof(URL)
    })
  })
})
