import * as THREE from 'three';
import { StateManager } from './StateManager.js';
import { BootScene } from '../scenes/BootScene.js';
import { FieldScene } from '../scenes/FieldScene.js';
import { HUD } from '../ui/HUD.js';

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

    if (preventCodes.has(code)) {
      event.preventDefault();
    }

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

  wasReleased(...codes) {
    return codes.some((code) => this.released.has(code));
  }

  getMoveVector() {
    let x = 0;
    let z = 0;

    if (this.isDown('KeyA', 'ArrowLeft')) x -= 1;
    if (this.isDown('KeyD', 'ArrowRight')) x += 1;
    if (this.isDown('KeyW', 'ArrowUp')) z -= 1;
    if (this.isDown('KeyS', 'ArrowDown')) z += 1;

    // Normalize diagonal movement
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
    this.hud = new HUD(this.uiRootEl);
    this.stateManager = new StateManager(this);

    this.renderer = this._createRenderer();
    this.mountEl.appendChild(this.renderer.domElement);

    this._bindResize();
    this._registerScenes();

    this._rafId = null;
    this._boundLoop = this._loop.bind(this);

    // Shared scratch values (avoids extra allocations)
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

    // Modern color/tone settings for better readability
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // We can enable shadows later; kept off for starter perf simplicity
    renderer.shadowMap.enabled = false;

    renderer.domElement.classList.add('vo-canvas');

    return renderer;
  }

  _registerScenes() {
    this.stateManager.register('boot', () => new BootScene(this));
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

    // Clamp huge frame jumps (tab switch, lag spike)
    deltaSec = Math.min(deltaSec, 0.1);

    this.clock.accumulator += deltaSec;
    this.clock.fpsTimer += deltaSec;
    this.clock.frameCount += 1;

    if (this.clock.fpsTimer >= 0.25) {
      this.clock.fps =
        this.clock.frameCount / this.clock.fpsTimer;
      this.clock.frameCount = 0;
      this.clock.fpsTimer = 0;
    }

    // Fixed-step updates
    while (this.clock.accumulator >= this.clock.fixedStep) {
      this.stateManager.update(this.clock.fixedStep);
      this.clock.accumulator -= this.clock.fixedStep;
    }

    // Render current scene
    const active = this.stateManager.getActiveRenderTarget();
    if (active) {
      this.renderer.render(active.scene, active.camera);
    }

    // Update HUD after simulation/render so it reflects latest values
    const hudData = this.stateManager.getHUDData();
    this.hud.update({
      ...hudData,
      fps: this.clock.fps
    });

    // Clear one-frame input (pressed/released)
    this.input.endFrame();

    this._rafId = requestAnimationFrame(this._boundLoop);
  }

  getInputActions() {
    return this.input.getActions();
  }

  getViewport() {
    return {
      width: this._viewport.width,
      height: this._viewport.height
    };
  }
}
