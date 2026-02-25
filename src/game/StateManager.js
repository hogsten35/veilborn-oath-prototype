export class StateManager {
  constructor(game) {
    this.game = game;
    this.factories = new Map();

    this.currentScene = null;
    this.currentKey = null;

    this.pendingChange = null;
  }

  register(key, factoryFn) {
    if (this.factories.has(key)) {
      throw new Error(`State "${key}" is already registered.`);
    }
    this.factories.set(key, factoryFn);
  }

  change(key, params = {}) {
    if (!this.factories.has(key)) {
      throw new Error(`Cannot change to unknown state "${key}"`);
    }
    this.pendingChange = { key, params };
  }

  _applyPendingChange() {
    if (!this.pendingChange) return;

    const { key, params } = this.pendingChange;
    this.pendingChange = null;

    const nextSceneFactory = this.factories.get(key);
    const nextScene = nextSceneFactory();

    if (this.currentScene && typeof this.currentScene.exit === 'function') {
      this.currentScene.exit();
    }

    this.currentScene = nextScene;
    this.currentKey = key;

    if (this.currentScene && typeof this.currentScene.enter === 'function') {
      this.currentScene.enter(params);
    }

    // Ensure camera aspect is correct immediately
    const { width, height } = this.game.getViewport();
    if (this.currentScene && typeof this.currentScene.onResize === 'function') {
      this.currentScene.onResize(width, height);
    }
  }

  update(dt) {
    // Apply scene change before update
    this._applyPendingChange();

    if (this.currentScene && typeof this.currentScene.update === 'function') {
      this.currentScene.update(dt);
    }

    // Scene may request another change during update
    this._applyPendingChange();
  }

  resize(width, height) {
    if (this.currentScene && typeof this.currentScene.onResize === 'function') {
      this.currentScene.onResize(width, height);
    }
  }

  getActiveRenderTarget() {
    if (!this.currentScene) return null;
    return {
      scene: this.currentScene.scene,
      camera: this.currentScene.camera
    };
  }

  getHUDData() {
    const base = {
      stateKey: this.currentKey || 'none',
      sceneName: this.currentScene?.displayName || '—',
      locationName: this.currentScene?.locationName || '—',
      hintText: this.currentScene?.hintText || '',
      statusText: this.currentScene?.statusText || ''
    };

    if (
      this.currentScene &&
      typeof this.currentScene.getHUDData === 'function'
    ) {
      return {
        ...base,
        ...this.currentScene.getHUDData()
      };
    }

    return base;
  }
}
