import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'
import { expect } from 'chai'

describe('TokenManagerV2Deployer', function () {
  it('Should revert with the right error if params error', async function () {
    const { tokenManagerV2Deployer, factory, owner, tokenManager, token, creator, grantParams_, poolParams_ } = await loadFixture(
      deployTokenManagerV2Fixture
    )

    expect(await tokenManagerV2Deployer.factoryAddress()).to.equal(await factory.getAddress())
    await expect(tokenManagerV2Deployer.setFactoryAddress(owner.address)).to.revertedWith('initialized')

    await expect(tokenManagerV2Deployer.deploy()).to.revertedWith('only factory call')
    await expect(
      tokenManagerV2Deployer.initializeTokenManagerV2(tokenManager, token, creator, grantParams_, poolParams_)
    ).to.revertedWith('only factory call')
  })
})
