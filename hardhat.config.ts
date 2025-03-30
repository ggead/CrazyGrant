import { HardhatUserConfig, vars } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

const WALLET_PRIVATE_KEY = vars.get('WALLET_PRIVATE_KEY')

const accounts = WALLET_PRIVATE_KEY !== undefined ? [WALLET_PRIVATE_KEY] : []

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: '0.8.24' }]
  },
  networks: {
    Sepolia: {
      url: 'https://1rpc.io/sepolia',
      accounts: accounts
    },
    BSCTestnet: {
      url: 'https://bsc-testnet.4everland.org/v1/37fa9972c1b1cd5fab542c7bdd4cde2f',
      accounts: accounts
    }
  }
}

export default config
