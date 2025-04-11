import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'
import { expect } from 'chai'
import { completeGrant } from './utils/completeGrant'
import hre from 'hardhat'
import { MaxUint256, parseEther, toBeHex } from 'ethers'
import { increaseTime } from './utils'
import { getRandomWallets } from '../config/wallets'

const TIME = 15_552_000 * 21 // 10 y

describe('Liquidity', function () {
  it('Should revert with the right error if params error', async function () {
    const { tokenManager, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)

    await completeGrant(tokenManager, grantParams_)

    await expect(tokenManager.unlockLP()).to.revertedWith('Not yet')
  })

  it('Should the right unlock LP', async function () {
    const { tokenManager, grantParams_, poolConfig, owner } = await loadFixture(deployTokenManagerV2Fixture)

    await completeGrant(tokenManager, grantParams_)

    await increaseTime(TIME)

    const IERC721 = await hre.ethers.getContractAt('IERC721', poolConfig.V3PositionManager)

    const receipt = await (await tokenManager.unlockLP()).wait()

    const transferEvents =
      receipt?.logs
        .map(log => {
          try {
            return IERC721.interface.parseLog(log)
          } catch (e) {
            return null
          }
        })
        .filter(event => event && event.name === 'Transfer') ?? []

    const liquidityParams = await tokenManager.liquidityParams()

    expect(transferEvents.length).to.equal(2)
    expect(transferEvents[0]?.args[0]).to.equal(poolConfig.V3LPLocker)
    expect(transferEvents[0]?.args[1]).to.equal(await tokenManager.getAddress())
    expect(transferEvents[0]?.args[2]).to.equal(liquidityParams.tokenId)

    expect(transferEvents[1]?.args[0]).to.equal(await tokenManager.getAddress())
    expect(transferEvents[1]?.args[1]).to.equal(owner.address)
    expect(transferEvents[1]?.args[2]).to.equal(liquidityParams.tokenId)
  })

  it('Should the right emit unlock LP event', async function () {
    const { tokenManager, grantParams_, poolConfig } = await loadFixture(deployTokenManagerV2Fixture)

    await completeGrant(tokenManager, grantParams_)

    await increaseTime(TIME)

    const IV3LPLocker = await hre.ethers.getContractAt('IV3LPLocker', poolConfig.V3LPLocker)

    await expect(tokenManager.unlockLP()).to.emit(IV3LPLocker, 'OnUnlock')
  })

  it('Should the right lock LP', async function () {
    const { tokenManager, owner, poolConfig } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(23)
    for (let index = 0; index < wallets.length; index++) {
      const wallet = new hre.ethers.Wallet(wallets[index])
      const signer = wallet.connect(hre.ethers.provider)

      await hre.ethers.provider.send('hardhat_setBalance', [wallet.address, toBeHex(hre.ethers.parseEther('11'))])

      await tokenManager.connect(signer).invest({
        value: parseEther('10')
      })
    }
    const IV3LPLocker = await hre.ethers.getContractAt('IV3LPLocker', poolConfig.V3LPLocker)

    await expect(
      tokenManager.connect(owner).invest({
        value: parseEther('10')
      })
    ).to.emit(IV3LPLocker, 'OnLock')
  })
})
