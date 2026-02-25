import * as THREE from 'three';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class TitleScene {
  constructor(game) {
    this.game = game;

    this.displayName = 'Title';
    this.locationName = 'Veilborn Oath';
    this.hintText = 'Up/Down: Navigate • Enter/Space: Select • Esc: Back';
    this.statusText = 'Awaiting your oath...';

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x07080b, 6, 28);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 3.4, 7.4);
    this.camera.lookAt(0, 1.2, 0);

    this.elapsed = 0;

    // Menu state
    this.screen = 'main'; // main | settings | credits
    this.selection = 0;

    // Later: make true when Save/Load exists
    this.canContinue = false;

    // Placeholder setting value (UI only for now)
    this.masterVolume = 100;

    // Fade control
    this.fade = {
      alpha: 1,
      target: 0,
      speed: 2.8,
      active: true,
      onDone: null
    };

    this._setupBackdrop();
  }

  _setupBackdrop() {
    const ambient = new THREE.AmbientLight(0x6b7790, 0.35);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xaecbff, 0.75);
    key.position.set(-3, 6, 2);
    this.scene.add(key);

    const teal = new THREE.PointLight(0x75e7d8, 0.55, 18);
    teal.position.set(-1.8, 1.8, 1.2);
    this.scene.add(teal);
    this.teal = teal;

    const violet = new THREE.PointLight(0xba8eff, 0.5, 18);
    violet.position.set(1.8, 1.6, 1.1);
    this.scene.add(violet);
    this.violet = violet;

    const floorGeo = new THREE.CircleGeometry(5.2, 64);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111318,
      metalness: 0.08,
      roughness: 0.92
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    this.scene.add(floor);

    const ringGeo = new THREE.TorusGeometry(1.9, 0.075, 16, 128);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xbfa16a,
      emissive: 0x2b2113,
      metalness: 0.65,
      roughness: 0.35
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.35;
    this.scene.add(this.ring);

    const prismGeo = new THREE.OctahedronGeometry(0.58, 0);
    const prismMat = new THREE.MeshStandardMaterial({
      color: 0xe6e1d5,
      emissive: 0x16110c,
      metalness: 0.06,
      roughness: 0.22
    });
    this.prism = new THREE.Mesh(prismGeo, prismMat);
    this.prism.position.y = 1.2;
    this.scene.add(this.prism);
  }

  enter() {
    this.game.hud.setMode('title');
    this._syncTitleUI();

    // Fade in from black
    this.fade.alpha = 1;
    this.fade.target = 0;
    this.fade.active = true;
    this.fade.onDone = null;
    this.game.hud.setFade(1);

    this.game.hud.setToast('Veilborn Oath — Title', 700);
  }

  _syncTitleUI() {
    this.game.hud.showTitleScreen({
      screen: this.screen,
      selection: this.selection,
      canContinue: this.canContinue,
      masterVolume: this.masterVolume
    });
  }

  update(dt) {
    this.elapsed += dt;

    // Backdrop animation
    this.ring.rotation.z += dt * 0.35;
    this.prism.rotation.x += dt * 0.18;
    this.prism.rotation.y += dt * 0.33;
    this.prism.position.y = 1.2 + Math.sin(this.elapsed * 1.7) * 0.05;

    const pulse = 0.55 + Math.sin(this.elapsed * 1.9) * 0.08;
    this.teal.intensity = pulse;
    this.violet.intensity = 0.5 + Math.cos(this.elapsed * 1.6) * 0.08;

    this._updateFade(dt);

    // While fading out to start game, ignore menu input
    if (this.fade.active && this.fade.target > this.fade.alpha) return;

    const actions = this.game.getInputActions();

    if (actions.navUpPressed) this._moveSelection(-1);
    if (actions.navDownPressed) this._moveSelection(1);

    // Settings adjustments (only when the volume row is selected)
    if (this.screen === 'settings' && this.selection === 0) {
      if (actions.navLeftPressed) {
        this.masterVolume = clamp(this.masterVolume - 5, 0, 100);
        this._syncTitleUI();
      }
      if (actions.navRightPressed) {
        this.masterVolume = clamp(this.masterVolume + 5, 0, 100);
        this._syncTitleUI();
      }
    }

    if (actions.confirmPressed) this._confirm();
    if (actions.cancelPressed) this._cancel();
  }

  _getOptionsForScreen() {
    if (this.screen === 'main') {
      return [
        { id: 'new', enabled: true },
        { id: 'continue', enabled: this.canContinue },
        { id: 'settings', enabled: true },
        { id: 'credits', enabled: true }
      ];
    }

    if (this.screen === 'settings') {
      return [
        { id: 'volume', enabled: true },
        { id: 'back', enabled: true }
      ];
    }

    // credits
    return [{ id: 'back', enabled: true }];
  }

  _moveSelection(delta) {
    const options = this._getOptionsForScreen();
    if (options.length === 0) return;

    let idx = this.selection;

    for (let i = 0; i < options.length; i++) {
      idx = (idx + delta + options.length) % options.length;
      if (options[idx].enabled) break;
    }

    this.selection = idx;
    this._syncTitleUI();
  }

  _confirm() {
    const options = this._getOptionsForScreen();
    const choice = options[this.selection];
    if (!choice || !choice.enabled) {
      this.game.hud.setToast('That option is not available yet.', 900);
      return;
    }

    if (this.screen === 'main') {
      if (choice.id === 'new') return this._startNewGame();

      if (choice.id === 'continue') {
        this.game.hud.setToast('Continue unlocks after Save/Load is added.', 1200);
        return;
      }

      if (choice.id === 'settings') {
        this.screen = 'settings';
        this.selection = 0;
        this._syncTitleUI();
        this.game.hud.setToast('Settings: adjust volume with Left/Right.', 1000);
        return;
      }

      if (choice.id === 'credits') {
        this.screen = 'credits';
        this.selection = 0;
        this._syncTitleUI();
        return;
      }
    }

    if (this.screen === 'settings') {
      if (choice.id === 'volume') {
        this.game.hud.setToast('Use Left/Right to adjust volume.', 900);
        return;
      }
      if (choice.id === 'back') {
        this.screen = 'main';
        this.selection = 0;
        this._syncTitleUI();
        return;
      }
    }

    if (this.screen === 'credits') {
      // any confirm returns
      this.screen = 'main';
      this.selection = 0;
      this._syncTitleUI();
    }
  }

  _cancel() {
    if (this.screen === 'main') {
      this.game.hud.setToast('Choose “New Game” to enter the field.', 900);
      return;
    }

    this.screen = 'main';
    this.selection = 0;
    this._syncTitleUI();
  }

  _startNewGame() {
    this.game.hud.setToast('Swearing the oath...', 800);

    this.fade.target = 1;
    this.fade.active = true;
    this.fade.onDone = () => {
      this.game.stateManager.change('field', { fromTitle: true });
    };
  }

  _updateFade(dt) {
    if (!this.fade.active) return;

    const dir = this.fade.target > this.fade.alpha ? 1 : -1;
    this.fade.alpha += dir * this.fade.speed * dt;

    if (dir > 0 && this.fade.alpha >= this.fade.target) {
      this.fade.alpha = this.fade.target;
      this.fade.active = false;
      this.game.hud.setFade(this.fade.alpha);

      if (this.fade.onDone) {
        const fn = this.fade.onDone;
        this.fade.onDone = null;
        fn();
      }
      return;
    }

    if (dir < 0 && this.fade.alpha <= this.fade.target) {
      this.fade.alpha = this.fade.target;
      this.fade.active = false;
      this.game.hud.setFade(this.fade.alpha);
      return;
    }

    this.game.hud.setFade(this.fade.alpha);
  }

  onResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  getHUDData() {
    return {
      sceneName: this.displayName,
      locationName: this.locationName,
      hintText: this.hintText,
      statusText: this.statusText
    };
  }

  exit() {
    this.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
        else obj.material?.dispose?.();
      }
    });
  }
}
