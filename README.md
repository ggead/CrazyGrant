# Sample Hardhat Project

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
