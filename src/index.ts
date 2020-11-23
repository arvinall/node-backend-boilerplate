import { config as configEnv } from 'dotenv'
import data from './data.json'

configEnv()

export interface IProduct {
  id: number
  name: string
  category: string
  amount: number
}

export function getProducts (): IProduct[] {
  return data.products as IProduct[]
}

console.log('Connecting to %s ...', process.env.DATABASE_URI)

async function main (): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 3000))

  console.log('Connected to database')

  console.log(getProducts())
}

main().catch(error => {
  throw error
})

setInterval(() => setImmediate(() => {}), 1000)
