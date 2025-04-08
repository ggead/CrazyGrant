import axios from 'axios'

const DUNE_API_URL = 'https://api.dune.com/api/v1/query/execute'

export async function getDunePrices(key: string, paisAddress: string) {
  const startTime = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60 // 30 天前

  const query = `
    SELECT
      DATE_TRUNC('day', FROM_UNIXTIME(period_start_unix)) AS day,
      MIN(token0_price) AS min_price
    FROM pancakeswap_v3.pool_hour_datas
    WHERE pool_address = '${paisAddress.toLowerCase()}'
      AND period_start_unix >= ${startTime}
    GROUP BY DATE_TRUNC('day', FROM_UNIXTIME(period_start_unix))
    ORDER BY day ASC
    LIMIT 30
  `

  try {
    const response = await axios.post(
      DUNE_API_URL,
      { query_sql: query },
      {
        headers: {
          'X-DUNE-API-KEY': key
        }
      }
    )

    const executionId = response.data.execution_id
    const resultUrl = `https://api.dune.com/api/v1/execution/${executionId}/results`

    let result: any
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const res = await axios.get(resultUrl, {
        headers: { 'X-DUNE-API-KEY': key }
      })
      if (res.data.state === 'EXECUTION_SUCCEEDED') {
        result = res.data.result.rows
        break
      }
    }

    if (!result) {
      console.log('Query timeout or failed')
      return
    }

    console.log('Dune Analytics - Daily Minimum Prices (Past 30 Days):')
    return result
  } catch (error:any) {
    console.error('Error fetching Dune data:', error.message)
  }
}
