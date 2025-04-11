import * as fs from 'fs'
import * as fsPromises from 'fs/promises'

export class JsonUtils {
  static readJsonSync<T>(filePath: string, defaultValue: T = {} as T): T {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(content) as T
      }
      return defaultValue
    } catch (error) {
      return defaultValue
    }
  }

  static async readJsonAsync<T>(filePath: string, defaultValue: T = {} as T): Promise<T> {
    try {
      if (await fsPromises.stat(filePath).catch(() => false)) {
        const content = await fsPromises.readFile(filePath, 'utf8')
        return JSON.parse(content) as T
      }
      return defaultValue
    } catch (error) {
      return defaultValue
    }
  }

  static writeJsonSync<T>(filePath: string, data: T, spaces: number = 2): void {
    try {
      const jsonString = JSON.stringify(data, null, spaces)
      fs.writeFileSync(filePath, jsonString, 'utf8')
    } catch (error) {
      throw error
    }
  }

  static async writeJsonAsync<T>(filePath: string, data: T, spaces: number = 2): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, spaces)
      await fsPromises.writeFile(filePath, jsonString, 'utf8')
    } catch (error) {
      throw error
    }
  }
}
