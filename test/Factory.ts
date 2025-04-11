import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import hre from 'hardhat'
import { expect } from 'chai'
import deployTokenManagerV2Fixture from './utils/deployTokenManagerV2Fixture'
import { formatEther, parseEther } from 'ethers'
import calculatePrice from '../utils/CalculatePrice'

describe('Factory', function () {
  it('Should revert with the right error if params error', async function () {
    const { factory, owner, otherAccount, oversubscriptionMultiple, protocolFeeRecipient, V3LPLocker, poolConfig, grantConfig } = await loadFixture(
      deployTokenManagerV2Fixture
    )

    expect(await factory.protocolFee()).to.equal(300n)
    expect(await factory.protocolFeeRecipient()).to.equal(protocolFeeRecipient)
    expect(await factory.oversubscriptionMultiple()).to.equal(oversubscriptionMultiple)
    expect((await factory.poolConfig()).V3LPLocker).to.equal(V3LPLocker)
    expect((await factory.poolConfig()).WBNB).to.equal(poolConfig.WBNB)
    expect((await factory.poolConfig()).V3PositionManager).to.equal(poolConfig.V3PositionManager)
    expect((await factory.poolConfig()).V3factory).to.equal(poolConfig.V3factory)
    expect((await factory.poolConfig()).tickLower).to.equal(poolConfig.tickLower)
    expect((await factory.poolConfig()).tickUpper).to.equal(poolConfig.tickUpper)

    expect((await factory.grantConfig()).duration).to.equal(grantConfig.duration)
    expect((await factory.grantConfig()).enableTokenReserve).to.equal(grantConfig.enableTokenReserve)
    expect((await factory.grantConfig()).poolAmountBNBPercent).to.equal(grantConfig.poolAmountBNBPercent)
    expect((await factory.grantConfig()).poolAmountTokenPercent).to.equal(grantConfig.poolAmountTokenPercent)

    await expect(factory.connect(otherAccount).setOversubscriptionMultiple(2)).to.revertedWith('Ownable: caller is not the owner')
    await expect(factory.connect(otherAccount).setProtocolFee(200)).to.revertedWith('Ownable: caller is not the owner')
    await expect(factory.connect(otherAccount).setProtocolFeeRecipient(owner.address)).to.revertedWith('Ownable: caller is not the owner')
    await expect(factory.connect(otherAccount).setPoolConfig(poolConfig)).to.revertedWith('Ownable: caller is not the owner')
    await expect(factory.connect(otherAccount).setGrantConfig(grantConfig)).to.revertedWith('Ownable: caller is not the owner')
  })

  it('Should the right set params', async function () {
    const { factory, otherAccount } = await loadFixture(deployTokenManagerV2Fixture)

    await expect(factory.setOversubscriptionMultiple(2))
      .to.emit(factory, 'SetOversubscriptionMultiple')
      .withArgs(...[2n])

    expect(await factory.oversubscriptionMultiple()).to.equal(2n)

    await expect(factory.setProtocolFee(200))
      .to.emit(factory, 'SetProtocolFee')
      .withArgs(...[200n])

    expect(await factory.protocolFee()).to.equal(200n)

    await expect(factory.setProtocolFeeRecipient(otherAccount.address))
      .to.emit(factory, 'SetProtocolFeeRecipient')
      .withArgs(...[otherAccount.address])

    expect(await factory.protocolFeeRecipient()).to.equal(otherAccount.address)

    const newPoolConfig = {
      WBNB: '0x000000000000000000000000000000000000dEaD',
      V3factory: '0x000000000000000000000000000000000000dEaD',
      V3PositionManager: '0x000000000000000000000000000000000000dEaD',
      V3LPLocker: '0x000000000000000000000000000000000000dEaD',
      tickLower: -87250,
      tickUpper: 88250
    }

    await expect(factory.setPoolConfig(newPoolConfig)).to.emit(factory, 'SetPoolConfig')

    expect((await factory.poolConfig()).V3LPLocker).to.equal(newPoolConfig.V3LPLocker)
    expect((await factory.poolConfig()).WBNB).to.equal(newPoolConfig.WBNB)
    expect((await factory.poolConfig()).V3PositionManager).to.equal(newPoolConfig.V3PositionManager)
    expect((await factory.poolConfig()).V3factory).to.equal(newPoolConfig.V3factory)
    expect((await factory.poolConfig()).tickLower).to.equal(newPoolConfig.tickLower)
    expect((await factory.poolConfig()).tickUpper).to.equal(newPoolConfig.tickUpper)
  })

  it('Should the right create grant', async function () {
    const { factory, name, symbol, creator, totalSupply, grantParams_, grantConfig, poolParams_ } = await loadFixture(deployTokenManagerV2Fixture)

    await factory.setGrantConfig({
      ...grantConfig,
      enableTokenReserve: false
    })

    const CreateGrantParams = {
      logo: '124',
      desc: '344',
      link: '3432',
      name: name,
      symbol: symbol,
      creator,
      totalSupply,
      grantParams: {
        price: calculatePrice(hre.ethers.parseEther('48'), hre.ethers.parseEther('85000000')),
        rigidCapAmount: hre.ethers.parseEther('48'),
        userRigidCapAmount: hre.ethers.parseEther('10'),
        startAt: (await hre.ethers.provider.getBlock('latest'))?.timestamp || parseInt((new Date().getTime() / 1000).toString())
      },
      poolParams: poolParams_
    }

    await expect(factory.createGrant(CreateGrantParams)).to.emit(factory, 'GrantCreated')

    const grant = await factory.grants(1)

    expect(await factory.grantId()).to.equal(1n)
    expect(grant.id).to.equal(1n)

    const token = await hre.ethers.getContractAt('TokenManagerV2', grant.manager)

    expect(await token.factory()).to.equal(await factory.getAddress())
  })
})
