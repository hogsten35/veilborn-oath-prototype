function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class MenuOverlay {
  constructor(rootEl, { onReturnToTitle = null, onSave = null, onVolumeChange = null } = {}) {
    this.rootEl = rootEl;
    this.mounted = false;

    this.opened = false;

    this.tabs = [
      { key: 'items', label: 'Items' },
      { key: 'status', label: 'Status' },
      { key: 'settings', label: 'Settings' },
      { key: 'system', label: 'System' }
    ];

    this.tabIndex = 0;

    // per-tab selection
    this.sel = {
      items: 0,
      settings: 0,
      system: 0
    };

    this.data = {
      inventory: [],
      settings: { masterVolume: 100 }
    };

    this.onReturnToTitle = typeof onReturnToTitle === 'function' ? onReturnToTitle : null;
    this.onSave = typeof onSave === 'function' ? onSave : null;
    this.onVolumeChange = typeof onVolumeChange === 'function' ? onVolumeChange : null;

    this.elements = {
      root: null,
      panel: null,
      tabs: [],
      title: null,

      // items
      itemsList: null,
      itemName: null,
      itemDesc: null,
      itemQty: null,

      // status
      statusBlock: null,

      // settings
      volumeVal: null,
      volumeFill: null,
      settingsRows: [],

      // system
      systemRows: []
    };
  }

  mount() {
    if (this.mounted) return;

    const root = document.createElement('div');
    root.className = 'vo-menu';
    root.setAttribute('aria-hidden', 'true');

    root.innerHTML = `
      <div class="vo-menu__panel">
        <div class="vo-menu__header">
          <div class="vo-menu__title" data-role="title">Menu</div>
          <div class="vo-menu__hint">Esc: Close • I: Items</div>
        </div>

        <div class="vo-menu__tabs" data-role="tabs">
          ${this.tabs.map(t => `<div class="vo-menu__tab" data-role="tab" data-key="${t.key}">${t.label}</div>`).join('')}
        </div>

        <div class="vo-menu__content">
          <div class="vo-menu__left">
            <!-- Items list -->
            <div class="vo-menu__section vo-menu__items" data-role="itemsSection">
              <div class="vo-menu__list" data-role="itemsList"></div>
            </div>

            <!-- Status -->
            <div class="vo-menu__section vo-menu__status" data-role="statusSection">
              <div class="vo-menu__statusBlock" data-role="statusBlock">
                <div class="vo-menu__statusTitle">Party Status (Prototype)</div>
                <div class="vo-menu__statusLine"><span>Rian</span><span>Lv 1</span></div>
                <div class="vo-menu__statusLine"><span>HP</span><span>120 / 154</span></div>
                <div class="vo-menu__statusLine"><span>MP</span><span>22 / 40</span></div>
                <div class="vo-menu__statusNote">Full status screen comes later.</div>
              </div>
            </div>

            <!-- Settings -->
            <div class="vo-menu__section vo-menu__settings" data-role="settingsSection">
              <div class="vo-menu__row" data-role="setRow" data-id="volume">
                <div class="vo-menu__rowLeft">
                  <div class="vo-menu__rowKey">Master Volume</div>
                  <div class="vo-menu__rowSub">Left/Right adjusts</div>
                </div>
                <div class="vo-menu__rowRight">
                  <div class="vo-menu__rowVal" data-role="volumeVal">100%</div>
                  <div class="vo-menu__slider">
                    <div class="vo-menu__sliderFill" data-role="volumeFill" style="width: 100%"></div>
                  </div>
                </div>
              </div>

              <div class="vo-menu__row vo-menu__row--center" data-role="setRow" data-id="back">
                Back
              </div>
            </div>

            <!-- System -->
            <div class="vo-menu__section vo-menu__system" data-role="systemSection">
              <div class="vo-menu__list" data-role="systemList">
                <div class="vo-menu__sysRow is-disabled" data-role="sysRow" data-id="save">Save (Coming Soon)</div>
                <div class="vo-menu__sysRow" data-role="sysRow" data-id="returnTitle">Return to Title</div>
              </div>
            </div>
          </div>

          <div class="vo-menu__right">
            <div class="vo-menu__detailCard">
              <div class="vo-menu__detailName" data-role="itemName">—</div>
              <div class="vo-menu__detailQty" data-role="itemQty"></div>
              <div class="vo-menu__detailDesc" data-role="itemDesc">Select an item to view details.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.rootEl.appendChild(root);

    this.elements.root = root;
    this.elements.title = root.querySelector('[data-role="title"]');
    this.elements.tabs = Array.from(root.querySelectorAll('[data-role="tab"]'));

    this.elements.itemsList = root.querySelector('[data-role="itemsList"]');
    this.elements.itemName = root.querySelector('[data-role="itemName"]');
    this.elements.itemDesc = root.querySelector('[data-role="itemDesc"]');
    this.elements.itemQty = root.querySelector('[data-role="itemQty"]');

    this.elements.volumeVal = root.querySelector('[data-role="volumeVal"]');
    this.elements.volumeFill = root.querySelector('[data-role="volumeFill"]');
    this.elements.settingsRows = Array.from(root.querySelectorAll('[data-role="setRow"]'));

    this.elements.systemRows = Array.from(root.querySelectorAll('[data-role="sysRow"]'));

    this._setVisible(false, true);
    this._render();

    this.mounted = true;
  }

  isOpen() {
    return this.opened;
  }

  open({ tabKey = 'items' } = {}) {
    if (!this.mounted) return;
    this.opened = true;
    this.setTab(tabKey);
    this._setVisible(true);
    this._render();
  }

  close() {
    if (!this.mounted) return;
    this.opened = false;
    this._setVisible(false);
  }

  setTab(tabKey) {
    const idx = this.tabs.findIndex(t => t.key === tabKey);
    this.tabIndex = idx >= 0 ? idx : 0;
    this._render();
  }

  setData({ inventory, settings } = {}) {
    if (Array.isArray(inventory)) this.data.inventory = inventory;
    if (settings) this.data.settings = settings;
    this._render();
  }

  handleInput(actions) {
    if (!this.opened) return false;

    const tabKey = this.tabs[this.tabIndex].key;

    // Tab switching
    if (actions.navLeftPressed) {
      this.tabIndex = (this.tabIndex - 1 + this.tabs.length) % this.tabs.length;
      this._render();
      return true;
    }
    if (actions.navRightPressed) {
      this.tabIndex = (this.tabIndex + 1) % this.tabs.length;
      this._render();
      return true;
    }

    // Close
    if (actions.cancelPressed) {
      this.close();
      return true;
    }

    // Per-tab navigation
    if (tabKey === 'items') {
      const listLen = Math.max(1, this.data.inventory.length);
      if (actions.navUpPressed) {
        this.sel.items = (this.sel.items - 1 + listLen) % listLen;
        this._render();
        return true;
      }
      if (actions.navDownPressed) {
        this.sel.items = (this.sel.items + 1) % listLen;
        this._render();
        return true;
      }
      // confirm does nothing for now
      if (actions.confirmPressed) return true;
    }

    if (tabKey === 'settings') {
      const rows = 2; // volume, back
      if (actions.navUpPressed) {
        this.sel.settings = (this.sel.settings - 1 + rows) % rows;
        this._render();
        return true;
      }
      if (actions.navDownPressed) {
        this.sel.settings = (this.sel.settings + 1) % rows;
        this._render();
        return true;
      }

      // Adjust volume when volume row selected
      if (this.sel.settings === 0) {
        if (actions.navLeftPressed || actions.navRightPressed) {
          const delta = actions.navRightPressed ? 5 : -5;
          const next = clamp((this.data.settings.masterVolume ?? 100) + delta, 0, 100);
          this.data.settings.masterVolume = next;
          this.onVolumeChange?.(next);
          this._render();
          return true;
        }
      }

      // Back row
      if (actions.confirmPressed && this.sel.settings === 1) {
        this.setTab('items');
        return true;
      }

      if (actions.confirmPressed) return true;
    }

    if (tabKey === 'system') {
      const rows = this.elements.systemRows.length || 2;
      if (actions.navUpPressed) {
        this.sel.system = (this.sel.system - 1 + rows) % rows;
        this._render();
        return true;
      }
      if (actions.navDownPressed) {
        this.sel.system = (this.sel.system + 1) % rows;
        this._render();
        return true;
      }

      if (actions.confirmPressed) {
        const row = this.elements.systemRows[this.sel.system];
        const id = row?.dataset?.id;

        if (id === 'save') {
          // disabled row
          return true;
        }
        if (id === 'returnTitle') {
          this.close();
          this.onReturnToTitle?.();
          return true;
        }
        return true;
      }
    }

    // status tab consumes confirm/cancel only
    if (tabKey === 'status') {
      if (actions.confirmPressed) return true;
    }

    return false;
  }

  _render() {
    if (!this.mounted) return;

    // Tabs
    const activeKey = this.tabs[this.tabIndex].key;
    for (const t of this.elements.tabs) {
      t.classList.toggle('is-active', t.dataset.key === activeKey);
    }

    // Sections
    this.elements.root.classList.remove('tab-items', 'tab-status', 'tab-settings', 'tab-system');
    this.elements.root.classList.add(`tab-${activeKey}`);

    // Items list
    this._renderItems();

    // Settings
    this._renderSettings();

    // System
    this._renderSystem();
  }

  _renderItems() {
    const list = this.elements.itemsList;
    if (!list) return;

    const inv = this.data.inventory || [];
    list.innerHTML = '';

    if (inv.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vo-menu__item is-disabled';
      empty.textContent = '(Empty)';
      list.appendChild(empty);

      this.elements.itemName.textContent = 'Inventory';
      this.elements.itemQty.textContent = '';
      this.elements.itemDesc.textContent = 'You have no items yet.';
      return;
    }

    const sel = clamp(this.sel.items, 0, inv.length - 1);

    for (let i = 0; i < inv.length; i++) {
      const it = inv[i];
      const row = document.createElement('div');
      row.className = 'vo-menu__item';
      row.classList.toggle('is-selected', i === sel);
      row.innerHTML = `
        <span class="vo-menu__itemName">${it.name}</span>
        <span class="vo-menu__itemQty">x${it.qty}</span>
      `;
      list.appendChild(row);
    }

    const picked = inv[sel];
    this.elements.itemName.textContent = picked.name;
    this.elements.itemQty.textContent = `Quantity: ${picked.qty}`;
    this.elements.itemDesc.textContent = picked.desc || '';
  }

  _renderSettings() {
    const vol = clamp(this.data.settings.masterVolume ?? 100, 0, 100);
    if (this.elements.volumeVal) this.elements.volumeVal.textContent = `${vol}%`;
    if (this.elements.volumeFill) this.elements.volumeFill.style.width = `${vol}%`;

    // Row highlight
    for (let i = 0; i < this.elements.settingsRows.length; i++) {
      this.elements.settingsRows[i].classList.toggle('is-selected', i === this.sel.settings);
    }
  }

  _renderSystem() {
    // highlight system rows
    for (let i = 0; i < this.elements.systemRows.length; i++) {
      const row = this.elements.systemRows[i];
      row.classList.toggle('is-selected', i === this.sel.system);
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
      // nothing special required
    }
  }
}
