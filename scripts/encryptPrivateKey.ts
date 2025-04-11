import { AESUtil } from '../utils/aes.util'
import promptInput from '../utils/promptInput'

async function main() {
  const privateKey = await promptInput('Input Private Key')
  const password = await promptInput()

  console.log(AESUtil.encrypt(privateKey, password))
}

main()
