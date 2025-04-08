import axios from 'axios'
import dayjs from 'dayjs'

export async function getGeckoTerminalPrices(paisAddress: string, currency = '0xc35207f6d8cae9fdad124d5d7fe0a743c63c7708') {
  try {
    const response = await axios.get(`https://api.geckoterminal.com/api/v2/networks/bsc/pools/${paisAddress}/ohlcv/day?limit=30&token=${currency}`)
    const data = response.data.data.attributes.ohlcv_list

    if (!data.length) {
      console.log('No data found for this pair')
      return
    }

    return data.map(([timestamp, open, high, low, close, volume]: [number, number, number, number, number, number]) => {
      return {
        day: dayjs(timestamp * 1000).format('YYYY-MM-DD'),
        price: low
      }
    })
  } catch (error: any) {
    console.error('Error fetching GeckoTerminal data:', error.message)
  }
}
