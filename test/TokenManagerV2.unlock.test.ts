import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { expect } from 'chai'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'
import { increaseTime, setNextBlockTimestamp } from './utils'
import { completeGrant } from './utils/completeGrant'

const SIX_MONTH_IN_SECINDS = 15_552_000

describe('Unlock', function () {
  describe('Price', function () {
    it('Should revert with the right error if time not reached', async function () {
      const { tokenManager } = await loadFixture(deployTokenManagerV2Fixture)

      const targetPrice = hre.ethers.parseUnits('0.0004', 18)

      await expect(tokenManager.setLatestPrice(targetPrice)).to.revertedWith('Lock Period Not Expired')
    })

    it('Should set the right price', async function () {
      const { tokenManager } = await loadFixture(deployTokenManagerV2Fixture)

      const targetPrice = hre.ethers.parseUnits('0.0004', 18)

      await increaseTime(SIX_MONTH_IN_SECINDS)

      const time = (await hre.ethers.provider.getBlock('latest'))!.timestamp + 100
      await setNextBlockTimestamp(time)

      await expect(tokenManager.setLatestPrice(targetPrice))
        .to.emit(tokenManager, 'LatestPriceChange')
        .withArgs(...[targetPrice, time])

      expect((await tokenManager.grantDetails()).latestPrice).to.equal(targetPrice)
    })
  })

  describe('Unlock', function () {
    it('Should revert with the right error if params error', async function () {
      const { tokenManager, totalSupply, otherAccount, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)

      await completeGrant(tokenManager, grantParams_)

      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n

      await expect(tokenManager.unlock(maxSecondUnlockAmount)).to.revertedWith('Lock Period Not Expired')

      await increaseTime(SIX_MONTH_IN_SECINDS)

      await expect(tokenManager.unlock(maxSecondUnlockAmount)).to.revertedWith('Unlock Price Not Yet Reached')

      await tokenManager.setLatestPrice(hre.ethers.parseUnits('0.0004', 18))

      await expect(tokenManager.unlock(maxSecondUnlockAmount + 1n)).to.revertedWith('Exceeds Unlock Limit')

      await expect(tokenManager.connect(otherAccount).unlock(maxSecondUnlockAmount)).to.revertedWith('Only Creator')
    })

    it('Should emit an event on unlock', async function () {
      const { tokenManager, totalSupply, owner, token, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)
      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n

      await completeGrant(tokenManager, grantParams_)

      await increaseTime(SIX_MONTH_IN_SECINDS)
      await tokenManager.setLatestPrice(hre.ethers.parseUnits('0.0004', 18))

      const time = (await hre.ethers.provider.getBlock('latest'))!.timestamp + 100
      await setNextBlockTimestamp(time)

      await expect(tokenManager.unlock(maxSecondUnlockAmount))
        .to.emit(token, 'Transfer')
        .withArgs(...[await tokenManager.getAddress(), owner.address, maxSecondUnlockAmount])
        .to.emit(tokenManager, 'OnTokenUnlock')
        .withArgs(...[maxSecondUnlockAmount, 0n, hre.ethers.parseUnits('0.0004', 18), time])
    })

    it('Should transfer the funds to creator', async function () {
      const { tokenManager, totalSupply, creator, token, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)
      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n

      await completeGrant(tokenManager, grantParams_)

      await increaseTime(SIX_MONTH_IN_SECINDS)

      await tokenManager.setLatestPrice(hre.ethers.parseUnits('0.0004', 18))

      await expect(tokenManager.unlock(maxSecondUnlockAmount)).to.changeTokenBalances(
        token,
        [await tokenManager.getAddress(), creator],
        [-maxSecondUnlockAmount, maxSecondUnlockAmount]
      )
    })

    it('Should burn token if unlocking not according to the maximum number', async function () {
      const { tokenManager, totalSupply, creator, token, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)
      const secondUnlockAmount = (totalSupply * 3n) / 100n
      const burnAmount = (totalSupply * 2n) / 100n

      await completeGrant(tokenManager, grantParams_)

      await increaseTime(SIX_MONTH_IN_SECINDS)

      await tokenManager.setLatestPrice(hre.ethers.parseUnits('0.0004', 18))

      const tx = await tokenManager.unlock(secondUnlockAmount)
      const receipt = await tx.wait()

      const transferEvents =
        receipt?.logs
          .map(log => {
            try {
              return token.interface.parseLog(log)
            } catch (e) {
              return null
            }
          })
          .filter(event => event && event.name === 'Transfer') ?? []

      expect(transferEvents.length).to.equal(2)
      expect(transferEvents[0]?.args[0]).to.equal(await tokenManager.getAddress())
      expect(transferEvents[0]?.args[1]).to.equal(creator)
      expect(transferEvents[0]?.args[2]).to.equal(secondUnlockAmount)

      expect(transferEvents[1]?.args[0]).to.equal(await tokenManager.getAddress())
      expect(transferEvents[1]?.args[1]).to.equal(hre.ethers.ZeroAddress)
      expect(transferEvents[1]?.args[2]).to.equal(burnAmount)
    })

    it('Should set the correct state', async function () {
      const { tokenManager, totalSupply, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)
      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n
      const price = hre.ethers.parseUnits('0.0004', 18)

      await completeGrant(tokenManager, grantParams_)

      await increaseTime(SIX_MONTH_IN_SECINDS)

      await tokenManager.setLatestPrice(price)

      const tx = await tokenManager.unlock(maxSecondUnlockAmount)
      const block = await tx.getBlock()

      const state = await tokenManager.grantDetails()

      expect(state.latestUnlockAt).to.equal(block?.timestamp)
      expect(state.latestUnlockPrice).to.equal(price)
      expect(state.latestPrice).to.equal(0n)
    })

    it('Should can be unlocked multiple times', async function () {
      const { tokenManager, totalSupply, token, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)
      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n

      let price = 0.0004

      await completeGrant(tokenManager, grantParams_)

      await increaseTime(SIX_MONTH_IN_SECINDS)

      await tokenManager.setLatestPrice(hre.ethers.parseUnits(price.toString(), 18))
      price = price * 2
      await tokenManager.unlock(maxSecondUnlockAmount)

      expect((await token.balanceOf(await tokenManager.getAddress())) >= (totalSupply * 85n) / 100n).to.equal(true)

      await increaseTime(SIX_MONTH_IN_SECINDS)
      await tokenManager.setLatestPrice(hre.ethers.parseUnits(price.toString(), 18))
      price = price * 2
      await tokenManager.unlock(maxSecondUnlockAmount)
      expect((await token.balanceOf(await tokenManager.getAddress())) >= (totalSupply * 80n) / 100n).to.equal(true)

      await increaseTime(SIX_MONTH_IN_SECINDS)
      await tokenManager.setLatestPrice(hre.ethers.parseUnits(price.toString(), 18))
      price = price * 2
      await tokenManager.unlock(maxSecondUnlockAmount)
      expect((await token.balanceOf(await tokenManager.getAddress())) >= (totalSupply * 75n) / 100n).to.equal(true)
    })

    it('Should revert with the right error if unlock ended', async function () {
      const { tokenManager, totalSupply, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)

      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n

      await completeGrant(tokenManager, grantParams_)

      let price = 0.0004

      for (let index = 0; index < 18; index++) {
        await increaseTime(SIX_MONTH_IN_SECINDS)
        await tokenManager.setLatestPrice(hre.ethers.parseUnits(price.toString(), 18))
        price = price * 2
        await tokenManager.unlock(maxSecondUnlockAmount)
      }

      await increaseTime(SIX_MONTH_IN_SECINDS)
      await tokenManager.setLatestPrice(hre.ethers.parseUnits(price.toString(), 18))
      await expect(tokenManager.unlock(maxSecondUnlockAmount)).to.revertedWith('Unlock Ended')
    })
  })
})
