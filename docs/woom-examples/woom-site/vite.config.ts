import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Serve examples/woom-site as root; allow imports from the repo root
// (kernel/render/astral live two levels up — same depth as examples/rts).
// This is the PUBLIC MARKETING SHELL: it reuses the verified WORLD-DUAL astral
// scene (render/src/astral/place.ts + interior.ts + kit/parts.ts) — the same
// pure pieces examples/rts/src/worldtest.ts uses — and touches ZERO engine code.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  publicDir: fileURLToPath(new URL('../../assets', import.meta.url)),
  server: {
    port: 8792,
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
});
