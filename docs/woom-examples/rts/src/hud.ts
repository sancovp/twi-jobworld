/**
 * EXAMPLES/rts — hud.ts — the DOM chrome from EXPERIENCE.md.
 *
 * UI owns control; here it owns readout: session plate, economy plate,
 * event ticker. Every string is specified in EXPERIENCE.md first. All
 * numbers come from WorldState; every ticker line comes from a real
 * kernel event — the HUD never invents anything (Cavewright law).
 */

import type { GameEvent } from '../../../kernel/src/events.js';
import type { WorldState } from '../../../kernel/src/world.js';

function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`hud: missing #${id}`);
  return e;
}

const TICKER_MAX = 4;

export class Hud {
  private readonly session = el('hud-session');
  private readonly economy = el('hud-economy');
  private readonly ticker = el('hud-ticker');

  constructor(private readonly transportLabel: string) {}

  /** Called every frame with the current state (+ live render perf). */
  update(state: WorldState, perf?: { emaMs: number; pixelRatio: number }): void {
    const perfText = perf
      ? ` · ${perf.emaMs.toFixed(1)}ms @${perf.pixelRatio.toFixed(2)}x`
      : '';
    this.session.textContent =
      `OVERSEER · ${this.transportLabel} · tick ${state.tick} · ${state.appliedSeq + 1} events${perfText}`;
    let edits = 0;
    let errors = 0;
    const units = Object.values(state.units);
    for (const u of units) {
      edits += u.edits;
      errors += u.errors;
    }
    this.economy.textContent =
      `⌂ ${Object.keys(state.buildings).length}  ☺ ${units.length}  ✎ ${edits}  ⚠ ${errors}`;
  }

  /** Called once per real event — renders the human-readable line, if any. */
  note(e: GameEvent, state: WorldState): void {
    const label = (id: string): string => state.units[id]?.label ?? id;
    let line = '';
    switch (e.type) {
      case 'hero_summoned':
        line = `★ ${e.label} summoned`;
        break;
      case 'unit_finished':
        line = `${label(e.unitId)} finished`;
        break;
      case 'item_touched':
        line = `${label(e.unitId)} edited ${e.path.slice(e.path.lastIndexOf('/') + 1)}`;
        break;
      case 'error_raised':
        line = `${label(e.unitId)} blocked: ${e.message.slice(0, 48)}`;
        break;
      case 'command_issued':
        line = `⚑ mission → ${label(e.unitId)}: ${e.command.slice(0, 44)}`;
        break;
      case 'chat_said':
        line = `${label(e.unitId)}: “${e.text.slice(0, 48)}”`;
        break;
      default:
        return; // tool start/end and moves are too chatty for the ticker
    }
    const div = document.createElement('div');
    div.className = 'tick-line';
    div.textContent = line;
    this.ticker.appendChild(div);
    while (this.ticker.children.length > TICKER_MAX) {
      this.ticker.firstChild?.remove();
    }
  }
}
