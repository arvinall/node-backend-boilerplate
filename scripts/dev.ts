import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { watch, FSWatcher } from 'chokidar'

// Paths
const projectDirectory: string = path.join(__dirname, '..')
const sourceDirectory: string = './src'
const indexFile: string = './index.ts'
const distDirectory: string = './dist'

/**
 * Watch the source directory (src)
 */
export const watcher: FSWatcher = watch(sourceDirectory, {
  cwd: projectDirectory
})

/**
 * Run process and pipe its output and resolve after execution
 *
 * @param name Process name
 * @param checkCode Break the chain when a process failed or not
 */
export async function spwanHere (
  name: string,
  command: string,
  args: string[]
): Promise<[ChildProcess, Promise<void>]> {
  const childProcess: ChildProcess = spawn(command, args, {
    cwd: projectDirectory,
    stdio: ['ignore', 'inherit', 'inherit']
  })

  console.log(
    // prettier-ignore
    "\n" + // eslint-disable-line
    '<' + name + '>'
  )

  return [
    childProcess,
    new Promise((resolve: Function, reject: Function) =>
      childProcess.on('exit', (code: number) => {
        code === 0 ? resolve() : reject()
      })
    )
  ]
}

export const isExtInList = (
  fileAddress: string,
  extList: string[]
): boolean => {
  fileAddress = fileAddress.split('/').slice(-1)[0]

  return extList.map(ext => fileAddress.endsWith('.' + ext)).includes(true)
}

if (module === require.main) {
  // Process flow
  const processes = ((): Function => {
    let lastNodeChildProcess: ChildProcess
    let inProcess = false

    return async function processes (fileAddress?: string): Promise<void> {
      if (inProcess) return
      else inProcess = true

      let mustRun: Boolean = true

      // format:prettier
      try {
        if (
          !fileAddress ||
          isExtInList(fileAddress, ['ts', 'js', 'cjs', 'mjs', 'json'])
        ) {
          const [, prettierOnExit] = await spwanHere(
            'format:prettier' + (fileAddress ? `(${fileAddress})` : ''),
            'npx',
            ['prettier', '--write', fileAddress || sourceDirectory]
          )

          await prettierOnExit
        }
      } catch (childProcess) {}

      try {
        // lint:eslint
        if (
          !fileAddress ||
          isExtInList(fileAddress, ['ts', 'js', 'cjs', 'mjs'])
        ) {
          const [, eslintOnExit] = await spwanHere(
            'lint:eslint' + (fileAddress ? `(${fileAddress})` : ''),
            'npx',
            ['eslint', '--fix', fileAddress || sourceDirectory]
          )

          await eslintOnExit
        }

        // test:ava
        try {
          if (
            !fileAddress ||
            (fileAddress.includes('.test.') &&
              isExtInList(fileAddress, ['ts', 'js', 'cjs', 'mjs']))
          ) {
            const [, avaOnExit] = await spwanHere(
              'test:ava' + (fileAddress ? `(${fileAddress})` : ''),
              'npx',
              [
                'ava',
                fileAddress || path.join(sourceDirectory, './**/*.test.*')
              ]
            )

            await avaOnExit
          }
        } catch (childProcess) {}
      } catch (childProcess) {
        mustRun = false
      }

      if (!fileAddress || !fileAddress.includes('.test.')) {
        if (
          lastNodeChildProcess &&
          lastNodeChildProcess.exitCode === null &&
          !lastNodeChildProcess.killed
        ) { lastNodeChildProcess.kill() }

        if (mustRun) {
          if (process.argv.includes('--compile')) {
            // clean:rimraf
            try {
              if (!fileAddress) {
                const [, rimrafOnExit] = await spwanHere(
                  'clean:rimraf',
                  'npx',
                  ['rimraf', distDirectory]
                )

                await rimrafOnExit
              }
            } catch (error) {}

            // compile:tsc
            try {
              if (
                !fileAddress ||
                !fileAddress.includes('.test.')
              ) {
                const [, tscOnExit] = await spwanHere(
                  'compile:tsc',
                  'npx',
                  ['tsc']
                )

                await tscOnExit
              }
            } catch (error) {}
          }

          // run:node
          try {
            const [nodeChildProcess, nodeOnExit] = await spwanHere(
              'run:node',
              'node',
              !process.argv.includes('--compile')
                ? [
                  '--inspect', // --inspect-brk
                  '-r',
                  'ts-node/register',
                  path.join(sourceDirectory, indexFile)
                ]
                : ['--inspect', '.']
            )

            lastNodeChildProcess = nodeChildProcess

            nodeOnExit.catch(() => {})
          } catch (error) {}
        }
      }

      inProcess = false
    }
  })()

  // Run the processes
  watcher.on('ready', (): void => {
    processes()
      .then(() => {
        watcher.on('add', (path: string): void => {
          processes(path)
            .then(() => {})
            .catch(() => {})
        })
        watcher.on('change', (path: string): void => {
          processes(path)
            .then(() => {})
            .catch(() => {})
        })
      })
      .catch(() => {})
  })
}
