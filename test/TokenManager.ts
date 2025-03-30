import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { expect } from 'chai'

const SIX_MONTH_IN_SECINDS = 15_552_000

describe('TokenManager', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployTokenManagerFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners()

    const name = 'CRAZY GRANT'
    const symbol = 'CRAZY'
    const creator = owner.address
    const totalSupply = 1_000_000_000n * 10n ** 18n
    const initialPrice = hre.ethers.parseUnits('0.000164', 30) // $0.1 BNB

    const TokenManager = await hre.ethers.getContractFactory('TokenManager')
    const tokenManager = await TokenManager.deploy()

    const tx = await tokenManager.initialize(name, symbol, creator, totalSupply, initialPrice)
    const block = await tx.getBlock()

    const token = await hre.ethers.getContractAt('Token', await tokenManager.token())

    return {
      tokenManager,
      token,
      name,
      symbol,
      totalSupply,
      initialPrice,
      owner,
      otherAccount,
      block,
      creator
    }
  }

  describe('Deployment', function () {
    it('Should set the right initialize', async function () {
      const { tokenManager, creator, name, symbol, totalSupply, initialPrice } = await loadFixture(deployTokenManagerFixture)

      await expect(tokenManager.initialize(name, symbol, creator, totalSupply, initialPrice)).to.revertedWithCustomError(tokenManager, 'Initialized')
    })
  })

  describe('Params', function () {
    it('Should set the right params', async function () {
      const { tokenManager, token, owner, creator, initialPrice, totalSupply, block } = await loadFixture(deployTokenManagerFixture)

      expect((await tokenManager.getState()).initialized).to.equal(true)
      expect((await tokenManager.getState()).creator).to.equal(creator)
      expect((await tokenManager.getState()).initialPrice).to.equal(initialPrice)
      expect((await tokenManager.getState()).initialSupply).to.equal(totalSupply)

      expect((await tokenManager.getState()).latestUnlockPrice).to.equal(initialPrice)
      expect((await tokenManager.getState()).latestPrice).to.equal(0n)

      expect((await tokenManager.getState()).createAt).to.equal(block?.timestamp)
      expect((await tokenManager.getState()).latestUnlockAt).to.equal(block?.timestamp)

      const firstUnlockAmount = (totalSupply * 10n) / 100n

      expect(await token.balanceOf(creator)).to.equal(firstUnlockAmount)

      expect(await token.balanceOf(await tokenManager.getAddress())).to.equal((totalSupply * 90n) / 100n)
    })
  })

  describe('Token', function () {
    it('Should set the right token', async function () {
      const { token, symbol, name, totalSupply, otherAccount } = await loadFixture(deployTokenManagerFixture)

      expect(await token.symbol()).to.equal(symbol)
      expect(await token.name()).to.equal(name)
      expect(await token.totalSupply()).to.equal(totalSupply)

      expect(await token.burn(1n)).to.be.revertedWith('ERC20: burn amount exceeds balance')
      expect(await token.transfer(otherAccount.address, 1n)).to.revertedWithCustomError(token, 'ERC20InsufficientBalance')
    })
  })

  describe('Price', function () {
    it('Should revert with the right error if time not reached', async function () {
      const { tokenManager } = await loadFixture(deployTokenManagerFixture)

      const targetPrice = hre.ethers.parseUnits('0.0004', 30)

      await expect(tokenManager.setLatestPrice(targetPrice)).to.revertedWithCustomError(tokenManager, 'LockPeriodNotExpired')
    })

    it('Should set the right price', async function () {
      const { tokenManager } = await loadFixture(deployTokenManagerFixture)

      const targetPrice = hre.ethers.parseUnits('0.0004', 30)

      await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
      await hre.ethers.provider.send('evm_mine', [])

      await expect(tokenManager.setLatestPrice(targetPrice))
        .to.emit(tokenManager, 'LatestPriceChange')
        .withArgs(...[targetPrice])
      expect((await tokenManager.getState()).latestPrice).to.equal(targetPrice)
    })
  })

  describe('Unlock', function () {
    it('Should revert with the right error if params error', async function () {
      const { tokenManager, totalSupply, otherAccount } = await loadFixture(deployTokenManagerFixture)

      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n

      await expect(tokenManager.unlock(maxSecondUnlockAmount)).to.revertedWithCustomError(tokenManager, 'LockPeriodNotExpired')

      await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
      await hre.ethers.provider.send('evm_mine', [])

      await expect(tokenManager.unlock(maxSecondUnlockAmount)).to.revertedWithCustomError(tokenManager, 'UnlockPriceNotYetReached')

      await tokenManager.setLatestPrice(hre.ethers.parseUnits('0.0004', 30))

      await expect(tokenManager.unlock(maxSecondUnlockAmount + 1n)).to.revertedWithCustomError(tokenManager, 'ExceedsUnlockLimit')

      await expect(tokenManager.connect(otherAccount).unlock(maxSecondUnlockAmount)).to.revertedWithCustomError(tokenManager, 'OnlyCreator')
    })

    it('Should emit an event on unlock', async function () {
      const { tokenManager, totalSupply, owner, token } = await loadFixture(deployTokenManagerFixture)
      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n

      await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
      await hre.ethers.provider.send('evm_mine', [])

      await tokenManager.setLatestPrice(hre.ethers.parseUnits('0.0004', 30))

      await expect(tokenManager.unlock(maxSecondUnlockAmount))
        .to.emit(token, 'Transfer')
        .withArgs(...[await tokenManager.getAddress(), owner.address, maxSecondUnlockAmount])
        .to.emit(tokenManager, 'Unlock')
    })

    it('Should transfer the funds to creator', async function () {
      const { tokenManager, totalSupply, creator, token } = await loadFixture(deployTokenManagerFixture)
      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n

      await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
      await hre.ethers.provider.send('evm_mine', [])

      await tokenManager.setLatestPrice(hre.ethers.parseUnits('0.0004', 30))

      await expect(tokenManager.unlock(maxSecondUnlockAmount)).to.changeTokenBalances(
        token,
        [await tokenManager.getAddress(), creator],
        [-maxSecondUnlockAmount, maxSecondUnlockAmount]
      )
    })

    it('Should burn token if unlocking not according to the maximum number', async function () {
      const { tokenManager, totalSupply, creator, token } = await loadFixture(deployTokenManagerFixture)
      const secondUnlockAmount = (totalSupply * 3n) / 100n
      const burnAmount = (totalSupply * 2n) / 100n

      await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
      await hre.ethers.provider.send('evm_mine', [])

      await tokenManager.setLatestPrice(hre.ethers.parseUnits('0.0004', 30))

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
      const { tokenManager, totalSupply } = await loadFixture(deployTokenManagerFixture)
      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n
      const price = hre.ethers.parseUnits('0.0004', 30)

      await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
      await hre.ethers.provider.send('evm_mine', [])

      await tokenManager.setLatestPrice(price)

      const tx = await tokenManager.unlock(maxSecondUnlockAmount)
      const block = await tx.getBlock()

      const state = await tokenManager.getState()

      expect(state.latestUnlockAt).to.equal(block?.timestamp)
      expect(state.latestUnlockPrice).to.equal(price)
      expect(state.latestPrice).to.equal(0n)
    })

    it('Should can be unlocked multiple times', async function () {
      const { tokenManager, totalSupply, token } = await loadFixture(deployTokenManagerFixture)
      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n

      let price = 0.0004

      await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
      await hre.ethers.provider.send('evm_mine', [])
      await tokenManager.setLatestPrice(hre.ethers.parseUnits(price.toString(), 30))
      price = price * 2
      await tokenManager.unlock(maxSecondUnlockAmount)

      expect(await token.balanceOf(await tokenManager.getAddress())).to.equal((totalSupply * 85n) / 100n)

      await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
      await hre.ethers.provider.send('evm_mine', [])
      await tokenManager.setLatestPrice(hre.ethers.parseUnits(price.toString(), 30))
      price = price * 2
      await tokenManager.unlock(maxSecondUnlockAmount)
      expect(await token.balanceOf(await tokenManager.getAddress())).to.equal((totalSupply * 80n) / 100n)

      await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
      await hre.ethers.provider.send('evm_mine', [])
      await tokenManager.setLatestPrice(hre.ethers.parseUnits(price.toString(), 30))
      price = price * 2
      await tokenManager.unlock(maxSecondUnlockAmount)
      expect(await token.balanceOf(await tokenManager.getAddress())).to.equal((totalSupply * 75n) / 100n)
    })

    it('Should revert with the right error if unlock ended', async function () {
      const { tokenManager, totalSupply } = await loadFixture(deployTokenManagerFixture)

      const maxSecondUnlockAmount = (totalSupply * 5n) / 100n

      let price = 0.0004

      for (let index = 0; index < 18; index++) {
        await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
        await hre.ethers.provider.send('evm_mine', [])
        await tokenManager.setLatestPrice(hre.ethers.parseUnits(price.toString(), 30))
        price = price * 2
        await tokenManager.unlock(maxSecondUnlockAmount)
      }

      await hre.ethers.provider.send('evm_increaseTime', [SIX_MONTH_IN_SECINDS])
      await hre.ethers.provider.send('evm_mine', [])

      await tokenManager.setLatestPrice(hre.ethers.parseUnits(price.toString(), 30))
      await expect(tokenManager.unlock(maxSecondUnlockAmount)).to.revertedWithCustomError(tokenManager, 'UnlockEnded')
    })
  })
})
