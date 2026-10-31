import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// モデル・照明・操作の設定はここで変更します。装置への通信は行いません。
export function createApparatusScene(host, modelUrl, label, onError = () => {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.domElement.setAttribute("aria-label", label);
  renderer.domElement.setAttribute("role", "img");
  host.prepend(renderer.domElement);
  let disposed = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  const environment = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environmentMap = environment.fromScene(room);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = 0.38;
  room.dispose();
  environment.dispose();
  scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x293d35, 0.35));
  const light = new THREE.DirectionalLight(0xfff0db, 3.2);
  light.position.set(-3, 7, 3);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 15 });
  light.shadow.normalBias = 0.015;
  light.shadow.bias = -0.0002;
  light.shadow.radius = 4;
  light.shadow.blurSamples = 8;
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xc8e1ff, 1.4);
  rim.position.set(3, 2, -3);
  scene.add(rim);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false; // Keep scrolling the page natural, including over the model.
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  controls.autoRotate = !reducedMotion.matches;
  controls.autoRotateSpeed = 0.65;
  controls.minPolarAngle = Math.PI * 0.15;
  controls.maxPolarAngle = Math.PI * 0.78;
  renderer.domElement.style.touchAction = "pan-y";
  let visible = false;
  let ready = false;

  const draw = () => renderer.render(scene, camera);
  const updateAnimation = () => {
    renderer.setAnimationLoop(ready && visible && !document.hidden && controls.autoRotate
      ? () => { controls.update(); draw(); } : null);
    draw();
  };
  const updateMotion = () => { controls.autoRotate = !reducedMotion.matches; updateAnimation(); };
  reducedMotion.addEventListener("change", updateMotion);
  controls.addEventListener("change", draw);
  // ドラッグ中も操作でき、手を離すと自動回転を続けます。
  document.addEventListener("visibilitychange", updateAnimation);
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    updateAnimation();
  });
  intersection.observe(host);
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  async function loadModel() {
    const gltf = await new GLTFLoader().loadAsync(modelUrl);
    if (disposed) { disposeObjects(gltf.scene); return; }
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    // Normalize Blender's model units so camera settings stay readable.
    const scale = 2 / Math.max(size.x, size.y, size.z);
    model.position.copy(center).multiplyScalar(-scale);
    model.scale.setScalar(scale);
    // Preserve the model textures, with less glossy polymer and stronger copper reflections.
    const adjusted = new Set();
    model.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (adjusted.has(material)) continue;
        adjusted.add(material);
        if (/FDM|base polymer/i.test(material.name)) {
          material.roughness = 0.58;
          material.color.setHex(0xe3e6df);
        }
        if (/copper tape/i.test(material.name)) {
          material.metalness = 0.72;
          material.roughness = 0.34;
        }
      }
    });
    scene.add(model);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ color: 0x142b23, opacity: 0.2 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -size.y * scale / 2 - 0.015;
    floor.receiveShadow = true;
    scene.add(floor);
    camera.position.set(2.8, 1.6, 3.5);
    controls.target.set(0, 0, 0);
    controls.update();
    ready = true;
    resize();
    updateAnimation();
  }

  loadModel().catch(error => {
    if (disposed) return;
    renderer.domElement.hidden = true;
    onError();
    console.warn("NMR apparatus viewer:", error);
  });
  resize();

  // ページ移動・開発中の再読み込みで、描画とGPUリソースを残さないようにします。
  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    intersection.disconnect();
    observer.disconnect();
    document.removeEventListener("visibilitychange", updateAnimation);
    reducedMotion.removeEventListener("change", updateMotion);
    controls.dispose();
    disposeObjects(scene);
    light.shadow.dispose();
    environmentMap.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

function disposeObjects(root) {
  const resources = new Set();
  root.traverse(object => {
    if (!object.isMesh) return;
    resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      resources.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) resources.add(value);
      }
    }
  });
  for (const resource of resources) resource.dispose();
}
