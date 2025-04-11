import prompt from 'prompt'

prompt.start()

export default async function promptInput(description = 'Enter your password'): Promise<string> {
  const schema = {
    properties: {
      password: {
        description,
        hidden: true,
        replace: '*',
        required: true
      }
    }
  }

  return new Promise((resolve, reject) => {
    prompt.get(schema, (err, result) => {
      if (err) reject(err)
      else resolve(result.password as string)
    })
  })
}
