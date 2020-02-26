import path from 'path'
import chokidar from 'chokidar'
// @ts-ignore
import RuleSet from 'webpack/lib/RuleSet'
import { Module } from '@nuxt/types'

import { scanComponents, ScanOptions } from './scan'

export interface Options {
  scan?: ScanOptions
}

const componentsModule: Module<Options> = function (_moduleOptions) {
  const dir = path.join(this.options!.srcDir!, 'components')
  const extensions = ['vue', 'js', ...this.options.build!.additionalExtensions!]
  const scanOptions = { dir, extensions }

  this.nuxt.hook('build:before', async (builder: any) => {
    let components: any[] = await scanComponents(scanOptions)

    this.extendBuild((config) => {
      const { rules }: any = new RuleSet(config.module!.rules)
      const vueRule = rules.find((rule: any) => rule.use && rule.use.find((use: any) => use.loader === 'vue-loader'))
      vueRule.use.unshift({
        loader: require.resolve('./loader'),
        options: {
          getComponents: () => components
        }
      })
      config.module!.rules = rules
    })

    // Watch components directory for dev mode
    if (this.options.dev) {
      const watcher = chokidar.watch(dir, this.options.watchers!.chokidar)
      watcher.on('all', async (eventName) => {
        if (!['add', 'unlink'].includes(eventName)) {
          return
        }

        components = await scanComponents(scanOptions)
        await builder.generateRoutesAndFiles()
      })

      // Close watcher on nuxt close
      this.nuxt.hook('close', () => {
        watcher.close()
      })
    }
  })
}

export default componentsModule