import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { expect } from 'chai'
import { parseEther, toBeHex } from 'ethers'
import { getRandomWallets } from '../config/wallets'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'
import { increaseTime, setNextBlockTimestamp } from './utils'

describe('Invest', function () {
  it('Should revert with the right error if params error', async function () {
    const { tokenManager, otherAccount } = await loadFixture(deployTokenManagerV2Fixture)

    await expect(
      tokenManager.invest({
        value: 0n
      })
    ).to.revertedWith('Invalid Value')

    await expect(
      tokenManager.invest({
        value: parseEther('10.01')
      })
    ).to.revertedWith('Exceeds User Hard Cap')

    await tokenManager.invest({
      value: parseEther('0.1')
    })

    await expect(
      tokenManager.invest({
        value: parseEther('10')
      })
    ).to.revertedWith('Exceeds User Hard Cap')

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
      tokenManager.connect(otherAccount).invest({
        value: parseEther('10')
      })
    ).to.revertedWith('Exceeds Hard Cap')
  })

  it('Should revert with the right error if ended', async function () {
    const { tokenManager } = await loadFixture(deployTokenManagerV2Fixture)

    await increaseTime(3 * 24 * 60 * 60)

    await expect(
      tokenManager.invest({
        value: parseEther('0.1')
      })
    ).to.revertedWith('Grant Ended')
  })
  it('Should revert with the right error if not start', async function () {
    const { grantParams_, poolParams_, name, symbol, totalSupply, creator, initialSupply, factory } = await loadFixture(deployTokenManagerV2Fixture)

    const TokenManager = await hre.ethers.getContractFactory('TokenManagerV2')
    const tokenManager = await TokenManager.deploy()

    const Token = await hre.ethers.getContractFactory('TokenV2')
    const token = await Token.deploy(name, symbol, await tokenManager.getAddress(), totalSupply)

    await tokenManager.initialize(
      await factory.getAddress(),
      await token.getAddress(),
      creator,
      {
        ...grantParams_,
        startAt: ((await hre.ethers.provider.getBlock('latest'))?.timestamp || grantParams_.startAt) + 1000
      },
      poolParams_
    )

    await expect(
      tokenManager.invest({
        value: parseEther('0.1')
      })
    ).to.revertedWith('Not Start')
  })
  it('Should set the right invest', async function () {
    const { tokenManager, owner } = await loadFixture(deployTokenManagerV2Fixture)

    const amount = parseEther('0.1')

    await expect(
      tokenManager.connect(owner).invest({
        value: amount
      })
    ).to.changeEtherBalances([await tokenManager.getAddress(), owner], [amount, -amount])

    expect((await tokenManager.getUserInfo(owner.address)).investAmount).to.equal(amount)
    expect(await tokenManager.getTotalInvest()).to.equal(amount)
    expect((await tokenManager.grantDetails()).investors).to.equal(1)

    const time = (await hre.ethers.provider.getBlock('latest'))!.timestamp + 100
    await setNextBlockTimestamp(time)
    await expect(
      tokenManager.connect(owner).invest({
        value: amount
      })
    )
      .to.emit(tokenManager, 'Invest')
      .withArgs(...[amount, owner.address, time])
  })
})
