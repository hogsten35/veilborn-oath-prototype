function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class HUD {
  constructor(rootEl) {
    this.rootEl = rootEl;
    this.mounted = false;

    this.toastTimeoutId = null;
    this.mode = 'game'; // game | title | boot

    this.elements = {
      root: null,
      topLeftPanel: null,
      topRightPanel: null,
      bottomPanel: null,
      stateValue: null,
      locationValue: null,
      statusValue: null,
      hintValue: null,
      fpsValue: null,
      toast: null,
      fade: null,

      titleScreen: null,
      titleMenuOptions: [],
      settingsOptions: [],
      volumeValue: null,
      volumeFill: null
    };
  }

  mount() {
    if (this.mounted) return;

    const root = document.createElement('div');
    root.className = 'vo-ui mode-game';

    // Top-left
    const topLeft = document.createElement('section');
    topLeft.className = 'vo-panel vo-panel--top-left';
    topLeft.innerHTML = `
      <div class="vo-crest">
        <div class="vo-crest__sigil" aria-hidden="true"></div>
        <div class="vo-crest__text">
          <div class="vo-label">Prototype</div>
          <div class="vo-title">Veilborn Oath</div>
        </div>
      </div>

      <div class="vo-row">
        <span class="vo-key">Location</span>
        <span class="vo-value" data-role="location">—</span>
      </div>

      <div class="vo-row">
        <span class="vo-key">Scene</span>
        <span class="vo-value" data-role="state">—</span>
      </div>

      <div class="vo-row vo-row--status">
        <span class="vo-key">Status</span>
        <span class="vo-value" data-role="status">—</span>
      </div>
    `;

    // Top-right
    const topRight = document.createElement('section');
    topRight.className = 'vo-panel vo-panel--top-right';
    topRight.innerHTML = `
      <div class="vo-panel__header">Controls</div>
      <div class="vo-help-list">
        <div><span>Move</span><strong>WASD / Arrows</strong></div>
        <div><span>Run</span><strong>Shift</strong></div>
        <div><span>Confirm</span><strong>Enter / Space</strong></div>
        <div><span>Cancel</span><strong>Esc</strong></div>
      </div>
      <div class="vo-divider"></div>
      <div class="vo-row">
        <span class="vo-key">FPS</span>
        <span class="vo-value" data-role="fps">0</span>
      </div>
    `;

    // Bottom
    const bottom = document.createElement('section');
    bottom.className = 'vo-panel vo-panel--bottom';
    bottom.innerHTML = `
      <div class="vo-bottom-grid">
        <div class="vo-party-card">
          <div class="vo-party-card__header">
            <span class="vo-party-name">Rian (Placeholder)</span>
            <span class="vo-party-oath">Oath: Witness</span>
          </div>

          <div class="vo-bar-group">
            <div class="vo-bar-label">HP</div>
            <div class="vo-bar"><div class="vo-bar-fill vo-bar-fill--hp" style="width: 78%"></div></div>
            <div class="vo-bar-num">120 / 154</div>
          </div>

          <div class="vo-bar-group">
            <div class="vo-bar-label">MP</div>
            <div class="vo-bar"><div class="vo-bar-fill vo-bar-fill--mp" style="width: 55%"></div></div>
            <div class="vo-bar-num">22 / 40</div>
          </div>
        </div>

        <div class="vo-hint-card">
          <div class="vo-panel__header">Current Hint</div>
          <div class="vo-hint-text" data-role="hint">—</div>
          <div class="vo-subhint">(Later: quests, interact prompts, battle triggers.)</div>
        </div>
      </div>
    `;

    // Title screen
    const titleScreen = document.createElement('div');
    titleScreen.className = 'vo-title-screen';
    titleScreen.innerHTML = `
      <div class="vo-title-card">
        <div class="vo-title-header">
          <div class="vo-title-sigil" aria-hidden="true"></div>
          <div>
            <div class="vo-title-name">Veilborn Oath</div>
            <div class="vo-title-tag">A memory-bound pilgrimage through rust and myth.</div>
          </div>
        </div>

        <div class="vo-title-divider"></div>

        <div class="vo-title-body">
          <div class="vo-title-menu">
            <div class="vo-option" data-role="menuOpt" data-id="new">New Game</div>
            <div class="vo-option is-disabled" data-role="menuOpt" data-id="continue">Continue</div>
            <div class="vo-option" data-role="menuOpt" data-id="settings">Settings</div>
            <div class="vo-option" data-role="menuOpt" data-id="credits">Credits</div>
          </div>

          <div class="vo-title-settings">
            <div class="vo-settings-row" data-role="setOpt" data-id="volume">
              <div class="vo-settings-left">
                <div class="vo-settings-key">Master Volume</div>
                <div class="vo-settings-sub">Left/Right adjusts</div>
              </div>
              <div class="vo-settings-right">
                <div class="vo-settings-val" data-role="volumeVal">100%</div>
                <div class="vo-slider" aria-hidden="true">
                  <div class="vo-slider-fill" data-role="volumeFill" style="width: 100%"></div>
                </div>
              </div>
            </div>

            <div class="vo-settings-row vo-settings-back" data-role="setOpt" data-id="back">
              Back
            </div>
          </div>

          <div class="vo-title-credits">
            <div class="vo-credits-block">
              <div class="vo-credits-title">Prototype Credits</div>
              <div class="vo-credits-line">Design / Direction: You</div>
              <div class="vo-credits-line">Tech: Three.js + Vite</div>
              <div class="vo-credits-line">World: The Pallisade</div>
              <div class="vo-credits-line vo-credits-note">Press Esc to return</div>
            </div>
          </div>
        </div>

        <div class="vo-title-footer">
          <div class="vo-title-hint">Up/Down to navigate • Enter to select • Esc to back</div>
          <div class="vo-title-build">Prototype Build</div>
        </div>
      </div>
    `;

    // Toast
    const toast = document.createElement('div');
    toast.className = 'vo-toast';
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-hidden', 'true');

    // Fade overlay
    const fade = document.createElement('div');
    fade.className = 'vo-fade';
    fade.style.opacity = '0';

    root.appendChild(topLeft);
    root.appendChild(topRight);
    root.appendChild(bottom);
    root.appendChild(titleScreen);
    root.appendChild(toast);
    root.appendChild(fade);

    this.rootEl.innerHTML = '';
    this.rootEl.appendChild(root);

    // Cache refs
    this.elements.root = root;
    this.elements.topLeftPanel = topLeft;
    this.elements.topRightPanel = topRight;
    this.elements.bottomPanel = bottom;
    this.elements.stateValue = root.querySelector('[data-role="state"]');
    this.elements.locationValue = root.querySelector('[data-role="location"]');
    this.elements.statusValue = root.querySelector('[data-role="status"]');
    this.elements.hintValue = root.querySelector('[data-role="hint"]');
    this.elements.fpsValue = root.querySelector('[data-role="fps"]');
    this.elements.toast = toast;
    this.elements.fade = fade;

    this.elements.titleScreen = titleScreen;
    this.elements.titleMenuOptions = Array.from(titleScreen.querySelectorAll('[data-role="menuOpt"]'));
    this.elements.settingsOptions = Array.from(titleScreen.querySelectorAll('[data-role="setOpt"]'));
    this.elements.volumeValue = titleScreen.querySelector('[data-role="volumeVal"]');
    this.elements.volumeFill = titleScreen.querySelector('[data-role="volumeFill"]');

    this.mounted = true;
  }

  setMode(mode) {
    if (!this.mounted) return;
    this.mode = mode;

    const root = this.elements.root;
    root.classList.remove('mode-game', 'mode-title', 'mode-boot');

    if (mode === 'title') root.classList.add('mode-title');
    else if (mode === 'boot') root.classList.add('mode-boot');
    else root.classList.add('mode-game');

    // Title visibility
    if (mode === 'title') this.elements.titleScreen.classList.add('is-visible');
    else this.elements.titleScreen.classList.remove('is-visible');
  }

  setFade(alpha) {
    if (!this.mounted || !this.elements.fade) return;
    this.elements.fade.style.opacity = String(clamp(alpha, 0, 1));
  }

  showTitleScreen({ screen = 'main', selection = 0, canContinue = false, masterVolume = 100 } = {}) {
    if (!this.mounted) return;

    // Enable/disable Continue
    const cont = this.elements.titleMenuOptions.find((n) => n.dataset.id === 'continue');
    if (cont) {
      cont.classList.toggle('is-disabled', !canContinue);
    }

    // Switch visible section
    const title = this.elements.titleScreen;
    title.classList.remove('sub-main', 'sub-settings', 'sub-credits');

    if (screen === 'settings') title.classList.add('sub-settings');
    else if (screen === 'credits') title.classList.add('sub-credits');
    else title.classList.add('sub-main');

    // Volume UI
    const vol = clamp(masterVolume, 0, 100);
    if (this.elements.volumeValue) this.elements.volumeValue.textContent = `${vol}%`;
    if (this.elements.volumeFill) this.elements.volumeFill.style.width = `${vol}%`;

    // Selection highlight depends on screen
    this._clearSelections();
    if (screen === 'settings') {
      const el = this.elements.settingsOptions[selection];
      if (el) el.classList.add('is-selected');
    } else if (screen === 'credits') {
      // no selection needed
    } else {
      const el = this.elements.titleMenuOptions[selection];
      if (el) el.classList.add('is-selected');
    }
  }

  _clearSelections() {
    for (const el of this.elements.titleMenuOptions) el.classList.remove('is-selected');
    for (const el of this.elements.settingsOptions) el.classList.remove('is-selected');
  }

  update({ sceneName = '—', locationName = '—', statusText = '—', hintText = '', fps = 0 } = {}) {
    if (!this.mounted) return;

    if (this.elements.stateValue) this.elements.stateValue.textContent = sceneName;
    if (this.elements.locationValue) this.elements.locationValue.textContent = locationName;
    if (this.elements.statusValue) this.elements.statusValue.textContent = statusText;
    if (this.elements.hintValue && hintText) this.elements.hintValue.textContent = hintText;
    if (this.elements.fpsValue) this.elements.fpsValue.textContent = String(Math.round(fps || 0));
  }

  setToast(message, durationMs = 1200) {
    if (!this.mounted || !this.elements.toast) return;

    const toast = this.elements.toast;
    toast.textContent = message;
    toast.classList.add('is-visible');
    toast.setAttribute('aria-hidden', 'false');

    if (this.toastTimeoutId) clearTimeout(this.toastTimeoutId);
    this.toastTimeoutId = setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.setAttribute('aria-hidden', 'true');
    }, durationMs);
  }

  onResize() {
    // later
  }
}
