import * as THREE from 'three';
import { StateManager } from './StateManager.js';
import { BootScene } from '../scenes/BootScene.js';
import { TitleScene } from '../scenes/TitleScene.js';
import { FieldScene } from '../scenes/FieldScene.js';
import { HUD } from '../ui/HUD.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { DialogueRunner } from './DialogueRunner.js';

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

    if (!this.down.has(code)) {
      this.pressed.add(code);
    }

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

      // Menu navigation (one-press)
      navUpPressed: this.wasPressed('ArrowUp', 'KeyW'),
      navDownPressed: this.wasPressed('ArrowDown', 'KeyS'),
      navLeftPressed: this.wasPressed('ArrowLeft', 'KeyA'),
      navRightPressed: this.wasPressed('ArrowRight', 'KeyD'),

      // Common actions (one-press)
      confirmPressed: this.wasPressed('Enter', 'Space'),
      cancelPressed: this.wasPressed('Escape', 'Backspace'),
      interactPressed: this.wasPressed('KeyE', 'Enter')
    };
  }
}

export class Game {
  constructor({ mountEl, uiRootEl }) {
    this.mountEl = mountEl;
    this.uiRootEl = uiRootEl;

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

    // HUD
    this.hud = new HUD(this.uiRootEl);

    // Dialogue UI + Runner (separate from HUD, but shares the same ui-root)
    this.dialogueBox = new DialogueBox(this.uiRootEl);
    this.dialogue = new DialogueRunner({ box: this.dialogueBox });

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
    this.dialogueBox?.onResize?.(width, height);
  }

  start() {
    if (this.clock.running) return;

    this.input.attach();

    // Mount UI layers
    this.hud.mount();
    this.dialogueBox.mount();

    this.stateManager.change('boot');

    this.clock.running = true;
    this.clock.lastTimeMs = performance.now();
    this._rafId = requestAnimationFrame(this._boundLoop);
  }

  stop() {
    this.clock.running = false;

    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this.input.detach();
    window.removeEventListener('resize', this._boundResize);
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

      // Scene update
      this.stateManager.update(dt);

      // Dialogue update (typewriter)
      this.dialogue.update(dt);

      // Dialogue input handling (confirm/cancel)
      const actions = this.getInputActions();
      if (this.dialogue.isActive()) {
        if (actions.confirmPressed) this.dialogue.handleConfirm();
        if (actions.cancelPressed) this.dialogue.handleCancel();
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

  /**
   * Returns actions, but automatically "locks" movement while dialogue is active.
   * Dialogue still receives confirm/cancel.
   */
  getInputActions() {
    const a = this.input.getActions();

    if (this.dialogue.isActive()) {
      return {
        ...a,
        move: { x: 0, z: 0 },
        run: false,
        interactPressed: false,
        navUpPressed: false,
        navDownPressed: false,
        navLeftPressed: false,
        navRightPressed: false
      };
    }

    return a;
  }

  getViewport() {
    return { width: this._viewport.width, height: this._viewport.height };
  }
}
