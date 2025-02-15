import './style.css'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

let changeBG = document.querySelector('.changeBG');
let envMap; // Global variable for envMap
let is3DViewActive = false; // Track view state

// selction
const canvas = document.querySelector("#canvas");
if (!canvas) {
  console.error("Canvas element not found!");
}
// Scene
const scene = new THREE.Scene();
// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 2;

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputEncoding = THREE.sRGBEncoding;

// PMREM Generator
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileCubemapShader();

// Store 3D model 
let model;

// Load HDR Environment (adding 360 view)
new RGBELoader().load('./photostudio_4k.hdr', (texture) => {
  envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.environment = envMap;
  texture.dispose();
  pmremGenerator.dispose();

  // Load GLTF Model
  const loader = new GLTFLoader();
  loader.load('./DamagedHelmet.gltf', (gltf) => {
    model = gltf.scene;
    scene.add(model);
  }, undefined, (error) => {
    console.error('An error occurred while loading GLTF model:', error);
  });
});

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.dampingFactor = 0.14;
controls.autoRotateSpeed = 5.0;
controls.dampingFactor = 0.14;
controls.enableZoom = true;

// Post-Processing Setup
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms.amount.value = 0.0015; // Adjust intensity
composer.addPass(rgbShiftPass);

let mouseMoveEnabled = true;

// Mouse move event listener
window.addEventListener("mousemove", (e) => {
  if (model && mouseMoveEnabled) {
    const mouseX = (e.clientX / window.innerWidth - 0.5) * 0.6;
    const mouseY = (e.clientY / window.innerHeight - 0.5) * 0.6;
    const rotationIntensity = Math.PI * 0.5;
    model.rotation.y = mouseX * rotationIntensity;
    model.rotation.x = mouseY * rotationIntensity;
  }
});

// Function to toggle animation
function toggleAnimation() {
  if (controls.autoRotate) {
    controls.autoRotate = false;
    mouseMoveEnabled = true;
  } else {
    controls.autoRotate = true;
    mouseMoveEnabled = false;
    if (model) {
      model.rotation.set(0, 0, 0);
    }
  }
  // controls.autoRotate = !controls.autoRotate;
  // mouseMoveEnabled = !controls.autoRotate;
  
}

// Function to toggle background
function toggleBackground() {
  if (envMap) {
    if (scene.background) {
      scene.background = null;
      scene.environment = envMap; // add for reflections if there is no reflecion on PBR { Physically based render} it not visible for visiblity we have to add light refletion
      controls.autoRotate = false;
      camera.position.z = 2;
    } else {
      scene.background = envMap;
      controls.autoRotate = true;
      scene.environment = envMap; // Ensure proper reflections
      controls.autoRotateSpeed = 1.0; // Adjust speed
      camera.position.z = 4;
    }
  } else {
    console.error("Environment map is not loaded yet!");
  }
}

// Animate Button Functionality
document.addEventListener("DOMContentLoaded", () => {
  let Animate = document.querySelector('.Animate');
  if (Animate) {
    Animate.addEventListener("click", toggleAnimation);
  } else {
    console.error("Animate button not found!");
  }
});

// Change Background Button Functionality
if (changeBG) {
  changeBG.addEventListener("click", toggleBackground);
} else {
  console.error("ChangeBG button not found!");
}

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}

// Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
