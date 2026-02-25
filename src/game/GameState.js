export class GameState {
  constructor() {
    this.flags = new Set();

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
  }

  // -------- Flags --------
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
    return this.items[itemId] || {
      id: itemId,
      name: itemId,
      desc: 'Unknown item.'
    };
  }

  getInventoryList() {
    // Returns [{id, name, qty, desc}] sorted by name
    const out = [];
    for (const [id, qty] of this.inventory.entries()) {
      const def = this.getItemDef(id);
      out.push({
        id,
        name: def.name,
        qty,
        desc: def.desc
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }
}
