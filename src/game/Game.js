import * as THREE from 'three';
import { StateManager } from './StateManager.js';
import { GameState } from './GameState.js';

import { BootScene } from '../scenes/BootScene.js';
import { TitleScene } from '../scenes/TitleScene.js';
import { FieldScene } from '../scenes/FieldScene.js';

import { HUD } from '../ui/HUD.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { DialogueRunner } from './DialogueRunner.js';

import { MenuOverlay } from '../ui/MenuOverlay.js';
import { ItemPopup } from '../ui/ItemPopup.js';

class KeyboardInput {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();

    this._boundKeyDown = this._onKeyDown.bind(this);
    this._boundKeyUp = this._onKeyUp.bind(this);
    this._boundBlur = this._onBlur.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    window.addEventListener('blur', this._boundBlur);
  }

  detach() {
    window.removeEventListener('keydown', this._boundKeyDown);
    window.removeEventListener('keyup', this._boundKeyUp);
    window.removeEventListener('blur', this._boundBlur);
  }

  _onKeyDown(event) {
    const code = event.code;

    const preventCodes = new Set([
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Space',
      'Enter'
    ]);

    if (preventCodes.has(code)) event.preventDefault();

    if (!this.down.has(code)) this.pressed.add(code);
    this.down.add(code);
  }

  _onKeyUp(event) {
    const code = event.code;
    this.down.delete(code);
    this.released.add(code);
  }

  _onBlur() {
    this.down.clear();
    this.pressed.clear();
    this.released.clear();
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }

  isDown(...codes) {
    return codes.some((code) => this.down.has(code));
  }

  wasPressed(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  getMoveVector() {
    let x = 0;
    let z = 0;

    if (this.isDown('KeyA', 'ArrowLeft')) x -= 1;
    if (this.isDown('KeyD', 'ArrowRight')) x += 1;
    if (this.isDown('KeyW', 'ArrowUp')) z -= 1;
    if (this.isDown('KeyS', 'ArrowDown')) z += 1;

    if (x !== 0 && z !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      z *= inv;
    }

    return { x, z };
  }

  getActions() {
    return {
      move: this.getMoveVector(),
      run: this.isDown('ShiftLeft', 'ShiftRight'),

      // Navigation (one-press)
      navUpPressed: this.wasPressed('ArrowUp', 'KeyW'),
      navDownPressed: this.wasPressed('ArrowDown', 'KeyS'),
      navLeftPressed: this.wasPressed('ArrowLeft', 'KeyA'),
      navRightPressed: this.wasPressed('ArrowRight', 'KeyD'),

      // Common actions (one-press)
      confirmPressed: this.wasPressed('Enter', 'Space'),
      cancelPressed: this.wasPressed('Escape', 'Backspace'),
      interactPressed: this.wasPressed('KeyE', 'Enter'),

      // Menu shortcuts
      menuPressed: this.wasPressed('Escape'),
      inventoryPressed: this.wasPressed('KeyI')
    };
  }
}

export class Game {
  constructor({ mountEl, uiRootEl }) {
    this.mountEl = mountEl;
    this.uiRootEl = uiRootEl;

    this.state = new GameState();

    this.clock = {
      running: false,
      lastTimeMs: 0,
      accumulator: 0,
      fixedStep: 1 / 60,
      frameCount: 0,
      fps: 0,
      fpsTimer: 0
    };

    this.input = new KeyboardInput();

    // UI layers
    this.hud = new HUD(this.uiRootEl);

    this.dialogueBox = new DialogueBox(this.uiRootEl);
    this.dialogue = new DialogueRunner({ box: this.dialogueBox });

    this.menu = new MenuOverlay(this.uiRootEl, {
      onReturnToTitle: () => {
        this.hud.setInteractPrompt?.({ visible: false });
        this.stateManager.change('title');
      },
      onSave: () => {
        this.hud.setToast('Save not implemented yet.', 1200);
      },
      onVolumeChange: (v) => {
        this.state.settings.masterVolume = v;
      }
    });

    this.itemPopup = new ItemPopup(this.uiRootEl);

    this.stateManager = new StateManager(this);

    this.renderer = this._createRenderer();
    this.mountEl.appendChild(this.renderer.domElement);

    this._bindResize();
    this._registerScenes();

    this._rafId = null;
    this._boundLoop = this._loop.bind(this);

    this._viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  _createRenderer() {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x06070a, 1);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    renderer.shadowMap.enabled = false;
    renderer.domElement.classList.add('vo-canvas');

    return renderer;
  }

