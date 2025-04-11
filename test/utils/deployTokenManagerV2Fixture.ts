import { parseEther } from 'ethers'
import hre from 'hardhat'

export default async function deployTokenManagerV2Fixture() {
  // Contracts are deployed using the first signer/account by default
  const [owner, otherAccount, protocolFeeRecipient] = await hre.ethers.getSigners()

  const name = 'CRAZY GRANT'
  const symbol = 'CRAZY'
  const creator = owner.address
  const totalSupply = 1_000_000_000n * 10n ** 18n
  const initialSupply = (totalSupply * 10n) / 100n
  const initialPrice = hre.ethers.parseUnits('0.000164', 18) // BNB
  const protocolFee = 300n // 300/10000
  const oversubscriptionMultiple = 5n

  const TokenManager = await hre.ethers.getContractFactory('TokenManagerV2')
  const tokenManager = await TokenManager.deploy()

  const TokenManagerV2Deployer = await hre.ethers.getContractFactory('TokenManagerV2Deployer')
  const tokenManagerV2Deployer = await TokenManagerV2Deployer.deploy()

  const V3LPLocker = '0x25c9C4B56E820e0DEA438b145284F02D9Ca9Bd52'

  const poolConfig = {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    V3factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
    V3PositionManager: '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364',
    V3LPLocker: V3LPLocker,
    tickLower: -887250,
    tickUpper: 887250
  } as const

  const grantConfig = {
    poolAmountBNBPercent: 3000, // 30%
    poolAmountTokenPercent: 150, // 1.5%
    duration: 2 * 24 * 60 * 60, // 2days
    enableTokenReserve: true
  } as const

  const Factory = await hre.ethers.getContractFactory('Factory')
  const factory = await Factory.deploy(
    await tokenManagerV2Deployer.getAddress(),
    protocolFeeRecipient,
    protocolFee,
    oversubscriptionMultiple,
    poolConfig,
    grantConfig
  )

  await tokenManagerV2Deployer.setFactoryAddress(await factory.getAddress())

  const Token = await hre.ethers.getContractFactory('TokenV2')
  const token = await Token.deploy(name, symbol, await tokenManager.getAddress(), totalSupply)

  const Reader = await hre.ethers.getContractFactory('Reader')
  const reader = await Reader.deploy()

  const grantParams_ = {
    price: initialPrice,
    rigidCapAmount: hre.ethers.parseEther('48'),
    userRigidCapAmount: hre.ethers.parseEther('10'),
    startAt: (await hre.ethers.provider.getBlock('latest'))?.timestamp || parseInt((new Date().getTime() / 1000).toString()),
    duration: 3 * 24 * 60 * 60
  }
  const poolParams_ = {
    ...poolConfig,
    V3LPTradingFee: 100,
    amountToken: (initialSupply * 15n) / 100n, // 15,000,000
    amountBNB: parseEther('24')
  }

  const tx = await tokenManager.initialize(await factory.getAddress(), await token.getAddress(), creator, grantParams_, poolParams_)
  const block = await tx.getBlock()

  return {
    tokenManager,
    token,
    name,
    symbol,
    totalSupply,
    initialSupply,
    grantParams_,
    poolParams_,
    owner,
    otherAccount,
    block,
    creator,
    tokenManagerV2Deployer,
    factory,
    protocolFeeRecipient,
    protocolFee,
    oversubscriptionMultiple,
    reader,
    V3LPLocker,
    poolConfig,
    grantConfig
  }
}
