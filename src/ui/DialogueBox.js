function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class DialogueBox {
  constructor(rootEl) {
    this.rootEl = rootEl;
    this.mounted = false;

    this.isVisible = false;

    // Typewriter state
    this._typing = {
      active: false,
      fullText: '',
      shown: '',
      t: 0,
      cps: 45 // chars per second
    };

    this.elements = {
      root: null,
      speaker: null,
      text: null,
      prompt: null
    };
  }

  mount() {
    if (this.mounted) return;

    const root = document.createElement('div');
    root.className = 'vo-dialogue';
    root.setAttribute('aria-hidden', 'true');

    root.innerHTML = `
      <div class="vo-dialogue__panel">
        <div class="vo-dialogue__top">
          <div class="vo-dialogue__speaker" data-role="speaker">—</div>
        </div>
        <div class="vo-dialogue__body">
          <div class="vo-dialogue__text" data-role="text"></div>
        </div>
        <div class="vo-dialogue__bottom">
          <div class="vo-dialogue__prompt" data-role="prompt" aria-hidden="true">◆</div>
        </div>
      </div>
    `;

    this.rootEl.appendChild(root);

    this.elements.root = root;
    this.elements.speaker = root.querySelector('[data-role="speaker"]');
    this.elements.text = root.querySelector('[data-role="text"]');
    this.elements.prompt = root.querySelector('[data-role="prompt"]');

    this.hide(true);

    this.mounted = true;
  }

  show() {
    if (!this.mounted) return;
    this.isVisible = true;
    this.elements.root.classList.add('is-visible');
    this.elements.root.setAttribute('aria-hidden', 'false');
  }

  hide(immediate = false) {
    if (!this.mounted) return;
    this.isVisible = false;
    this._typing.active = false;

    if (immediate) {
      this.elements.root.classList.remove('is-visible');
      this.elements.root.setAttribute('aria-hidden', 'true');
      return;
    }

    this.elements.root.classList.remove('is-visible');
    this.elements.root.setAttribute('aria-hidden', 'true');
  }

  setLine({ speaker = '', text = '' }) {
    if (!this.mounted) return;

    // Speaker
    this.elements.speaker.textContent = speaker?.trim() ? speaker : '—';

    // Start typing
    this._typing.active = true;
    this._typing.fullText = String(text ?? '');
    this._typing.shown = '';
    this._typing.t = 0;

    this._applyText('');
    this._setPrompt(false);
  }

  setCharsPerSecond(cps) {
    this._typing.cps = clamp(Number(cps) || 45, 10, 200);
  }

  isTyping() {
    return this._typing.active;
  }

  finishTyping() {
    if (!this.mounted) return;
    if (!this._typing.active) return;

    this._typing.active = false;
    this._typing.shown = this._typing.fullText;
    this._applyText(this._typing.shown);
    this._setPrompt(true);
  }

  update(dt) {
    if (!this.mounted) return;
    if (!this.isVisible) return;
    if (!this._typing.active) return;

    this._typing.t += dt;
    const totalChars = this._typing.fullText.length;
    const charsToShow = Math.min(
      totalChars,
      Math.floor(this._typing.t * this._typing.cps)
    );

    const nextShown = this._typing.fullText.slice(0, charsToShow);

    if (nextShown !== this._typing.shown) {
      this._typing.shown = nextShown;
      this._applyText(this._typing.shown);
    }

    if (charsToShow >= totalChars) {
      this._typing.active = false;
      this._setPrompt(true);
    }
  }

  _applyText(text) {
    this.elements.text.textContent = text;
  }

  _setPrompt(on) {
    if (!this.elements.prompt) return;
    this.elements.prompt.classList.toggle('is-on', !!on);
  }
}
