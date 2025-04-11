import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const ReaderModule = buildModule('ReaderModule', m => {

  const reader = m.contract('Reader', [], {
    value: 0n
  })

  return { reader }
})

export default ReaderModule
