export class DialogueRunner {
  constructor({ box }) {
    this.box = box;

    this.active = false;
    this.lines = [];
    this.index = 0;

    this.onClose = null;
  }

  isActive() {
    return this.active;
  }

  start(lines, { onClose = null } = {}) {
    if (!Array.isArray(lines) || lines.length === 0) return;

    this.active = true;
    this.lines = lines.map((l) => ({
      speaker: l?.speaker ?? '',
      text: l?.text ?? ''
    }));
    this.index = 0;
    this.onClose = typeof onClose === 'function' ? onClose : null;

    this.box.show();
    this.box.setLine(this.lines[this.index]);
  }

  close() {
    if (!this.active) return;

    this.active = false;
    this.lines = [];
    this.index = 0;

    this.box.hide();

    if (this.onClose) {
      const fn = this.onClose;
      this.onClose = null;
      fn();
    }
  }

  update(dt) {
    if (!this.active) return;
    this.box.update(dt);
  }

  handleConfirm() {
    if (!this.active) return;

    // If still typing, finish current line instantly
    if (this.box.isTyping()) {
      this.box.finishTyping();
      return;
    }

    // Otherwise advance to next line
    this.index += 1;

    if (this.index >= this.lines.length) {
      this.close();
      return;
    }

    this.box.setLine(this.lines[this.index]);
  }

  handleCancel() {
    if (!this.active) return;
    this.close();
  }
}
