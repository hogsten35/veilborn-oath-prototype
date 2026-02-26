export class SaveSystem {
  constructor({ storageKey = 'veilborn_oath_save_v1' } = {}) {
    this.storageKey = storageKey;
  }

  hasSave() {
    try {
      return !!localStorage.getItem(this.storageKey);
    } catch {
      return false;
    }
  }

  deleteSave() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch {
      return false;
    }
  }

  peek() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  save(gameState) {
    try {
      const payload = gameState.toSaveData();
      payload._meta = {
        version: 1,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  loadInto(gameState) {
    try {
      const data = this.peek();
      if (!data) return false;

      // Basic sanity check
      if (!data._meta || data._meta.version !== 1) {
        // Still try to load, but you could add migrations later
      }

      return gameState.applySaveData(data);
    } catch {
      return false;
    }
  }

  // Optional convenience: load only settings so volume persists even before continuing
  applySettingsIfPresent(gameState) {
    const data = this.peek();
    if (!data || !data.settings) return false;

    try {
      if (typeof data.settings.masterVolume === 'number') {
        gameState.settings.masterVolume = Math.max(0, Math.min(100, data.settings.masterVolume));
      }
      return true;
    } catch {
      return false;
    }
  }
}