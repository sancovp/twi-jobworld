import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Serve examples/rts as root; allow imports from the repo root
// (kernel/ingress/render live two levels up).
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  // repoRoot/assets/ai-pack/*.png served at /ai-pack/*.png (real AI-generated
  // material — see docs/AI-ASSET-VOCABULARY-ADDENDUM.md). assets/kenney stays
  // unreferenced/inert (the procedural-only law's original constraint).
  publicDir: fileURLToPath(new URL('../../assets', import.meta.url)),
  server: {
    port: 8788,
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
});
