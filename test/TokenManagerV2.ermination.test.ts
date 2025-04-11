import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { parseEther } from 'ethers'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'
import { increaseTime, setNextBlockTimestamp } from './utils'
import { expect } from 'chai'
import { completeGrant } from './utils/completeGrant'

describe('Ermination', function () {
  it('Should revert with the right error if grant complete', async function () {
    const { tokenManager, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)

    await completeGrant(tokenManager, grantParams_)
    await expect(tokenManager.setTermination()).to.revertedWith('Termination is not supported')
  })

  it('Should revert with the right error if grant ended', async function () {
    const { tokenManager, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)

    await increaseTime(grantParams_.duration)

    await expect(tokenManager.setTermination()).to.revertedWith('Termination is not supported')
  })

  it('Should the right ermination', async function () {
    const { tokenManager } = await loadFixture(deployTokenManagerV2Fixture)

    await tokenManager.invest({
      value: parseEther('0.1')
    })

    const time = (await hre.ethers.provider.getBlock('latest'))!.timestamp + 100
    setNextBlockTimestamp(time)

    await expect(tokenManager.setTermination())
      .to.emit(tokenManager, 'SetTermination')
      .withArgs(...[time])

    expect(await tokenManager.termination()).to.equals(true)

    await expect(tokenManager.claim()).to.revertedWith('Grant Not Completed')
    await expect(tokenManager.refund()).to.emit(tokenManager, 'Refunded')
  })
})
