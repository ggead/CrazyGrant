import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { expect } from 'chai'
import { parseEther, toBeHex } from 'ethers'
import { getRandomWallets } from '../config/wallets'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'
import { increaseTime, setNextBlockTimestamp } from './utils'

describe('Claim', function () {
  it('Should revert with the right error if params error', async function () {
    const { tokenManager, otherAccount, grantParams_ } = await loadFixture(deployTokenManagerV2Fixture)

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

    await expect(tokenManager.connect(signer).claim()).to.revertedWith('Grant Not Completed')
    await increaseTime(grantParams_.duration)
    await expect(tokenManager.connect(otherAccount).claim()).to.revertedWith('Non Claimble Amount')
  })

  it('Should the right claim', async function () {
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

    await increaseTime(grantParams_.duration)
    const wallet = new hre.ethers.Wallet(wallets[0])
    const signer = wallet.connect(hre.ethers.provider)

    const time = (await hre.ethers.provider.getBlock('latest'))!.timestamp + 100
    await setNextBlockTimestamp(time)

    const _userInfo = await tokenManager.getUserInfo(signer.address)
    const _totalInvest = await tokenManager.getTotalInvest()
    const _myAllocation = (_userInfo.investAmount * grantParams_.rigidCapAmount) / _totalInvest
    const _myAllocationToken = (_myAllocation * 10n ** 18n) / grantParams_.price

    await expect(tokenManager.connect(signer).claim())
      .to.emit(tokenManager, 'Claimed')
      .withArgs(...[_myAllocationToken, parseEther('0.4'), signer.address, time])

    expect((await tokenManager.getUserInfo(signer.address)).claimed).to.equal(true)
  })

  it('Should the right claim transfer', async function () {
    const { tokenManager, grantParams_, token } = await loadFixture(deployTokenManagerV2Fixture)

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

    const wallet2 = new hre.ethers.Wallet(wallets[1])
    const signer2 = wallet2.connect(hre.ethers.provider)

    const time = (await hre.ethers.provider.getBlock('latest'))!.timestamp + 100
    await setNextBlockTimestamp(time)

    const _userInfo = await tokenManager.getUserInfo(signer.address)
    const _totalInvest = await tokenManager.getTotalInvest()
    const _myAllocation = (_userInfo.investAmount * grantParams_.rigidCapAmount) / _totalInvest
    const _myAllocationToken = (_myAllocation * 10n ** 18n) / grantParams_.price

    // @todo Contains the BNB for initializing the pool & fee
    await expect(tokenManager.connect(signer).claim()).to.changeEtherBalances(
      [tokenManager, signer],
      [-(parseEther('0.4') + parseEther('24') + parseEther('1.44')), parseEther('0.4')]
    )
    await expect(tokenManager.connect(signer2).claim()).to.changeTokenBalances(
      token,
      [tokenManager, signer2],
      [-_myAllocationToken, _myAllocationToken]
    )
  })
})
