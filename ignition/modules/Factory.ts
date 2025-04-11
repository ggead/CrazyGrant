import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const FactoryModule = buildModule('FactoryModule', m => {
  const protocolFeeRecipient = '0x6986F63f1d3Ade59D80edFDc91A6c194d7AdB729'
  const protocolFee = 300n // 300/10000
  const oversubscriptionMultiple = 1n

  const tokenManagerV2Deployer = m.getParameter('tokenManagerV2Deployer')

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

  const factory = m.contract(
    'Factory',
    [tokenManagerV2Deployer, protocolFeeRecipient, protocolFee, oversubscriptionMultiple, poolConfig, grantConfig],
    {
      value: 0n
    }
  )

  return { factory }
})

export default FactoryModule
