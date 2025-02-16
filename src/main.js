import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

// DOM Selections
const canvas = document.querySelector("#canvas");
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const changeBG = document.querySelector('.changeBG');
const animateBtn = document.querySelector('.Animate');

let envMap; // Global Environment Map
let model;

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1, 3);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputEncoding = THREE.sRGBEncoding;

// PMREM Generator
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileCubemapShader();

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotateSpeed = 5.0;
controls.enableZoom = true;

// Post-Processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms.amount.value = 0.0015; 
composer.addPass(rgbShiftPass);

let modelLoaded = false;
let hdrLoaded = false;

// Function to check if both assets are loaded
function checkLoadingComplete() {
    if (modelLoaded && hdrLoaded) {
        loadingScreen.style.display = "none"; // Hide loading screen
    }
}

// Load HDR Environment
const rgbeLoader = new RGBELoader();
rgbeLoader.load('/photostudio_4k.hdr', (texture) => {
    envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    texture.dispose();
    pmremGenerator.dispose();

    hdrLoaded = true;
    checkLoadingComplete();
});

// Load 3D Model with Progress
const loader = new GLTFLoader();
loader.load(
    '/DamagedHelmet.gltf',
    (gltf) => {
        model = gltf.scene;
        scene.add(model);
        modelLoaded = true;
        checkLoadingComplete();
    },
    (xhr) => {
        if (xhr.total > 0) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            loadingText.innerText = `Loading... ${percent}%`;
        } else {
            loadingText.innerText = "Loading...";
        }
    },
    (error) => console.error("GLTF Load Error:", error)
);
// Mouse Move Interaction
window.addEventListener("mousemove", (e) => {
    if (model) {
        const mouseX = (e.clientX / window.innerWidth - 0.5) * 0.6;
        const mouseY = (e.clientY / window.innerHeight - 0.5) * 0.6;
        model.rotation.y = mouseX * Math.PI * 0.5;
        model.rotation.x = mouseY * Math.PI * 0.5;
    }
});

// Animation Toggle
function toggleAnimation() {
    controls.autoRotate = !controls.autoRotate;
}

if (animateBtn) animateBtn.addEventListener("click", toggleAnimation);

// Background Toggle
function toggleBackground() {
    if (scene.background) {
        scene.background = null;
        scene.environment = envMap;
        controls.autoRotate = false;
    } else {
        scene.background = envMap;
        controls.autoRotate = true;
        scene.environment = envMap;
        controls.autoRotateSpeed = 1.0;
        camera.position.z = 4;
    }
}

if (changeBG) changeBG.addEventListener("click", toggleBackground);

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    composer.render();
}

// Resize Handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
