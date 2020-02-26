import { loader as WebpackLoader } from 'webpack'
import { extractTags } from './tagExtractor'
import { Component, matcher } from './scan'
const loaderUtils = require('loader-utils')

function install (this: WebpackLoader.LoaderContext, content: string, components: Component[]) {
  const imports = '{' + components.map(c => `${c.name}: ${c.import}`).join(',') + '}'

  let newContent = '/* nuxt-component-imports */\n'
  newContent += `import installComponents from ${loaderUtils.stringifyRequest(this, '!' + require.resolve('./runtime/installComponents'))}\n`
  newContent += `installComponents(component, ${imports})\n`

  // Insert our modification before the HMR code
  const hotReload = content.indexOf('/* hot reload */')
  if (hotReload > -1) {
    content = content.slice(0, hotReload) + newContent + '\n\n' + content.slice(hotReload)
  } else {
    content += '\n\n' + newContent
  }

  return content
}

export default async function loader (this: WebpackLoader.LoaderContext, content: string) {
  this.async()
  this.cacheable()

  if (!this.resourceQuery) {
    this.addDependency(this.resourcePath)

    const tags = await extractTags(this.resourcePath)
    const { getComponents } = loaderUtils.getOptions(this)
    const matchedComponents = matcher(tags, getComponents())

    if (matchedComponents.length) {
      content = install.call(this, content, matchedComponents)
    }
  }

  this.callback(null, content)
}