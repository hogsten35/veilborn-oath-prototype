function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class ItemPopup {
  constructor(rootEl) {
    this.rootEl = rootEl;
    this.mounted = false;

    this.queue = [];
    this.active = null;

    this.elements = {
      root: null,
      card: null,
      title: null,
      line: null
    };
  }

  mount() {
    if (this.mounted) return;

    const root = document.createElement('div');
    root.className = 'vo-itempop';
    root.setAttribute('aria-hidden', 'true');

    root.innerHTML = `
      <div class="vo-itempop__card">
        <div class="vo-itempop__title" data-role="title">Obtained</div>
        <div class="vo-itempop__line" data-role="line">—</div>
      </div>
    `;

    this.rootEl.appendChild(root);

    this.elements.root = root;
    this.elements.card = root.querySelector('.vo-itempop__card');
    this.elements.title = root.querySelector('[data-role="title"]');
    this.elements.line = root.querySelector('[data-role="line"]');

    this._setVisible(false, true);

    this.mounted = true;
  }

  enqueueObtained({ name, qty = 1 } = {}) {
    const q = clamp(Math.floor(qty || 1), 1, 999);
    const line = q === 1 ? `${name}` : `${name}  x${q}`;
    this.queue.push({
      title: 'Obtained',
      line,
      t: 0,
      showFor: 1.6
    });
  }

  update(dt) {
    if (!this.mounted) return;

    // If nothing active, pop next from queue
    if (!this.active && this.queue.length > 0) {
      this.active = this.queue.shift();
      this.active.t = 0;

      this.elements.title.textContent = this.active.title;
      this.elements.line.textContent = this.active.line;

      this._setVisible(true);
      return;
    }

    if (!this.active) return;

    this.active.t += dt;

    // hide after duration
    if (this.active.t >= this.active.showFor) {
      this.active = null;
      this._setVisible(false);
    }
  }

  _setVisible(on, immediate = false) {
    if (!this.elements.root) return;

    if (!on) {
      this.elements.root.classList.remove('is-visible');
      this.elements.root.setAttribute('aria-hidden', 'true');
      return;
    }

    this.elements.root.classList.add('is-visible');
    this.elements.root.setAttribute('aria-hidden', 'false');

    if (immediate) {
      // No special handling needed; class sets state.
    }
  }
}
