import { ethers } from 'ethers'

/**
 * Query events in chunks and yield them incrementally
 * @param contract The contract instance
 * @param filter Event filter for querying
 * @param fromBlock Starting block number
 * @param toBlock Ending block number or "latest"
 * @param chunkSize Number of blocks per query chunk
 * @param maxRetries Maximum retries for handling errors
 * @yields Array of event logs for each chunk
 */
export async function* queryEventsByChunks(
  contract: ethers.Contract,
  filter: ethers.ContractEventName,
  provider: ethers.JsonRpcProvider,
  fromBlock: number,
  toBlock: number | 'latest',
  chunkSize: number = 1000,
  maxRetries = 3
): AsyncGenerator<(ethers.EventLog | ethers.Log)[], void, undefined> {
  const endBlock = toBlock === 'latest' ? await provider.getBlockNumber() : toBlock

  // Ensure fromBlock is not negative
  if (fromBlock < 0) {
    console.warn('fromBlock cannot be less than 0, adjusting to 0')
    fromBlock = 0
  }
  // Validate block range
  if (fromBlock > endBlock) {
    throw new Error(`fromBlock (${fromBlock}) cannot be greater than toBlock (${endBlock})`)
  }

  for (let start = fromBlock; start <= endBlock; start += chunkSize) {
    let end = Math.min(start + chunkSize - 1, endBlock)
    console.log(`Querying block range: ${start} - ${end}`)

    let retries = maxRetries
    let currentChunkSize = chunkSize

    while (retries > 0) {
      try {
        const events = await contract.queryFilter(filter, start, end)
        console.log(`Retrieved ${events.length} events`)
        yield events // Yield the current chunk of events
        break
      } catch (error: any) {
        // Handle BAD_DATA or log overflow errors
        if (error.code === 'BAD_DATA' || error.message.includes('too many')) {
          retries--
          currentChunkSize = Math.floor(currentChunkSize / 2)
          if (currentChunkSize < 1) throw new Error('Block range too small to continue querying')
          end = start + currentChunkSize - 1
          console.log(`BAD_DATA error, retrying (${retries} attempts left), new chunk size: ${currentChunkSize}`)
        } else {
          throw error // Re-throw other errors
        }
      }
    }
  }
}
