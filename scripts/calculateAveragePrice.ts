import { ethers } from 'ethers'
import { subDays, format, eachDayOfInterval } from 'date-fns'

// @todo use Infura
const BSC_RPC_URL = 'https://bsc-dataseed1.ninicoin.io'
// "https://bsc-dataseed1.defibit.io/"
// "https://bsc-dataseed1.ninicoin.io/"

const PANCAKE_V3_POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)'
]

interface HistoricalPrice {
  date: string
  priceToken0: number
  priceToken1: number
}

async function getHistoricalBlockNumber(provider: ethers.JsonRpcProvider, targetDate: Date): Promise<number> {
  const targetTimestamp = Math.floor(targetDate.getTime() / 1000)
  const currentBlock = await provider.getBlockNumber()
  const currentBlockData = await provider.getBlock(currentBlock)

  const avgBlockTime = 3

  if (!currentBlockData) {
    throw new Error('get block error')
  }

  const timeDiff = currentBlockData.timestamp - targetTimestamp
  const blockDiff = Math.floor(timeDiff / avgBlockTime)

  return Math.max(0, currentBlock - blockDiff)
}

async function getHistoricalPrices(
  provider: ethers.JsonRpcProvider,
  poolAddress: string,
  token0Decimals: number,
  token1Decimals: number,
  targetDate: Date
): Promise<{ priceToken0: number; priceToken1: number }> {
  try {
    const historicalBlock = await getHistoricalBlockNumber(provider, targetDate)
    const poolContract = new ethers.Contract(poolAddress, PANCAKE_V3_POOL_ABI, provider)

    const slot0 = await poolContract.slot0({ blockTag: historicalBlock })
    const sqrtPriceX96 = slot0.sqrtPriceX96
    const priceToken0 = (Number(sqrtPriceX96) / 2 ** 96) ** 2
    const adjustedPriceToken0 = priceToken0 * 10 ** (token0Decimals - token1Decimals)

    return {
      priceToken0: adjustedPriceToken0,
      priceToken1: 1 / adjustedPriceToken0
    }
  } catch (error: any) {
    console.error(`Error fetching price for ${format(targetDate, 'yyyy-MM-dd')}:`, error.message)
    return { priceToken0: 0, priceToken1: 0 }
  }
}

async function getCurrentPrices(
  poolContract: ethers.Contract,
  token0Decimals: number,
  token1Decimals: number
): Promise<{ priceToken0: number; priceToken1: number }> {
  const slot0 = await poolContract.slot0()
  const sqrtPriceX96 = slot0.sqrtPriceX96
  const priceToken0 = (Number(sqrtPriceX96) / 2 ** 96) ** 2
  const adjustedPriceToken0 = priceToken0 * 10 ** (token0Decimals - token1Decimals)

  return {
    priceToken0: adjustedPriceToken0,
    priceToken1: 1 / adjustedPriceToken0
  }
}

async function main() {
  const poolAddress = '0x03c3d9ad66e72bed7dc0a52b1b0231432a101b88'
  const token0Symbol = 'WBNB'
  const token1Symbol = 'CRAZY'
  const token0Decimals = 18
  const token1Decimals = 18

  const provider = new ethers.JsonRpcProvider(BSC_RPC_URL)

  const poolContract = new ethers.Contract(poolAddress, PANCAKE_V3_POOL_ABI, provider)
  const currentPrices = await getCurrentPrices(poolContract, token0Decimals, token1Decimals)

  console.log(`Current prices on BSC:`)
  console.log(`1 ${token0Symbol} = ${currentPrices.priceToken0} ${token1Symbol}`)
  console.log(`1 ${token1Symbol} = ${currentPrices.priceToken1} ${token0Symbol}`)

  const endDate = new Date()
  const startDate = subDays(endDate, 30)
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate })

  const historicalPrices: HistoricalPrice[] = []

  for (const date of dateRange) {
    const prices = await getHistoricalPrices(provider, poolAddress, token0Decimals, token1Decimals, date)

    historicalPrices.push({
      date: format(date, 'yyyy-MM-dd'),
      priceToken0: prices.priceToken0,
      priceToken1: prices.priceToken1
    })

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\nHistorical Prices on BSC (Last 30 Days):`)
  console.log(`Date\t\t1 ${token0Symbol} = X ${token1Symbol}\t1 ${token1Symbol} = X ${token0Symbol}`)
  historicalPrices
    .filter(p => p.priceToken0 > 0)
    .forEach(p => {
      console.log(`${p.date}\t${p.priceToken0.toFixed(6)}\t\t${p.priceToken1.toFixed(6)}`)
    })

  const validPrices = historicalPrices.filter(p => p.priceToken0 > 0)
  const avgPriceToken0 = validPrices.reduce((sum, p) => sum + p.priceToken0, 0) / validPrices.length
  const avgPriceToken1 = validPrices.reduce((sum, p) => sum + p.priceToken1, 0) / validPrices.length
  console.log(`\nAverage Price (${validPrices.length} valid days):`)
  console.log(`1 ${token0Symbol} = ${avgPriceToken0.toFixed(6)} ${token1Symbol}`)
  console.log(`1 ${token1Symbol} = ${avgPriceToken1.toFixed(6)} ${token0Symbol}`)
}

main().catch(console.error)
