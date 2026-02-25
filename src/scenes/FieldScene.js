import * as THREE from 'three';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export class FieldScene {
  constructor(game) {
    this.game = game;

    this.displayName = 'Field';
    this.locationName = 'Gutterwake — East Canal (Prototype)';

    this.baseHintText = 'Move: WASD/Arrows • Run: Shift • Interact: E • Menu: Esc • Items: I';
    this.hintText = this.baseHintText;
    this.statusText = 'Explore the prototype street.';

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0d12, 8, 42);

    this.camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    this.elapsed = 0;

    this.player = {
      position: new THREE.Vector3(0, 0.35, 0),
      radius: 0.42,
      walkSpeed: 4.0,
      runMultiplier: 1.6
    };

    this._cameraDesired = new THREE.Vector3();
    this._cameraLook = new THREE.Vector3();

    this.blockers = [];
    this.animLights = [];
    this.decorSparks = [];

    this._fade = { active: false, alpha: 0, target: 0, speed: 2.8 };

    // Interactables
    this.interactables = [];
    this.activeInteractable = null;

    this._setupScene();
    this._setupFieldGeometry();
    this._setupPlayer();
    this._setupCamera();

    this._addNoticePostInteractable();
    this._addChestInteractable();
    this._addGateInteractable();
  }

  enter(params = {}) {
    this.game.hud.setMode('game');

    if (params.fromTitle) {
      this._fade.active = true;
      this._fade.alpha = 1;
      this._fade.target = 0;
      this.game.hud.setFade(1);
    } else {
      this.game.hud.setFade(0);
    }

    this.game.hud.setToast('Entered Field Scene', 900);
    this.game.hud.setInteractPrompt({ visible: false });
  }

  // ---------------------------
  // Environment
  // ---------------------------

  _setupScene() {
    const ambient = new THREE.AmbientLight(0x6f7d96, 0.45);
    this.scene.add(ambient);

    const moonKey = new THREE.DirectionalLight(0xa9c6ff, 0.8);
    moonKey.position.set(-5, 8, 3);
    this.scene.add(moonKey);

    const veilGlow = new THREE.PointLight(0x55e6d6, 0.35, 30);
    veilGlow.position.set(0, 4.5, 0);
    this.scene.add(veilGlow);

    const hazeGeo = new THREE.PlaneGeometry(30, 30);
    const hazeMat = new THREE.MeshBasicMaterial({
      color: 0x0d1116,
      transparent: true,
      opacity: 0.2
    });
    const haze = new THREE.Mesh(hazeGeo, hazeMat);
    haze.rotation.x = -Math.PI / 2;
    haze.position.y = 0.02;
    this.scene.add(haze);
  }

  _setupFieldGeometry() {
    const groundGeo = new THREE.PlaneGeometry(24, 18, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x171b22,
      metalness: 0.06,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);

    const canalGeo = new THREE.PlaneGeometry(24, 2.2);
    const canalMat = new THREE.MeshStandardMaterial({
      color: 0x10252b,
      emissive: 0x071316,
      metalness: 0.05,
      roughness: 0.85
    });

    const canal1 = new THREE.Mesh(canalGeo, canalMat);
    canal1.rotation.x = -Math.PI / 2;
    canal1.position.set(0, 0.01, -5.3);
    this.scene.add(canal1);

    const canal2 = new THREE.Mesh(canalGeo, canalMat.clone());
    canal2.rotation.x = -Math.PI / 2;
    canal2.position.set(0, 0.01, 4.8);
    this.scene.add(canal2);

    const stripGeo = new THREE.PlaneGeometry(22, 5.5);
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0x1d232d,
      metalness: 0.08,
      roughness: 0.82
    });
    const streetStrip = new THREE.Mesh(stripGeo, stripMat);
    streetStrip.rotation.x = -Math.PI / 2;
    streetStrip.position.set(0, 0.02, -0.2);
    this.scene.add(streetStrip);

    this._addWall({ x: 0, y: 1.25, z: -8.25, w: 24, h: 2.5, d: 0.5 });
    this._addWall({ x: 0, y: 1.25, z: 8.25, w: 24, h: 2.5, d: 0.5 });
    this._addWall({ x: -11.75, y: 1.25, z: 0, w: 0.5, h: 2.5, d: 16 });
    this._addWall({ x: 11.75, y: 1.25, z: 0, w: 0.5, h: 2.5, d: 16 });

    this._addCrateStack(-3.4, -1.2, 2);
    this._addCrateStack(4.0, 1.0, 3);
    this._addMachineBlock(0.8, 5.5, 1.8, 1.2, 1.1);

    this._addLamp(-8.2, -2.6, 0x77f6e2);
    this._addLamp(-2.2, 3.4, 0xc89bff);
    this._addLamp(5.3, -3.2, 0x77f6e2);
    this._addLamp(8.4, 2.8, 0xffc76a);

    this._addBackdropSilhouette(-7.5, -7.2, 2.2);
    this._addBackdropSilhouette(-2.4, -7.4, 3.0);
    this._addBackdropSilhouette(3.6, -7.1, 2.6);
    this._addBackdropSilhouette(8.5, -7.3, 3.2);

    this._spawnSparks(22);
  }

  _setupPlayer() {
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.7, 10);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x2b313d,
      metalness: 0.1,
      roughness: 0.75
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.copy(this.player.position);

    const coreGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xe6e1d5,
      emissive: 0x1d1710,
      metalness: 0.05,
      roughness: 0.35
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0.32, 0);

    const ringGeo = new THREE.TorusGeometry(0.28, 0.03, 8, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xba9560,
      emissive: 0x261b11,
      metalness: 0.7,
      roughness: 0.3
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -0.05, 0);

    base.add(core);
    base.add(ring);

    this.playerMesh = base;
    this.playerCore = core;
    this.playerRing = ring;

    this.scene.add(this.playerMesh);
  }

  _setupCamera() {
    this.camera.position.set(0, 8.5, 9.5);
    this.camera.lookAt(0, 0.5, 0);
  }

  // ---------------------------
  // Interactables
  // ---------------------------

  _registerInteractable(interactable) {
    this.interactables.push(interactable);
  }

  _findActiveInteractable() {
    if (this.game.dialogue.isActive() || this.game.menu.isOpen()) return null;

    const p = this.player.position;
    let best = null;
    let bestDist = Infinity;

    for (const it of this.interactables) {
      const enabled = typeof it.isEnabled === 'function' ? it.isEnabled() : true;
      if (!enabled) continue;

      const d = dist2D(p, it.position);
      if (d <= it.radius && d < bestDist) {
        best = it;
        bestDist = d;
      }
    }
    return best;
  }

  _applyInteractPrompt(active) {
    if (active) {
      const hint = typeof active.getHintText === 'function'
        ? active.getHintText()
        : `Press E to ${active.label}.`;

      this.hintText = hint;
      this.game.hud.setInteractPrompt({
        visible: true,
        text: active.label
      });
    } else {
      this.hintText = this.baseHintText;
      this.game.hud.setInteractPrompt({ visible: false });
    }
  }

  _addNoticePostInteractable() {
    const pos = new THREE.Vector3(-6.2, 0, -0.4);

    const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.25, 10);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x3c434f,
      metalness: 0.25,
      roughness: 0.75
    });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(pos.x, 0.62, pos.z);
    this.scene.add(post);

    const boardGeo = new THREE.BoxGeometry(0.72, 0.42, 0.06);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x2a2018,
      metalness: 0.05,
      roughness: 0.95
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(pos.x, 1.05, pos.z);
    this.scene.add(board);

    const plaqueGeo = new THREE.PlaneGeometry(0.62, 0.3);
    const plaqueMat = new THREE.MeshStandardMaterial({
      color: 0x75e7d8,
      emissive: 0x143a38,
      metalness: 0.0,
      roughness: 0.25
    });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, 0, 0.04);
    board.add(plaque);

    const notice = {
      id: 'notice_post',
      label: 'Read Notice',
      position: pos,
      radius: 1.25,
      update: () => {
        plaque.material.emissiveIntensity = 0.25 + Math.sin(this.elapsed * 2.2) * 0.08;
      },
      getHintText: () => 'Press E to read the posted notice.',
      onInteract: () => {
        if (this.game.dialogue.isActive()) return;

        this.game.dialogue.start(
          [
            { speaker: 'Canal Notice', text: 'RAIL CURFEW IN EFFECT. After the third bell, transit warrants are required. Unregistered routes will be sealed.' },
            { speaker: 'Canal Notice', text: 'Report missing ledger marks to the nearest Crown clerk. Unauthorized record correction is punishable by debt levy.' },
            { speaker: 'Rian', text: 'They call it “correction.” Like scraping rust off a blade. Like names were never flesh to begin with.' }
          ],
          { onClose: () => this.game.hud.setToast('The notice flutters back into place.', 900) }
        );
      }
    };

    this._registerInteractable(notice);
  }

  _addChestInteractable() {
    const pos = new THREE.Vector3(6.3, 0, -4.2);

    const baseGeo = new THREE.BoxGeometry(0.9, 0.45, 0.6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x2b2f38,
      metalness: 0.25,
      roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(pos.x, 0.225, pos.z);
    this.scene.add(base);

    const lidGeo = new THREE.BoxGeometry(0.9, 0.22, 0.62);
    const lidMat = new THREE.MeshStandardMaterial({
      color: 0x3a2f24,
      metalness: 0.15,
      roughness: 0.78
    });

    const lidPivot = new THREE.Object3D();
    lidPivot.position.set(pos.x, 0.45, pos.z + 0.3);
    this.scene.add(lidPivot);

    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.set(0, 0.11, -0.3);
    lidPivot.add(lid);

    const lockGeo = new THREE.BoxGeometry(0.12, 0.12, 0.04);
    const lockMat = new THREE.MeshStandardMaterial({
      color: 0xbfa16a,
      emissive: 0x2b2113,
      metalness: 0.65,
      roughness: 0.35
    });
    const lock = new THREE.Mesh(lockGeo, lockMat);
    lock.position.set(pos.x, 0.27, pos.z + 0.32);
    this.scene.add(lock);

    const chest = {
      id: 'chest_001',
      label: 'Open Chest',
      position: pos,
      radius: 1.15,
      opened: false,
      opening: false,
      lidPivot,
      lock,
      lidOpenT: 0,
      getHintText: () => (chest.opened ? 'Press E to check the chest.' : 'Press E to open the chest.'),
      onInteract: () => {
        if (this.game.dialogue.isActive() || this.game.menu.isOpen()) return;

        if (chest.opened) {
          this.game.hud.setToast('It’s empty.', 900);
          return;
        }

        chest.opened = true;
        chest.opening = true;
        chest.lidOpenT = 0;

        // REAL inventory add + obtained popup
        this.game.state.addItem('ferric_salt', 1);
        this.game.itemPopup.enqueueObtained({ name: this.game.state.getItemDef('ferric_salt').name, qty: 1 });
      },
      update: (dt) => {
        if (!chest.opened) {
          chest.lock.material.emissiveIntensity = 0.18 + Math.sin(this.elapsed * 2.4) * 0.06;
        } else {
          chest.lock.material.emissiveIntensity = 0.08;
        }

        if (chest.opening) {
          chest.lidOpenT = clamp(chest.lidOpenT + dt * 1.8, 0, 1);
          chest.lidPivot.rotation.x = -Math.PI * 0.62 * chest.lidOpenT;
          if (chest.lidOpenT >= 1) chest.opening = false;
        }
      }
    };

    this._registerInteractable(chest);
  }

  _addGateInteractable() {
    const pos = new THREE.Vector3(0.0, 0, -7.7);

    const frameGeo = new THREE.BoxGeometry(3.2, 2.2, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a202a,
      metalness: 0.15,
      roughness: 0.9
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(pos.x, 1.1, pos.z);
    this.scene.add(frame);

    const barsGeo = new THREE.BoxGeometry(2.6, 1.7, 0.12);
    const barsMat = new THREE.MeshStandardMaterial({
      color: 0x2b313d,
      metalness: 0.55,
      roughness: 0.35
    });
    const bars = new THREE.Mesh(barsGeo, barsMat);
    bars.position.set(pos.x, 1.05, pos.z + 0.02);
    this.scene.add(bars);

    this._registerInteractable({
      id: 'gate_001',
      label: 'Examine Gate',
      position: pos,
      radius: 1.6,
      getHintText: () => 'Press E to examine the sealed gate.',
      onInteract: () => {
        this.game.hud.setToast('The gate is sealed. (Map transition comes next)', 1400);
      }
    });
  }

  // ---------------------------
  // Update
  // ---------------------------

  update(dt) {
    this.elapsed += dt;

    this._updateFade(dt);

    const actions = this.game.getInputActions();

    this._updatePlayer(dt, actions);
    this._updateCamera(dt);
    this._updateAmbientFX(dt);

    for (const it of this.interactables) it.update?.(dt);

    const found = this._findActiveInteractable();
    if (found !== this.activeInteractable) {
      this.activeInteractable = found;
      this._applyInteractPrompt(found);
    }

    if (this.activeInteractable && actions.interactPressed) {
      this.activeInteractable.onInteract?.();
    }

    if (this.game.dialogue.isActive() || this.game.menu.isOpen()) {
      this.game.hud.setInteractPrompt({ visible: false });
    }
  }

  _updateFade(dt) {
    if (!this._fade.active) return;

    const dir = this._fade.target > this._fade.alpha ? 1 : -1;
    this._fade.alpha += dir * this._fade.speed * dt;

    if (dir < 0 && this._fade.alpha <= this._fade.target) {
      this._fade.alpha = this._fade.target;
      this._fade.active = false;
    }

    this.game.hud.setFade(this._fade.alpha);
  }

  _updatePlayer(dt, actions) {
    const { x, z } = actions.move;
    const moving = x !== 0 || z !== 0;

    let speed = this.player.walkSpeed;
    if (actions.run) speed *= this.player.runMultiplier;

    if (moving) {
      this.player.position.x += x * speed * dt;
      this.player.position.z += z * speed * dt;

      this.player.position.x = clamp(this.player.position.x, -10.8, 10.8);
      this.player.position.z = clamp(this.player.position.z, -7.2, 7.2);

      this._resolveCollisions();

      this.playerMesh.rotation.y = Math.atan2(x, z);
      this.playerMesh.position.y = 0.35 + Math.sin(this.elapsed * 12.0) * 0.03;
    } else {
      this.playerMesh.position.y = 0.35 + Math.sin(this.elapsed * 3.5) * 0.01;
    }

    this.playerMesh.position.x = this.player.position.x;
    this.playerMesh.position.z = this.player.position.z;

    this.playerRing.rotation.z += dt * 1.8;
    this.playerCore.material.emissiveIntensity = 0.35 + Math.sin(this.elapsed * 4) * 0.08;
  }

  _resolveCollisions() {
    const pos = this.player.position;
    const radius = this.player.radius;

    for (const box of this.blockers) {
      const closestX = clamp(pos.x, box.minX, box.maxX);
      const closestZ = clamp(pos.z, box.minZ, box.maxZ);

      let dx = pos.x - closestX;
      let dz = pos.z - closestZ;
      let distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq < 1e-10) {
          const toMinX = Math.abs(pos.x - box.minX);
          const toMaxX = Math.abs(box.maxX - pos.x);
          const toMinZ = Math.abs(pos.z - box.minZ);
          const toMaxZ = Math.abs(box.maxZ - pos.z);

          const smallest = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);

          if (smallest === toMinX) pos.x = box.minX - radius;
          else if (smallest === toMaxX) pos.x = box.maxX + radius;
          else if (smallest === toMinZ) pos.z = box.minZ - radius;
          else pos.z = box.maxZ + radius;

          continue;
        }

        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;

        dx /= dist;
        dz /= dist;

        pos.x += dx * overlap;
        pos.z += dz * overlap;
      }
    }
  }

  _updateCamera(dt) {
    this._cameraDesired.set(this.player.position.x, 8.2, this.player.position.z + 9.0);
    const camLerp = 1 - Math.exp(-dt * 5.0);
    this.camera.position.lerp(this._cameraDesired, camLerp);

    this._cameraLook.set(this.player.position.x, 0.6, this.player.position.z - 0.4);
    this.camera.lookAt(this._cameraLook);
  }

  _updateAmbientFX(dt) {
    for (const entry of this.animLights) {
      const pulse = Math.sin(this.elapsed * entry.speed + entry.phase) * 0.15;
      entry.light.intensity = entry.baseIntensity + pulse;
      entry.glow.material.emissiveIntensity = 0.35 + (pulse + 0.15) * 0.7;
    }

    for (const spark of this.decorSparks) {
      spark.phase += dt * spark.speed * 4.0;
      spark.mesh.position.y = spark.y + Math.sin(spark.phase) * 0.08;
      spark.mesh.position.x = spark.x + Math.cos(spark.phase * 0.5) * 0.04;
      spark.mesh.position.z = spark.z + Math.sin(spark.phase * 0.7) * 0.04;
    }
  }

  // ---------------------------
  // Prop helpers
  // ---------------------------

  _addWall({ x, y, z, w, h, d }) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x232935,
      metalness: 0.08,
      roughness: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.blockers.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2
    });
  }

  _addCrateStack(x, z, count = 2) {
    const crateGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x3a2b20,
      metalness: 0.05,
      roughness: 0.95
    });

    for (let i = 0; i < count; i++) {
      const y = 0.45 + i * 0.92;
      const mesh = new THREE.Mesh(crateGeo, crateMat);
      mesh.position.set(x + (i % 2) * 0.08, y, z + (i % 2) * 0.04);
      this.scene.add(mesh);
    }

    this.blockers.push({
      minX: x - 0.5,
      maxX: x + 0.5,
      minZ: z - 0.5,
      maxZ: z + 0.5
    });
  }

  _addMachineBlock(x, z, w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2d323b,
      metalness: 0.25,
      roughness: 0.65
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    this.scene.add(mesh);

    const panelGeo = new THREE.BoxGeometry(w * 0.35, h * 0.2, 0.04);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x7cefe0,
      emissive: 0x1b6b67,
      metalness: 0.1,
      roughness: 0.3
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, h * 0.1, d / 2 + 0.03);
    mesh.add(panel);

    this.blockers.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2
    });
  }

  _addLamp(x, z, colorHex) {
    const postGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.8, 10);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x4f5560,
      metalness: 0.45,
      roughness: 0.45
    });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 0.9, z);
    this.scene.add(post);

    const capGeo = new THREE.BoxGeometry(0.36, 0.22, 0.36);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x9e7a4a,
      metalness: 0.7,
      roughness: 0.35
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(x, 1.82, z);
    this.scene.add(cap);

    const glowGeo = new THREE.SphereGeometry(0.13, 12, 12);
    const glowMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.4,
      metalness: 0.0,
      roughness: 0.2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(x, 1.68, z);
    this.scene.add(glow);

    const light = new THREE.PointLight(colorHex, 0.65, 7.5);
    light.position.set(x, 1.65, z);
    this.scene.add(light);

    this.animLights.push({
      light,
      glow,
      baseIntensity: light.intensity,
      speed: 1.6 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2
    });
  }

  _addBackdropSilhouette(x, z, h) {
    const geo = new THREE.BoxGeometry(2.0, h, 0.4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x141920,
      metalness: 0.05,
      roughness: 0.95
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    this.scene.add(mesh);
  }

  _spawnSparks(count) {
    const sparkGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0x83f2e6 });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      const spark = {
        mesh,
        x: (Math.random() - 0.5) * 20,
        y: 0.2 + Math.random() * 2.5,
        z: (Math.random() - 0.5) * 14,
        speed: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2
      };
      mesh.position.set(spark.x, spark.y, spark.z);
      this.scene.add(mesh);
      this.decorSparks.push(spark);
    }
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
      statusText: `Player x:${this.player.position.x.toFixed(2)} z:${this.player.position.z.toFixed(2)}`
    };
  }

  exit() {
    this.game.hud.setInteractPrompt({ visible: false });

    this.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
        else obj.material?.dispose?.();
      }
    });
  }
}
