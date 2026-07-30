// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * Stub Node built-ins for React Native.
 *
 * The Anthropic SDK lazily does `await import('node:fs')` when it resolves an
 * `ant auth login` credential profile from disk. That path never executes
 * here — the ASK service always constructs the client with an explicit
 * `apiKey` from the device keychain — but Metro resolves dynamic imports
 * statically, so the bundle fails on a module React Native does not have.
 *
 * Mapping `node:*` to an empty module lets the bundle build while leaving the
 * unreachable branch harmless. Anything that genuinely needed `fs` would fail
 * loudly at call time rather than being silently wrong.
 */
const NODE_BUILTIN = /^node:/;
const EMPTY_MODULE = path.resolve(__dirname, 'src/lib/emptyModule.js');

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (NODE_BUILTIN.test(moduleName)) {
    return { type: 'sourceFile', filePath: EMPTY_MODULE };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
