/**
 * Empty stand-in for Node built-ins that React Native does not provide.
 *
 * Wired up in metro.config.js. See the comment there for why this exists and
 * why it is safe: the only importer is a credential-resolution branch in the
 * Anthropic SDK that the app never reaches.
 */
module.exports = {};
