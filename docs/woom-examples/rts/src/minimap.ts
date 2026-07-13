/**
 * EXAMPLES/rts — minimap.ts — §6 minimap (assemble, standard pattern).
 *
 * A 220×220 canvas, bottom-right. Draws territories + unit dots from the
 * view's own placement (territoryPositions/unitPositions) — NOT the 3D
 * scene — plus the camera viewport box. Click-to-recenter calls
 * view.focusOn. Redraws at ~4Hz (throttled by the caller).
 */

import type { ThreeView } from '../../../render/src/three/ThreeView.js';

const SIZE = 220;
const KIND_COLOR: Record<string, string> = {
  root: '#6d8a52', code: '#a07b46', docs: '#5a8a5a', tests: '#7a7a95', research: '#5878a0',
};

export class Minimap {
  private readonly ctx: CanvasRenderingContext2D;
  /** World half-extent shown; recomputed from territory spread each draw. */
  private worldHalf = 200;

  constructor(canvas: HTMLCanvasElement, private readonly view: ThreeView, kindOf: (path: string) => string) {
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('minimap: no 2d context');
    this.ctx = ctx;
    this.kindOf = kindOf;
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const nz = (e.clientY - rect.top) / rect.height;
      // inverse of world→map: map center = world origin, worldHalf = half-span
      const wx = (nx - 0.5) * 2 * this.worldHalf;
      const wz = (nz - 0.5) * 2 * this.worldHalf;
      this.view.focusOn(wx, wz);
    });
  }

  private readonly kindOf: (path: string) => string;

  private toMap(x: number, z: number): { mx: number; mz: number } {
    return { mx: (x / this.worldHalf * 0.5 + 0.5) * SIZE, mz: (z / this.worldHalf * 0.5 + 0.5) * SIZE };
  }

  /** @param nowMs a performance.now()-based timestamp (sonar phase; not wall time). */
  draw(nowMs = 0): void {
    const ctx = this.ctx;
    const terr = this.view.territoryPositions();
    const units = this.view.unitPositions();
    // Fit the world extent to the spread (with margin), so the map auto-zooms.
    let half = 120;
    for (const t of terr) half = Math.max(half, Math.abs(t.x) + t.radius, Math.abs(t.z) + t.radius);
    this.worldHalf = half * 1.15;

    ctx.fillStyle = 'rgba(6,12,10,0.82)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(157,187,119,0.4)';
    ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);

    for (const t of terr) {
      const { mx, mz } = this.toMap(t.x, t.z);
      const r = Math.max(3, (t.radius / this.worldHalf) * SIZE * 0.5);
      ctx.beginPath();
      ctx.arc(mx, mz, r, 0, Math.PI * 2);
      ctx.fillStyle = KIND_COLOR[this.kindOf(t.path)] ?? '#7a7a7a';
      ctx.fill();
    }
    for (const u of units) {
      const { mx, mz } = this.toMap(u.x, u.z);
      ctx.beginPath();
      ctx.arc(mx, mz, u.isHero ? 3 : 2, 0, Math.PI * 2);
      ctx.fillStyle = u.isHero ? '#ffd24d' : '#dfeadf';
      ctx.fill();
    }
    // Red SOS sonar — one per blocked unit. Expanding pings until the
    // operator acknowledges (clicks it); then a steady red dot. Redder /
    // faster as the block goes stale (unaddressed).
    const phase = (nowMs % 1400) / 1400;
    for (const d of this.view.distressReport()) {
      const { mx: dx, mz: dz } = this.toMap(d.x, d.z);
      const urg = 0.4 + d.staleness01 * 0.6;
      if (!d.acknowledged) {
        for (let i = 0; i < 2; i++) {
          const p = (phase + i * 0.5) % 1;
          ctx.beginPath();
          ctx.arc(dx, dz, 3 + p * 16, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, ${Math.round(60 * (1 - d.staleness01))}, 40, ${urg * (1 - p)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(dx, dz, 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,90,60,${0.5 * urg})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(dx, dz, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(255,${Math.round(50 * (1 - d.staleness01))},40)`;
      ctx.fill();
    }

    // Camera viewport marker.
    const c = this.view.cameraTarget;
    const { mx, mz } = this.toMap(c.x, c.z);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx - 10, mz - 10, 20, 20);
  }
}
