import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { expect } from 'chai'
import { parseEther, toBeHex, ZeroAddress } from 'ethers'
import { getRandomWallets } from '../config/wallets'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'
import { increaseTime, setNextBlockTimestamp } from './utils'

describe('Withdrawal', function () {
  it('Should revert with the right error if params error', async function () {
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

    await expect(tokenManager.withdrawalGrantFund()).to.revertedWith('Requires pool to initialized')

    await tokenManager.invest({
      value: parseEther('10')
    })
    await increaseTime(grantParams_.duration)

    const wallet = new hre.ethers.Wallet(wallets[0])
    const signer = wallet.connect(hre.ethers.provider)
    await tokenManager.connect(signer).claim()
    await expect(tokenManager.connect(signer).withdrawalGrantFund()).to.revertedWith('Only Creator')

    await tokenManager.withdrawalGrantFund()

    await expect(tokenManager.withdrawalGrantFund()).to.revertedWith('Funds have been withdrawn')
  })

  it('Should the right withdrawal', async function () {
    const { tokenManager, grantParams_, initialSupply } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(5)
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
    await tokenManager.connect(signer).claim()

    const time = (await hre.ethers.provider.getBlock('latest'))!.timestamp + 100
    await setNextBlockTimestamp(time)
    await expect(tokenManager.withdrawalGrantFund())
      .to.emit(tokenManager, 'WithdrawnGrantFund')
      .withArgs(...[84707317073170731707317074n, parseEther('24') - (await tokenManager.getFee()), time])
  })

  it('Should the right withdrawal transfer', async function () {
    const { tokenManager, owner, token, grantParams_, initialSupply } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(5)
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
    await tokenManager.connect(signer).claim()

    const amount = parseEther('24') - (await tokenManager.getFee())
    await expect(tokenManager.withdrawalGrantFund())
      .to.changeEtherBalances([tokenManager, owner], [-amount, amount])
  })

  it('Should the right withdrawal transfer token', async function () {
    const { tokenManager, owner, token, grantParams_, initialSupply } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(5)
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
    await tokenManager.connect(signer).claim()

    const amount = 84707317073170731707317074n
    await expect(tokenManager.withdrawalGrantFund()).to.changeTokenBalances(token, [tokenManager, owner], [-amount, amount])
  })
})
