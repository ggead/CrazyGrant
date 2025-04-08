import 'dotenv'
import { getDunePrices } from '../utils/getDunePrices'
import { getGeckoTerminalPrices } from '../utils/getGeckoTerminalPrices'

async function main() {
  // const dune = await getDunePrices(process.env.DUNE_API_KEY!,'0x03c3d9ad66e72bed7dc0a52b1b0231432a101b88')
  // console.log(dune)

  const data = await getGeckoTerminalPrices('0x03c3d9ad66e72bed7dc0a52b1b0231432a101b88')

  console.log(data)
}

main()
