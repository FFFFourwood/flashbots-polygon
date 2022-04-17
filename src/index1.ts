import {
    FlashbotsBundleProvider,
    FlashbotsBundleResolution
  } from "@flashbots/ethers-provider-bundle";
  import * as dotenv from "dotenv";
  import { BigNumber, Contract, providers, utils, Wallet } from "ethers";
  dotenv.config();
  
  async function main() {
    // create the base provider
    const baseProvider = new providers.AlchemyProvider(137, 'AlchemyProviderKEY');
    await baseProvider.ready;
  
    // badPK 被盗 private key
    const prevOwner = new Wallet('****', baseProvider);
    // sponsorPK 转 gas 费的钱包的 private key
    const sponsor = new Wallet('****', baseProvider);
  
    // wrap it with the marlin relay provider
    const flashBotProvider = new FlashbotsBundleProvider(
      baseProvider,
      sponsor,
      { url: "http://bor.txrelay.marlin.org/" },
      137
    );
  
    const NEW_OWNER = "****";
    const CONTRACT_ADDRESS = "****";
  
    if (!NEW_OWNER || !CONTRACT_ADDRESS)
      throw new Error("请先设置 NEW_OWNER 和 CONTRACT_ADDRESS");
  
    const ABI = [];
    const contract = new Contract(CONTRACT_ADDRESS, ABI, baseProvider);
  
    baseProvider.on("block", async (blockNumber) => {
      const sponsorGasLimit = 510000;
      const transferOwnershipGasLimit = 900000;
      const payInMatic = "0.5"; // 总共付 1 个 Matic gas 来跑这个交易
      const gasPrice = utils
        .parseEther(payInMatic)
        .div(BigNumber.from(sponsorGasLimit + transferOwnershipGasLimit));
  
      const txs = [
        {
          transaction: {
            to: prevOwner.address,
            value: utils.parseEther("1"),
            gasPrice,
            gasLimit: sponsorGasLimit,
          },
          signer: sponsor,
        },
        {
          signer: prevOwner,
          transaction: {
            ...(await contract.populateTransaction.transferOwnership(NEW_OWNER)),
            gasPrice,
            gasLimit: transferOwnershipGasLimit,
          },
        },
      ];
  
      try {
        const bundleSubmission = await flashBotProvider.sendBundle(txs, blockNumber + 2);
        if ("error" in bundleSubmission) {
          throw new Error(bundleSubmission.error.message);
        }
        const waitResponse = await bundleSubmission.wait();
        console.log(`Wait Response: ${FlashbotsBundleResolution[waitResponse]}`);
        if (
          waitResponse === FlashbotsBundleResolution.BundleIncluded ||
          waitResponse === FlashbotsBundleResolution.AccountNonceTooHigh
        ) {
          console.log("Done!");
          process.exit(0);
        } else {
        }
      } catch (e) {
        console.log(e);
      }
    });
  }
  
  main().catch(console.error);