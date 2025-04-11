import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { expect } from 'chai'
import { parseEther, ZeroAddress } from 'ethers'

describe('Token', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployTokenFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners()

    const name = 'CRAZY GRANT'
    const symbol = 'CRAZY'
    const creator = owner.address
    const totalSupply = 1_000_000_000n * 10n ** 18n

    const Token = await hre.ethers.getContractFactory('TokenV2')
    const token = await Token.deploy(name, symbol, creator, totalSupply)

    return {
      token,
      name,
      symbol,
      totalSupply,
      owner,
      otherAccount,
      creator
    }
  }

  describe('Token', function () {
    it('Should set the right token', async function () {
      const { token, symbol, name, totalSupply, otherAccount } = await loadFixture(deployTokenFixture)

      expect(await token.symbol()).to.equal(symbol)
      expect(await token.name()).to.equal(name)
      expect(await token.totalSupply()).to.equal(totalSupply)

      expect(await token.burn(1n)).to.be.revertedWith('ERC20: burn amount exceeds balance')
      expect(await token.transfer(otherAccount.address, 1n)).to.revertedWith('ERC20: transfer amount exceeds balance')
    })
  })
})
