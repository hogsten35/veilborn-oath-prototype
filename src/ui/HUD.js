export class HUD {
  constructor(rootEl) {
    this.rootEl = rootEl;
    this.mounted = false;

    this.toastTimeoutId = null;

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
      toast: null
    };
  }

  mount() {
    if (this.mounted) return;

    const root = document.createElement('div');
    root.className = 'vo-ui';

    // Top-left info panel
    const topLeft = document.createElement('section');
    topLeft.className = 'vo-panel vo-panel--top-left';

    const crest = document.createElement('div');
    crest.className = 'vo-crest';
    crest.innerHTML = `
      <div class="vo-crest__sigil" aria-hidden="true"></div>
      <div class="vo-crest__text">
        <div class="vo-label">Prototype</div>
        <div class="vo-title">Veilborn Oath</div>
      </div>
    `;

    const locationRow = document.createElement('div');
    locationRow.className = 'vo-row';
    locationRow.innerHTML = `
      <span class="vo-key">Location</span>
      <span class="vo-value" data-role="location">—</span>
    `;

    const stateRow = document.createElement('div');
    stateRow.className = 'vo-row';
    stateRow.innerHTML = `
      <span class="vo-key">Scene</span>
      <span class="vo-value" data-role="state">—</span>
    `;

    const statusRow = document.createElement('div');
    statusRow.className = 'vo-row vo-row--status';
    statusRow.innerHTML = `
      <span class="vo-key">Status</span>
      <span class="vo-value" data-role="status">—</span>
    `;

    topLeft.appendChild(crest);
    topLeft.appendChild(locationRow);
    topLeft.appendChild(stateRow);
    topLeft.appendChild(statusRow);

    // Top-right controls/debug panel
    const topRight = document.createElement('section');
    topRight.className = 'vo-panel vo-panel--top-right';

    topRight.innerHTML = `
      <div class="vo-panel__header">Field Controls</div>
      <div class="vo-help-list">
        <div><span>Move</span><strong>WASD / Arrows</strong></div>
        <div><span>Run</span><strong>Shift</strong></div>
        <div><span>Interact</span><strong>E / Enter</strong></div>
        <div><span>Cancel</span><strong>Esc</strong></div>
      </div>
      <div class="vo-divider"></div>
      <div class="vo-row">
        <span class="vo-key">FPS</span>
        <span class="vo-value" data-role="fps">0</span>
      </div>
    `;

    // Bottom party / hint panel
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
          <div class="vo-hint-text" data-role="hint">
            Move around and test the field scene.
          </div>
          <div class="vo-subhint">
            (This panel will later show quest objectives, interact prompts, and battle triggers.)
          </div>
        </div>
      </div>
    `;

    // Toast
    const toast = document.createElement('div');
    toast.className = 'vo-toast';
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-hidden', 'true');

    root.appendChild(topLeft);
    root.appendChild(topRight);
    root.appendChild(bottom);
    root.appendChild(toast);

    this.rootEl.innerHTML = '';
    this.rootEl.appendChild(root);

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

    this.mounted = true;
  }

  onResize() {
    // Placeholder hook for future responsive logic
  }

  update({
    sceneName = '—',
    locationName = '—',
    statusText = '—',
    hintText = '',
    fps = 0
  } = {}) {
    if (!this.mounted) return;

    if (this.elements.stateValue) {
      this.elements.stateValue.textContent = sceneName;
    }

    if (this.elements.locationValue) {
      this.elements.locationValue.textContent = locationName;
    }

    if (this.elements.statusValue) {
      this.elements.statusValue.textContent = statusText;
    }

    if (this.elements.hintValue && hintText) {
      this.elements.hintValue.textContent = hintText;
    }

    if (this.elements.fpsValue) {
      this.elements.fpsValue.textContent = String(Math.round(fps || 0));
    }
  }

  setToast(message, durationMs = 1200) {
    if (!this.mounted || !this.elements.toast) return;

    const toast = this.elements.toast;
    toast.textContent = message;
    toast.classList.add('is-visible');
    toast.setAttribute('aria-hidden', 'false');

    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.setAttribute('aria-hidden', 'true');
    }, durationMs);
  }
}
