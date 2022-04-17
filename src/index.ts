import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle'
import { Contract, providers, utils, Wallet } from 'ethers'

async function main() {
// Standard json rpc provider directly from ethers.js (NOT Flashbots)
// create the base provider
let base = new providers.JsonRpcProvider({ url: 'https://polygon-rpc.com/' }, 137)
await base.ready

// badPK 被盗 private key
const bad = new Wallet('*****', base)
// sponsorPK 转 gas 费的钱包的 private key
const sponsor = new Wallet('*****', base)

// wrap it with the marlin relay provider
let provider = new FlashbotsBundleProvider(base, bad, { url: 'http://bor.txrelay.marlin.org/' }, 137)
const newOwner = '*****'

const CONTRACT_ADDRESS = '*****'
const ABI = []
const contract = new Contract(CONTRACT_ADDRESS, ABI, bad)

const txs = [
{
transaction: {
to: bad.address,
gasPrice: 2181150000000000,
value: utils.parseEther('0.5'),
},
signer: sponsor
},
{
signer: bad,
transaction: await contract.populateTransaction.transferOwnership(newOwner),
}
]

const blk = await base.getBlockNumber()
// send bundle to marlin relay
const result = await provider.sendBundle(txs, blk + 1)
console.log(result)
console.log(blk)
}

main().catch((e) => {
    console.log(e)
})