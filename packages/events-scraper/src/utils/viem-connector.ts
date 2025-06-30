import { CHAIN_LATEST_BLOCK_TAG } from '@jabba01/lfcr-common'
import {
  Chain,
  createPublicClient,
  http,
  extractChain,
  PublicClient,
  BlockTag,
} from 'viem'
import * as chains from 'viem/chains' // @TODO import only the chains we need to optimize the bundle size

const getChain = (chainId: number): Chain => {
  return extractChain({
    chains: Object.values(chains),
    id: chainId as any,
  })
}

export const createChainClientPublic = (chainId: number, rpcUrl: string) => {
  return createPublicClient({
    chain: getChain(chainId),
    transport: http(rpcUrl, { batch: true }),
  })
}

export const getChainLastBlockNumber = async (
  chainClient: PublicClient,
  blockTag: BlockTag
): Promise<bigint> => {
  return await chainClient
    .getBlock({
      blockTag: blockTag,
    })
    .catch((error) => {
      throw new Error(
        `Failed to query latest block number on chain '${chainClient.chain.name}'`,
        { cause: error }
      )
    })
    .then((block) => {
      return block.number
    })
}
