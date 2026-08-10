// Metro's default resolver assumes hoisted, non-symlinked node_modules
// (Yarn/npm classic layout). pnpm's strict symlinked workspace layout needs
// these adjustments so Metro can find both the monorepo root's node_modules
// (where hoisted deps live) and workspace packages like @4ef/shared (a
// symlink into ../../packages/shared).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// unstable_enableSymlinks lets Metro follow pnpm's symlinked node_modules
// (needed to reach @4ef/shared, which is a symlink into ../../packages/shared).
// Hierarchical lookup must stay ON (the default) — pnpm resolves each
// package's own transitive deps via a per-package node_modules inside its
// virtual store (.pnpm/<pkg>/node_modules/<dep>), which Metro only finds by
// walking up from that package's own directory. Turning lookup off (an
// earlier, wrong attempt at this config) broke exactly that, causing
// "Unable to resolve module invariant" from inside react-native itself.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
