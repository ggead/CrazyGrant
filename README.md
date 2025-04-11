# Crazy.tech

CRAZY.TECH V2​​ has evolved from an innovative token minting protocol based on price verification unlocks to a BSC grant innovation platform, supporting developers to launch grants and collect donations from public users. The fully functional product version will be launching soon.

**[New Contract Features]**<br>

1. Grant Launch & Donations Collection​
   Project creators set the ​​Grant Cap​​ (a donation target). The protocol then auto-configures all parameters based on default settings, instantly launching the grant.

The protocol auto-configures parameters upon launch using default values:
​​Total Token Supply​​: 1,000,000,000
​​TGE Mint Ratio​​: 10%
​​Max.Grant Amount per User​​: 0.15 BNB
Reserved Ratio for Pancake‘s LP: 1.5% of total supply
Grant Ratio: 8.5% of total supply

2. Automated Liquidity Pool Creation​
   Upon successful launch, 1.5% of total tokens​​ and ​​30% of the donated BNB will be added to PancakeSwap V3 liquidity immediately​​. The LP NFT token will be locked for a 10-year period.
   ​​LP Ownership​​: The liquidity pool belongs solely to the grant creator.

3. Token Unlock Verification​
   At TGE​​: 10% of tokens are minted. After distribution to grant contributors, remaining 1.5% of tokens go to the liquidity pool. No reserves.
   ​​Post-TGE​​: 90% of tokens remain ​​locked​​. Unlocks require ​​creator to submit, following the ​​V1 protocol’s price-verification model​​.

Note: The protocol will charge a fee of 3% of the Grant Amount (BNB) as a platform service fee.

**Developers**<br>

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat vars set WALLET_PRIVATE_KEY
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat compile

npx hardhat ignition deploy ./ignition/modules/TokenManagerV2Deployer.ts --network BSCTestnet
npx hardhat ignition deploy ./ignition/modules/Factory.ts --network BSCTestnet
npx hardhat ignition deploy ./ignition/modules/Reader.ts --network BSCTestnet
```
