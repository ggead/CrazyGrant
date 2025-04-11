import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { expect } from 'chai'
import { parseEther, toBeHex } from 'ethers'
import { getRandomWallets } from '../config/wallets'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'
import { increaseTime, setNextBlockTimestamp } from './utils'

describe('Refund', function () {
  it('Should revert with the right error if params error', async function () {
    const { tokenManager, otherAccount, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(3)
    for (let index = 0; index < wallets.length; index++) {
      const wallet = new hre.ethers.Wallet(wallets[index])
      const signer = wallet.connect(hre.ethers.provider)

      await hre.ethers.provider.send('hardhat_setBalance', [wallet.address, toBeHex(hre.ethers.parseEther('11'))])

      await tokenManager.connect(signer).invest({
        value: parseEther('10')
      })
    }
    const wallet = new hre.ethers.Wallet(wallets[0])
    const signer = wallet.connect(hre.ethers.provider)

    await expect(tokenManager.connect(signer).refund()).to.revertedWith('Grant Not Ended')

    await increaseTime(grantParams_.duration)

    await expect(tokenManager.connect(otherAccount).refund()).to.revertedWith('Non Refundable Amount')

    await tokenManager.connect(signer).refund()
    await expect(tokenManager.connect(signer).refund()).to.revertedWith('Non Refundable Amount')
  })

  it('Should revert with the right error if Grant completed', async function () {
    const { tokenManager, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(5)
    for (let index = 0; index < wallets.length; index++) {
      const wallet = new hre.ethers.Wallet(wallets[index])
      const signer = wallet.connect(hre.ethers.provider)

      await hre.ethers.provider.send('hardhat_setBalance', [wallet.address, toBeHex(hre.ethers.parseEther('11'))])

      await tokenManager.connect(signer).invest({
        value: parseEther('10')
      })
    }
    const wallet = new hre.ethers.Wallet(wallets[0])
    const signer = wallet.connect(hre.ethers.provider)

    await increaseTime(grantParams_.duration)
    await expect(tokenManager.connect(signer).refund()).to.revertedWith('Non Refundable Amount')
  })

  it('Should the right refund', async function () {
    const { tokenManager, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(4)
    for (let index = 0; index < wallets.length; index++) {
      const wallet = new hre.ethers.Wallet(wallets[index])
      const signer = wallet.connect(hre.ethers.provider)

      await hre.ethers.provider.send('hardhat_setBalance', [wallet.address, toBeHex(hre.ethers.parseEther('11'))])

      await tokenManager.connect(signer).invest({
        value: parseEther('10')
      })
    }

    await increaseTime(grantParams_.duration)
    const wallet = new hre.ethers.Wallet(wallets[0])
    const signer = wallet.connect(hre.ethers.provider)

    const time = (await hre.ethers.provider.getBlock('latest'))!.timestamp + 100
    await setNextBlockTimestamp(time)

    await expect(tokenManager.connect(signer).refund())
      .to.emit(tokenManager, 'Refunded')
      .withArgs(...[parseEther('10'), signer.address, time])

    expect((await tokenManager.getUserInfo(signer.address)).refunded).to.equal(true)
  })

  it('Should the right refund transfer', async function () {
    const { tokenManager, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(4)
    for (let index = 0; index < wallets.length; index++) {
      const wallet = new hre.ethers.Wallet(wallets[index])
      const signer = wallet.connect(hre.ethers.provider)

      await hre.ethers.provider.send('hardhat_setBalance', [wallet.address, toBeHex(hre.ethers.parseEther('11'))])

      await tokenManager.connect(signer).invest({
        value: parseEther('10')
      })
    }

    await increaseTime(grantParams_.duration)
    const wallet = new hre.ethers.Wallet(wallets[0])
    const signer = wallet.connect(hre.ethers.provider)

    const time = (await hre.ethers.provider.getBlock('latest'))!.timestamp + 100
    await setNextBlockTimestamp(time)

    await expect(tokenManager.connect(signer).refund()).to.changeEtherBalances([tokenManager, signer], [-parseEther('10'), parseEther('10')])
  })
})
