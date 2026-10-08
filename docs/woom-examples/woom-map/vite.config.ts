import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Serve examples/woom-map as root. Standalone FREE geodata prototype (OSM /
// Overpass) — imports only three (node_modules), no repo-root engine imports,
// but keep fs.allow at repo root for parity with the other examples.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  server: {
    port: 8796,
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
});
