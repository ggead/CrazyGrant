import hre from 'hardhat'

export async function increaseTime(params: number | bigint) {
  await hre.network.provider.send('evm_increaseTime', [params])
  await hre.network.provider.send('evm_mine', [])
}

export async function setNextBlockTimestamp(params: number | bigint) {
  await hre.ethers.provider.send('evm_setNextBlockTimestamp', [params])
}
