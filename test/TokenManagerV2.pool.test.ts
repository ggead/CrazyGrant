import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { expect } from 'chai'
import { parseEther, toBeHex, ZeroAddress } from 'ethers'
import { getRandomWallets } from '../config/wallets'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'
import { increaseTime } from './utils'

describe('Pool', function () {
  it('Should set the right pancake pool if grant success', async function () {
    const { tokenManager, owner } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(23)
    for (let index = 0; index < wallets.length; index++) {
      const wallet = new hre.ethers.Wallet(wallets[index])
      const signer = wallet.connect(hre.ethers.provider)

      await hre.ethers.provider.send('hardhat_setBalance', [wallet.address, toBeHex(hre.ethers.parseEther('11'))])

      await tokenManager.connect(signer).invest({
        value: parseEther('10')
      })
    }

    await expect(
      tokenManager.connect(owner).invest({
        value: parseEther('10')
      })
    ).to.emit(tokenManager, 'LiquidityAdded')

    expect((await tokenManager.liquidityParams()).tokenId).to.not.equal(0n)
    expect((await tokenManager.liquidityParams()).liquidity).to.not.equal(0n)
    expect(await tokenManager.poolInitialized()).to.equal(true)
    expect(await tokenManager.poolAddress()).to.not.equal(ZeroAddress)
  })

  it('Should set the right pancake pool if grant end', async function () {
    const { tokenManager } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(10)
    for (let index = 0; index < wallets.length; index++) {
      const wallet = new hre.ethers.Wallet(wallets[index])
      const signer = wallet.connect(hre.ethers.provider)

      await hre.ethers.provider.send('hardhat_setBalance', [wallet.address, toBeHex(hre.ethers.parseEther('11'))])

      await tokenManager.connect(signer).invest({
        value: parseEther('10')
      })
    }

    await increaseTime(3 * 24 * 60 * 60)

    const wallet = new hre.ethers.Wallet(wallets[0])
    const signer = wallet.connect(hre.ethers.provider)

    await expect(tokenManager.connect(signer).claim()).to.emit(tokenManager, 'LiquidityAdded')

    expect((await tokenManager.liquidityParams()).tokenId).to.not.equal(0n)
    expect((await tokenManager.liquidityParams()).liquidity).to.not.equal(0n)
    expect(await tokenManager.poolInitialized()).to.equal(true)
    expect(await tokenManager.poolAddress()).to.not.equal(ZeroAddress)
  })

  it('Should set the right transfer fee', async function () {
    const { tokenManager, owner, protocolFeeRecipient } = await loadFixture(deployTokenManagerV2Fixture)

    const wallets = getRandomWallets(23)
    for (let index = 0; index < wallets.length; index++) {
      const wallet = new hre.ethers.Wallet(wallets[index])
      const signer = wallet.connect(hre.ethers.provider)

      await hre.ethers.provider.send('hardhat_setBalance', [wallet.address, toBeHex(hre.ethers.parseEther('11'))])

      await tokenManager.connect(signer).invest({
        value: parseEther('10')
      })
    }

    await expect(
      tokenManager.connect(owner).invest({
        value: parseEther('10')
      })
    ).to.changeEtherBalance(protocolFeeRecipient, parseEther('1.44'))
  })
})
