import * as THREE from 'three';

export class BootScene {
  constructor(game) {
    this.game = game;

    this.displayName = 'Boot';
    this.locationName = 'Veilbound Threshold';
    this.hintText = 'Press Enter / Space to continue';
    this.statusText = 'Preparing title...';

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x090b10, 6, 26);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 2.6, 6.5);
    this.camera.lookAt(0, 0.6, 0);

    this.elapsed = 0;
    this.canSkipAfter = 0.25;
    this.autoAdvanceAt = 1.15;

    this._setupScene();
  }

  _setupScene() {
    const ambient = new THREE.AmbientLight(0x66738a, 0.45);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x8db7ff, 0.75);
    keyLight.position.set(3, 5, 2);
    this.scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x7dffee, 0.9, 12);
    rimLight.position.set(-2.4, 2.2, 1.2);
    this.scene.add(rimLight);
    this.rimLight = rimLight;

    const violetLight = new THREE.PointLight(0x8e69ff, 0.8, 10);
    violetLight.position.set(2.4, 1.8, -1.4);
    this.scene.add(violetLight);
    this.violetLight = violetLight;

    const floorGeo = new THREE.CircleGeometry(4.4, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111318,
      metalness: 0.1,
      roughness: 0.88
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    this.scene.add(floor);

    const ringGeo = new THREE.TorusGeometry(1.5, 0.07, 16, 96);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xbfa16a,
      emissive: 0x2b2113,
      metalness: 0.65,
      roughness: 0.35
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.25;
    this.scene.add(this.ring);

    const prismGeo = new THREE.OctahedronGeometry(0.5, 0);
    const prismMat = new THREE.MeshStandardMaterial({
      color: 0x95efe6,
      emissive: 0x103536,
      metalness: 0.15,
      roughness: 0.2
    });
    this.prism = new THREE.Mesh(prismGeo, prismMat);
    this.prism.position.y = 0.9;
    this.scene.add(this.prism);
  }

  enter() {
    // Hide gameplay panels during boot
    this.game.hud.setMode('boot');
    this.game.hud.setFade(0);
    this.game.hud.setToast('Veilborn Oath — Boot', 900);
  }

  update(dt) {
    this.elapsed += dt;

    this.ring.rotation.z += dt * 0.9;
    this.prism.rotation.x += dt * 0.6;
    this.prism.rotation.y += dt * 1.15;
    this.prism.position.y = 0.9 + Math.sin(this.elapsed * 2.5) * 0.06;

    const pulse = 0.75 + Math.sin(this.elapsed * 3.0) * 0.2;
    this.rimLight.intensity = pulse;
    this.violetLight.intensity = 0.7 + Math.cos(this.elapsed * 2.2) * 0.15;

    const actions = this.game.getInputActions();
    const skipPressed = actions.confirmPressed && this.elapsed >= this.canSkipAfter;

    if (skipPressed || this.elapsed >= this.autoAdvanceAt) {
      this.game.stateManager.change('title');
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
      statusText: this.statusText
    };
  }

  exit() {
    this.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
        else obj.material?.dispose?.();
      }
    });
  }
}
