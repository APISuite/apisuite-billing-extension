import { expect } from 'chai'
import { findAll, findById } from './plan'


export default function run(): void {
  it('should return a list of plans', async () => {
    const res = await findAll(null)
    expect(res).to.be.an('array')
    expect(res.length).to.eq(3)
  })

  it('should return a plan with id 1', async () => {
    const res = await findById(null, 1)
    expect(res).to.be.an('object')
    expect(res).to.deep.eq({
      id: 1,
      name: 'Starter Pack',
      price: '200.00',
      credits: 200,
      periodicity: null,
    })
  })
}
