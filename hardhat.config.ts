import { HardhatUserConfig, vars } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-ignition-ethers'

const WALLET_PRIVATE_KEY = vars.get('WALLET_PRIVATE_KEY')

const accounts = WALLET_PRIVATE_KEY !== undefined ? [WALLET_PRIVATE_KEY] : []

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: '0.7.6' }],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    },
    overrides: {
      'contracts/TokenManagerV2.sol': {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 100
          }
        }
      },
      'contracts/TokenManagerV2Deployer.sol': {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 50
          }
        }
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: 'https://bnb-mainnet.g.alchemy.com/v2/k0eC4sokRXa5hyw0Gu2jUsZpiToqeXAQ',
        blockNumber: 47858465
      }
    },
    Sepolia: {
      url: 'https://1rpc.io/sepolia',
      accounts: accounts
    },
    BSCTestnet: {
      url: 'https://data-seed-prebsc-2-s1.bnbchain.org:8545',
      accounts: accounts
    }
  }
}

export default config
