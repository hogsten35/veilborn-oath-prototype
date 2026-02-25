import * as THREE from 'three';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class FieldScene {
  constructor(game) {
    this.game = game;

    this.displayName = 'Field';
    this.locationName = 'Gutterwake — East Canal (Prototype)';
    this.hintText = 'Move: WASD/Arrows • Run: Shift • Interact: E';
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

    this._setupScene();
    this._setupFieldGeometry();
    this._setupPlayer();
    this._setupCamera();
  }

  _setupScene() {
    const ambient = new THREE.AmbientLight(0x6f7d96, 0.45);
    this.scene.add(ambient);

    const moonKey = new THREE.DirectionalLight(0xa9c6ff, 0.8);
    moonKey.position.set(-5, 8, 3);
    this.scene.add(moonKey);

    const veilGlow = new THREE.PointLight(0x55e6d6, 0.35, 30);
    veilGlow.position.set(0, 4.5, 0);
    this.scene.add(veilGlow);

    // Very subtle ground haze plane for atmosphere
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
    // Ground
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

    // Canal strips (stylized placeholder)
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

    // Street center strip
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

    // Perimeter walls (visual + collision)
    this._addWall({ x: 0, y: 1.25, z: -8.25, w: 24, h: 2.5, d: 0.5 });
    this._addWall({ x: 0, y: 1.25, z: 8.25, w: 24, h: 2.5, d: 0.5 });
    this._addWall({ x: -11.75, y: 1.25, z: 0, w: 0.5, h: 2.5, d: 16 });
    this._addWall({ x: 11.75, y: 1.25, z: 0, w: 0.5, h: 2.5, d: 16 });

    // Walkway dividers / crates / machinery blockers
    this._addCrateStack(-3.4, -1.2, 2);
    this._addCrateStack(4.0, 1.0, 3);
    this._addMachineBlock(0.8, 5.5, 1.8, 1.2, 1.1);

    // Lamps (visual + animated light)
    this._addLamp(-8.2, -2.6, 0x77f6e2);
    this._addLamp(-2.2, 3.4, 0xc89bff);
    this._addLamp(5.3, -3.2, 0x77f6e2);
    this._addLamp(8.4, 2.8, 0xffc76a);

    // Backdrop silhouettes (industrial ruins)
    this._addBackdropSilhouette(-7.5, -7.2, 2.2);
    this._addBackdropSilhouette(-2.4, -7.4, 3.0);
    this._addBackdropSilhouette(3.6, -7.1, 2.6);
    this._addBackdropSilhouette(8.5, -7.3, 3.2);

    // Small glowing motes for atmosphere
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
      color: 0xe4e2d6,
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

    // Add glowing panel
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

  enter() {
    this.game.hud.setToast('Entered Field Scene', 900);
  }

  update(dt) {
    this.elapsed += dt;

    const actions = this.game.getInputActions();
    this._updatePlayer(dt, actions);
    this._updateCamera(dt);
    this._updateAmbientFX(dt);

    if (actions.interactPressed) {
      this.game.hud.setToast(
        'Prototype interact: later this will trigger NPCs/chests/events.',
        1400
      );
    }

    if (actions.cancelPressed) {
      this.game.hud.setToast('Menu system comes next (Phase 4+).', 1000);
    }
  }

  _updatePlayer(dt, actions) {
    const { x, z } = actions.move;
    const moving = x !== 0 || z !== 0;

    let speed = this.player.walkSpeed;
    if (actions.run) speed *= this.player.runMultiplier;

    if (moving) {
      this.player.position.x += x * speed * dt;
      this.player.position.z += z * speed * dt;

      // Soft world bounds
      this.player.position.x = clamp(this.player.position.x, -10.8, 10.8);
      this.player.position.z = clamp(this.player.position.z, -7.2, 7.2);

      // Resolve collisions against blockers
      this._resolveCollisions();

      // Face movement direction (simple yaw)
      const targetYaw = Math.atan2(x, z);
      this.playerMesh.rotation.y = targetYaw;

      // Bobbing when moving
      this.playerMesh.position.y = 0.35 + Math.sin(this.elapsed * 12.0) * 0.03;
    } else {
      this.playerMesh.position.y = 0.35 + Math.sin(this.elapsed * 3.5) * 0.01;
    }

    // Apply player position
    this.playerMesh.position.x = this.player.position.x;
    this.playerMesh.position.z = this.player.position.z;

    // Decorative rotation/pulse
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
        // If exactly inside center line, push out by smallest axis
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
    // Authored cinematic angle + light follow behavior
    this._cameraDesired.set(
      this.player.position.x + 0.0,
      8.2,
      this.player.position.z + 9.0
    );

    const camLerp = 1 - Math.exp(-dt * 5.0);
    this.camera.position.lerp(this._cameraDesired, camLerp);

    this._cameraLook.set(
      this.player.position.x,
      0.6,
      this.player.position.z - 0.4
    );
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
    this.scene.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();

        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m?.dispose?.());
        } else {
          obj.material?.dispose?.();
        }
      }
    });
  }
}
