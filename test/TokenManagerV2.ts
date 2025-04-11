import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { parseEther, ZeroAddress } from 'ethers'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'

describe('TokenManager', function () {
  describe('Deployment', function () {
    it('Should set the right initialize', async function () {
      const { tokenManager, creator, token, grantParams_, poolParams_, factory } = await loadFixture(deployTokenManagerV2Fixture)

      await expect(
        tokenManager.initialize(await factory.getAddress(), await token.getAddress(), creator, grantParams_, poolParams_)
      ).to.revertedWith('Initialized')
    })
  })

  describe('Params', function () {
    it('Should set the right params', async function () {
      const { tokenManager, creator, token,initialSupply, grantParams_, block, poolParams_, factory } = await loadFixture(
        deployTokenManagerV2Fixture
      )

      expect(await tokenManager.token()).to.equal(await token.getAddress())
      expect(await tokenManager.creator()).to.equal(creator)
      expect(await tokenManager.poolInitialized()).to.equal(false)
      expect(await tokenManager.poolAddress()).to.equal(ZeroAddress)

      expect((await tokenManager.grantParams()).duration).to.equal(grantParams_.duration)
      expect((await tokenManager.grantParams()).startAt).to.equal(grantParams_.startAt)
      expect((await tokenManager.grantParams()).price).to.equal(grantParams_.price)
      expect((await tokenManager.grantParams()).rigidCapAmount).to.equal(grantParams_.rigidCapAmount)
      expect((await tokenManager.grantParams()).userRigidCapAmount).to.equal(grantParams_.userRigidCapAmount)

      expect((await tokenManager.grantDetails()).latestUnlockAt).to.equal(block?.timestamp)
      expect((await tokenManager.grantDetails()).latestUnlockPrice).to.equal(grantParams_.price)
      expect((await tokenManager.grantDetails()).latestPrice).to.equal(0n)
      expect((await tokenManager.grantDetails()).totalInvest).to.equal(0n)
      expect((await tokenManager.grantDetails()).investors).to.equal(0n)

      expect((await tokenManager.poolParams()).WBNB).to.equal(poolParams_.WBNB)
      expect((await tokenManager.poolParams()).V3LPTradingFee).to.equal(poolParams_.V3LPTradingFee)
      expect((await tokenManager.poolParams()).V3PositionManager).to.equal(poolParams_.V3PositionManager)
      expect((await tokenManager.poolParams()).V3factory).to.equal(poolParams_.V3factory)
      expect((await tokenManager.poolParams()).tickLower).to.equal(poolParams_.tickLower)
      expect((await tokenManager.poolParams()).tickUpper).to.equal(poolParams_.tickUpper)
      expect((await tokenManager.poolParams()).amountToken).to.equal(poolParams_.amountToken)
      expect((await tokenManager.poolParams()).amountBNB).to.equal(poolParams_.amountBNB)

      expect((await tokenManager.liquidityParams()).tokenId).to.equal(0n)
      expect((await tokenManager.liquidityParams()).liquidity).to.equal(0n)

      expect(await tokenManager.isGrantEnded()).to.equal(false)
      expect(await tokenManager.isGrantCompleted()).to.equal(false)

      expect(await tokenManager.factory()).to.equal(await factory.getAddress())
      expect(await tokenManager.getFee()).to.equal(parseEther('1.44'))
      expect(await tokenManager.getMaxInvest()).to.equal(5n * grantParams_.rigidCapAmount)
      expect(await tokenManager.getInitialUnlock()).to.equal(initialSupply)
    })
  })
})
