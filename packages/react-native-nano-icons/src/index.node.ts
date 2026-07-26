type ConfigPluginFn = (...args: unknown[]) => unknown;

const plugin = (require('./plugin/src/index') as { default: ConfigPluginFn })
  .default;

module.exports = Object.assign(plugin, {});
