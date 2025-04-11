import hre from 'hardhat'
import FactoryModule from '../ignition/modules/Factory'
import TokenManagerV2DeployerModule from '../ignition/modules/TokenManagerV2Deployer'
import ReaderModule from '../ignition/modules/Reader'

async function main() {
  const { reader } = await hre.ignition.deploy(ReaderModule)
  console.log(`reader deployed to: ${await reader.getAddress()}`)

  const { tokenManagerV2Deployer } = await hre.ignition.deploy(TokenManagerV2DeployerModule)
  console.log(`tokenManagerV2Deployer deployed to: ${await tokenManagerV2Deployer.getAddress()}`)

  const { factory } = await hre.ignition.deploy(FactoryModule, {
    parameters: {
      FactoryModule: {
        tokenManagerV2Deployer: await tokenManagerV2Deployer.getAddress()
      }
    }
  })
  const factoryContract = await hre.ethers.getContractAt('Factory', await factory.getAddress())
  console.log(`factory deployed to: ${await factory.getAddress()},tokenManagerV2Deployer is:${await factoryContract.tokenManagerV2Deployer()}`)

  const tokenManagerV2DeployerContract = await hre.ethers.getContractAt('TokenManagerV2Deployer', await tokenManagerV2Deployer.getAddress())
  const tx = await tokenManagerV2DeployerContract.setFactoryAddress(await factory.getAddress())
  await tx.wait()

  console.log(`Successfully set up tokenManagerV2Deployer factory to: ${await tokenManagerV2DeployerContract.factoryAddress()}`)
}

main().catch(console.error)
