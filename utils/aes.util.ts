import { BinaryLike, createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'crypto'

const ivLength = 16
const saltLength = 16
const splitChar = ':'

export class AESUtil {
  // Encryption function
  static encrypt(text: string, password: BinaryLike) {
    const iv = randomBytes(ivLength)

    const keyResult = AESUtil.password2AES256Key(password)

    // Create an AES-256-CBC cipher
    const cipher = createCipheriv('aes-256-cbc', keyResult.key, iv)

    // Update the encrypted data
    let encrypted = cipher.update(text, 'utf8', 'hex')

    // Finalize the encryption
    encrypted += cipher.final('hex')
    return `${iv.toString('hex')}${splitChar}${keyResult.salt.toString('hex')}${splitChar}${encrypted}`
  }

  // Decryption function
  static decrypt(encryptedText: string, password: BinaryLike) {
    const [ivStr, saltStr, encrypted] = encryptedText.split(splitChar)

    const iv = Buffer.from(ivStr, 'hex')
    const salt = Buffer.from(saltStr, 'hex')

    const result = AESUtil.password2AES256Key(password, salt)

    // Create an AES-256-CBC decipher
    const decipher = createDecipheriv('aes-256-cbc', result.key, iv)
    // Update the decrypted data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    // Finalize the decryption
    decrypted += decipher.final('utf8')
    return decrypted
  }

  static password2AES256Key(password: BinaryLike, salt?: Buffer) {
    // Check password
    const hash = createHash('sha256')
    hash.update(password)
    const hashHex = hash.digest('hex')

    if (!salt) salt = randomBytes(saltLength)

    // Number of iterations. Increasing the number of iterations can make the key more difficult to crack, but it will also increase the computation time.
    const iterations = 100000

    // The length of the generated key. Here, it is 32 bytes, which is suitable for AES - 256.
    const keyLength = 32

    const digest = 'sha256'

    // Generate a key using PBKDF2.
    return {
      salt: salt,
      key: pbkdf2Sync(hashHex, salt, iterations, keyLength, digest)
    }
  }
}
