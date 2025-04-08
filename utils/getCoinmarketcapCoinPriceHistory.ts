import axios from 'axios'

const BASE_URL = 'https://pro-api.coinmarketcap.com'
const DAYS = 30

export async function getCoinmarketcapCoinPriceHistory(key: string, id: string, convert = 'BNB') {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - DAYS)

  const params = {
    id: id,
    time_start: startDate.toISOString().split('T')[0], // YYYY-MM-DD
    time_end: endDate.toISOString().split('T')[0], // YYYY-MM-DD
    interval: 'daily',
    convert
  }

  try {
    const response = await axios.get(`${BASE_URL}/v2/cryptocurrency/quotes/historical`, {
      headers: {
        'X-CMC_PRO_API_KEY': key
      },
      params
    })

    const data = response.data.data.quotes
    if (!data || data.length === 0) {
      console.log('No data returned from CoinMarketCap')
      return
    }

    console.log(`Price history for Coin ID ${id} (Past ${DAYS} days):`)
    return data
  } catch (error: any) {
    console.error('Error fetching data:', error.response ? error.response.data : error.message)
  }
}
