import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// This viewer belongs to the documentation; it never communicates with hardware.
const host = document.querySelector("#apparatus-view");
const status = document.querySelector("#apparatus-status");
const rotationButton = document.querySelector("#apparatus-rotation");
const resetButton = document.querySelector("#apparatus-reset");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

async function showApparatus() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.domElement.setAttribute("aria-label", "NMR装置の3Dモデル。ドラッグで回転できます。");
  renderer.domElement.setAttribute("role", "img");
  host.prepend(renderer.domElement);

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
  const updateButton = () => {
    rotationButton.textContent = controls.autoRotate ? "回転を止める" : "自動回転する";
    rotationButton.setAttribute("aria-pressed", String(controls.autoRotate));
    updateAnimation();
  };
  controls.addEventListener("change", draw);
  // Manual rotation pauses automatic movement until the user explicitly resumes it.
  controls.addEventListener("start", () => { controls.autoRotate = false; updateButton(); });
  rotationButton.onclick = () => { controls.autoRotate = !controls.autoRotate; updateButton(); };
  resetButton.onclick = () => { controls.reset(); controls.autoRotate = false; updateButton(); };
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) { controls.autoRotate = false; updateButton(); }
  });
  document.addEventListener("visibilitychange", updateAnimation);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    updateAnimation();
  }).observe(host);
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  };
  new ResizeObserver(resize).observe(host);

  const gltf = await new GLTFLoader().loadAsync(new URL("../model/nmr_apparatus.glb", import.meta.url).href);
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
  controls.saveState();
  ready = true;
  rotationButton.disabled = false;
  resetButton.disabled = false;
  status.textContent = "ドラッグで回転 · スクロールでページを移動";
  host.classList.add("loaded");
  resize();
  updateButton();
}

// Import and WebGL failures must not prevent reading the documentation.
if (host) showApparatus().catch(error => {
  status.textContent = "3Dモデルを表示できませんでした。ドキュメントとWeb UIはそのまま利用できます。";
  host.classList.add("unavailable");
  host.querySelector("canvas")?.remove();
  console.warn("NMR apparatus viewer:", error);
});
