# Crazy.tech
The protocol implements a token release mechanism, inspired by [CZ's post](https://x.com/cz_binance/status/1895837657613078574?s=46&t=aINiXI9muQv17hdOB_Z5YQ), which is aimed at avoiding price dumping and a sustainable performance of the price action. 

**[Core Definitions]**<br>
Defines the total token supply, initial minting circulation ratio, and conditional token unlocking.

10% of the total supply can be minted at TGE.
The further token unlocks follows a price-verification model with the following restrictions:
1.Time Constraint: Minimum 6-month interval between unlocks.
2.Price Constraint: The token price must doubled from its previous unlock price for any 30 consecutive days
3.Quantity Constraint: Up to 5% of total supply per unlock event.

3.Quantity Constraint: Maximum 5% of total supply per unlock event.
Note: Unlock will revert if conditions are unmet, but price verification can be retried anytime until passed, when token unlocking becomes optional.

Note: Unlock will revert if conditions are unmet, but price verification can be retried anytime until passed, when token unlocking becomes optional.

**Developers**<br>
Try running some of the following tasks:
```shell
npx hardhat vars set WALLET_PRIVATE_KEY 
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat compile

npx hardhat ignition deploy ./ignition/modules/TokenManager.ts --network BSCTestnet
```
