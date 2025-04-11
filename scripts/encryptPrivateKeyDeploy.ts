import { Wallet } from 'ethers'
import hre from 'hardhat'
import { AESUtil } from '../utils/aes.util'
import promptInput from '../utils/promptInput'
import 'dotenv/config'

const protocolFeeRecipient = '0x6986F63f1d3Ade59D80edFDc91A6c194d7AdB729'
const protocolFee = 300n // 300/10000
const oversubscriptionMultiple = 1n
const poolConfig = {
  tickLower: -887250,
  tickUpper: 887250,
  WBNB: '0x094616f0bdfb0b526bd735bf66eca0ad254ca81f',
  V3factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
  V3PositionManager: '0x427bF5b37357632377eCbEC9de3626C71A5396c1',
  V3LPLocker: '0x25c9C4B56E820e0DEA438b145284F02D9Ca9Bd52'
}
const grantConfig = {
  poolAmountBNBPercent: 3000, // 30%
  poolAmountTokenPercent: 150, // 1.5%
  duration: 2 * 24 * 60 * 60, // 2days
  enableTokenReserve: false
} as const

async function main() {
  const password = await promptInput()

  const provider = hre.ethers.provider
  const signer = new Wallet(AESUtil.decrypt(process.env.WALLET_PRIVATE_KEY!, password)).connect(provider)

  const TokenManagerV2Deployer = await hre.ethers.getContractFactory('TokenManagerV2Deployer', signer)
  const tokenManagerV2Deployer = await TokenManagerV2Deployer.deploy()
  await tokenManagerV2Deployer.waitForDeployment()
  console.log(`tokenManagerV2Deployer deployed to: ${await tokenManagerV2Deployer.getAddress()}`)

  const Factory = await hre.ethers.getContractFactory('Factory', signer)
  const factory = await Factory.deploy(
    await tokenManagerV2Deployer.getAddress(),
    protocolFeeRecipient,
    protocolFee,
    oversubscriptionMultiple,
    poolConfig,
    grantConfig
  )
  await factory.waitForDeployment()
  console.log(`factory deployed to: ${await factory.getAddress()},tokenManagerV2Deployer is:${await tokenManagerV2Deployer.getAddress()}`)

  const Reader = await hre.ethers.getContractFactory('Reader', signer)
  const reader = await Reader.deploy()
  await reader.waitForDeployment()
  console.log(`reader deployed to: ${await reader.getAddress()}`)

  const factoryAddress = await factory.getAddress()
  const tx = await tokenManagerV2Deployer.setFactoryAddress(factoryAddress)
  await tx.wait()

  console.log(`Successfully set up tokenManagerV2Deployer factory to: ${await tokenManagerV2Deployer.factoryAddress()}`)
}

main().catch(console.error)
