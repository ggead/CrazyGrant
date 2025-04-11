import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const TokenManagerV2DeployerModule = buildModule('TokenManagerV2DeployerModule', m => {
  const tokenManagerV2Deployer = m.contract('TokenManagerV2Deployer', [], {
    value: 0n,
  })

  return { tokenManagerV2Deployer }
})

export default TokenManagerV2DeployerModule
