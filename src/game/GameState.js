import { WorldState } from './WorldState.js';

export class GameState {
  constructor() {
    this.flags = new Set();

    // World helper sits on top of the flags Set
    this.world = new WorldState(this.flags);

    // Inventory: Map<itemId, qty>
    this.inventory = new Map();

    // Settings shared across Title + Menu
    this.settings = {
      masterVolume: 100
    };

    // Minimal item database for now (expand later via JSON)
    this.items = {
      ferric_salt: {
        id: 'ferric_salt',
        name: 'Ferric Salt',
        desc: 'A coarse mineral used to cauterize damp rot and cleanse canal wounds. Smells faintly of wet iron.'
      },
      ledger_shard: {
        id: 'ledger_shard',
        name: 'Ledger Shard',
        desc: 'A chipped sliver of stamped brass ledger-plate. The tally marks don’t match any common registry.'
      }
    };

    // Minimal player state (field position)
    this.player = {
      field: { x: 0, z: 0 }
    };
  }

  // -------- Flags (still available if you need them) --------
  hasFlag(flag) {
    return this.flags.has(flag);
  }

  setFlag(flag, value = true) {
    if (value) this.flags.add(flag);
    else this.flags.delete(flag);
  }

  // -------- Inventory --------
  addItem(itemId, qty = 1) {
    const q = Math.max(0, Math.floor(qty));
    if (q <= 0) return;

    const prev = this.inventory.get(itemId) || 0;
    this.inventory.set(itemId, prev + q);
  }

  removeItem(itemId, qty = 1) {
    const q = Math.max(0, Math.floor(qty));
    if (q <= 0) return false;

    const prev = this.inventory.get(itemId) || 0;
    if (prev < q) return false;

    const next = prev - q;
    if (next <= 0) this.inventory.delete(itemId);
    else this.inventory.set(itemId, next);

    return true;
  }

  getItemDef(itemId) {
    return this.items[itemId] || { id: itemId, name: itemId, desc: 'Unknown item.' };
  }

  getInventoryList() {
    const out = [];
    for (const [id, qty] of this.inventory.entries()) {
      const def = this.getItemDef(id);
      out.push({ id, name: def.name, qty, desc: def.desc });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  // -------- New Game Reset (keeps settings) --------
  resetForNewGame() {
    const keepSettings = { ...this.settings };

    this.flags.clear();
    this.inventory.clear();

    // Re-attach WorldState to the SAME Set (still fine)
    this.world = new WorldState(this.flags);

    this.settings = keepSettings;
    this.player = { field: { x: 0, z: 0 } };
  }

  // -------- Save Serialization --------
  toSaveData() {
    return {
      settings: {
        masterVolume: Number(this.settings.masterVolume) || 100
      },
      flags: Array.from(this.flags),
      inventory: Array.from(this.inventory.entries()).map(([id, qty]) => ({ id, qty })),
      player: {
        field: {
          x: Number(this.player.field?.x) || 0,
          z: Number(this.player.field?.z) || 0
        }
      }
    };
  }

  applySaveData(data) {
    try {
      if (!data || typeof data !== 'object') return false;

      // Settings
      if (data.settings && typeof data.settings.masterVolume === 'number') {
        this.settings.masterVolume = Math.max(0, Math.min(100, data.settings.masterVolume));
      }

      // Flags
      this.flags.clear();
      if (Array.isArray(data.flags)) {
        for (const f of data.flags) {
          if (typeof f === 'string') this.flags.add(f);
        }
      }

      // Inventory
      this.inventory.clear();
      if (Array.isArray(data.inventory)) {
        for (const row of data.inventory) {
          const id = row?.id;
          const qty = Math.max(0, Math.floor(row?.qty || 0));
          if (typeof id === 'string' && qty > 0) this.inventory.set(id, qty);
        }
      }

      // Player
      const px = Number(data.player?.field?.x);
      const pz = Number(data.player?.field?.z);
      this.player.field.x = Number.isFinite(px) ? px : 0;
      this.player.field.z = Number.isFinite(pz) ? pz : 0;

      // Rebuild world helper (still backed by same Set)
      this.world = new WorldState(this.flags);

      return true;
    } catch {
      return false;
    }
  }
}