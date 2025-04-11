import { parseEther, toBeHex } from 'ethers'
import { getRandomWallets } from '../../config/wallets'
import { TokenManagerV2 } from '../../typechain-types'
import hre from 'hardhat'
import { increaseTime } from '.'

export async function completeGrant(
  tokenManager: TokenManagerV2,
  grantParams: {
    price: bigint
    rigidCapAmount: bigint
    userRigidCapAmount: bigint
    startAt: number
    duration: number
  }
) {
  const wallets = getRandomWallets(5)
  for (let index = 0; index < wallets.length; index++) {
    const wallet = new hre.ethers.Wallet(wallets[index])
    const signer = wallet.connect(hre.ethers.provider)

    await hre.ethers.provider.send('hardhat_setBalance', [wallet.address, toBeHex(hre.ethers.parseEther('11'))])

    await tokenManager.connect(signer).invest({
      value: parseEther('10')
    })
  }

  await increaseTime(grantParams.duration)

  for (let index = 0; index < wallets.length; index++) {
    const wallet = new hre.ethers.Wallet(wallets[index])
    const signer = wallet.connect(hre.ethers.provider)

    await tokenManager.connect(signer).claim()
  }

  await tokenManager.withdrawalGrantFund()
}