  _registerScenes() {
    this.stateManager.register('boot', () => new BootScene(this));
    this.stateManager.register('title', () => new TitleScene(this));
    this.stateManager.register('field', () => new FieldScene(this));
  }

  _bindResize() {
    this._boundResize = () => this._handleResize();
    window.addEventListener('resize', this._boundResize);
  }

  _handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this._viewport.width = width;
    this._viewport.height = height;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);

    this.stateManager.resize(width, height);
    this.hud.onResize(width, height);
  }

  start() {
    if (this.clock.running) return;

    this.input.attach();

    this.hud.mount();
    this.dialogueBox.mount();
    this.menu.mount();
    this.itemPopup.mount();

    this.stateManager.change('boot');

    this.clock.running = true;
    this.clock.lastTimeMs = performance.now();
    this._rafId = requestAnimationFrame(this._boundLoop);
  }

  _loop(nowMs) {
    if (!this.clock.running) return;

    let deltaSec = (nowMs - this.clock.lastTimeMs) / 1000;
    this.clock.lastTimeMs = nowMs;
    deltaSec = Math.min(deltaSec, 0.1);

    this.clock.accumulator += deltaSec;
    this.clock.fpsTimer += deltaSec;
    this.clock.frameCount += 1;

    if (this.clock.fpsTimer >= 0.25) {
      this.clock.fps = this.clock.frameCount / this.clock.fpsTimer;
      this.clock.frameCount = 0;
      this.clock.fpsTimer = 0;
    }

    while (this.clock.accumulator >= this.clock.fixedStep) {
      const dt = this.clock.fixedStep;

      this.stateManager.update(dt);

      // Update dialogue + popups
      this.dialogue.update(dt);
      this.itemPopup.update(dt);

      // Keep menu data fresh
      this.menu.setData({
        inventory: this.state.getInventoryList(),
        settings: this.state.settings
      });

      const actions = this._getRawActions();

      // 1) Dialogue gets priority
      if (this.dialogue.isActive()) {
        if (actions.confirmPressed) this.dialogue.handleConfirm();
        if (actions.cancelPressed) this.dialogue.handleCancel();
        this.clock.accumulator -= dt;
        continue;
      }

      // 2) Menu toggle logic (fixes Esc opening + instant closing)
      const inGameplay = this.stateManager.currentKey === 'field';

      if (inGameplay) {
        // Open menu
        if (!this.menu.isOpen()) {
          if (actions.inventoryPressed) {
            this.hud.setInteractPrompt?.({ visible: false });
            this.menu.open({ tabKey: 'items' });
            // IMPORTANT: do NOT also pass this same Esc press into menu handling this frame
          } else if (actions.menuPressed) {
            this.hud.setInteractPrompt?.({ visible: false });
            this.menu.open({ tabKey: 'items' });
            // IMPORTANT: do NOT call menu.handleInput on the same frame
          }
        } else {
          // Close menu with Esc
          if (actions.menuPressed) {
            this.menu.close();
          } else {
            // Let menu consume inputs (Up/Down/Left/Right/Enter/Backspace)
            this.menu.handleInput(actions);
          }
        }
      }

      this.clock.accumulator -= dt;
    }

    const active = this.stateManager.getActiveRenderTarget();
    if (active) this.renderer.render(active.scene, active.camera);

    const hudData = this.stateManager.getHUDData();
    this.hud.update({ ...hudData, fps: this.clock.fps });

    this.input.endFrame();
    this._rafId = requestAnimationFrame(this._boundLoop);
  }

  _getRawActions() {
    return this.input.getActions();
  }

  // Scene-facing actions: lock movement/interact while dialogue or menu open
  getInputActions() {
    const a = this._getRawActions();

    if (this.dialogue.isActive() || this.menu.isOpen()) {
      return {
        ...a,
        move: { x: 0, z: 0 },
        run: false,
        interactPressed: false
      };
    }

    return a;
  }

  getViewport() {
    return { width: this._viewport.width, height: this._viewport.height };
  }
}
