import typescriptPlugin from '@rollup/plugin-typescript'
import nodeResolvePlugin from '@rollup/plugin-node-resolve'
import commonjsPlugin from '@rollup/plugin-commonjs'
import jsonPlugin from '@rollup/plugin-json'
import replacePlugin from '@rollup/plugin-replace'

import clearPlugin from 'rollup-plugin-clear'
import { terser as terserPlugin } from 'rollup-plugin-terser'
import progressPlugin from 'rollup-plugin-progress'
import sizesPlugin from 'rollup-plugin-sizes'

import builtins from 'builtin-modules'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import tsconfig from './tsconfig.json'

const dotenvVariables = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')))

// prefix dotenv's object keys, with "process.env."
const envVariables = Object.fromEntries(
  Object.entries(dotenvVariables).map(
    ([key, value]) => [
      ['process.env', key].join('.'),
      JSON.stringify(value)
    ]
  )
)

let mustMinify = false

try {
  if ('ROLLUP_TERSER' in process.env) {
    mustMinify = Boolean(JSON.parse(process.env.ROLLUP_TERSER))
  }
} catch (error) {}

const typescriptPluginOptions = { tsconfig: 'tsconfig.rollup.json' }

if (mustMinify) {
  typescriptPluginOptions.target = (
    tsconfig.compilerOptions.target !== 'ESNEXT'
      ? tsconfig.compilerOptions.target
      : 'ES2020'
  )
}

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    progressPlugin({ clearLine: false }),
    clearPlugin({ targets: ['dist'] }),
    replacePlugin({ ...envVariables }),
    typescriptPlugin(typescriptPluginOptions),
    nodeResolvePlugin({ preferBuiltins: true }),
    commonjsPlugin(),
    jsonPlugin(),
    mustMinify ? terserPlugin() : undefined,
    sizesPlugin()
  ],
  external: builtins
}
