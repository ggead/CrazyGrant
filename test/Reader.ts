import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { expect } from 'chai'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'

describe('Reader', function () {
  it('Should  the right reader', async function () {
    const { reader, factory, name, symbol, creator, totalSupply, grantParams_, poolParams_ } = await loadFixture(deployTokenManagerV2Fixture)
  })
})
