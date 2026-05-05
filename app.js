/* 
Author: Dibyajeet Kirttania
Dated: 05 May, 2026
*/
import * as THREE from 'three';

const user = 'Dibyajeet';
console.log(`Hello! ${user}`);

// Global variables
let scene, camera, renderer, timer, floor;

const cameraSettings = {
    fov: 50,
    near: 0.1,
    far: 1000,
    position: { x: 10, y: 2, z: 10 },
}

const sunPosition = { x: 5, y: 10, z: 7 }

function init() {
    scene = new THREE.Scene();
    timer = new THREE.Timer();
    const canvas = document.querySelector('.webgl');

    // Main Camera - Using dynamic aspect ratio
    camera = new THREE.PerspectiveCamera(
        cameraSettings.fov, 
        window.innerWidth / window.innerHeight, 
        cameraSettings.near, 
        cameraSettings.far
    );
    camera.position.set(cameraSettings.position.x, cameraSettings.position.y, cameraSettings.position.z);
    camera.lookAt(0, 0, 0);

    // Renderer Setup
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Listeners
    window.addEventListener('resize', onWindodowResize);

    // Initialize the world environment
    handleLights();
    createEnvironment();
    animate();           
};

function handleLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLamp = new THREE.DirectionalLight(0xffffff, 1);
    sunLamp.position.set(sunPosition.x, sunPosition.y, sunPosition.z);
    scene.add(sunLamp);
};

function createEnvironment() {
    const geometry = new THREE.CircleGeometry(20, 256);
    const material = new THREE.MeshStandardMaterial({
        color: '#c5a172',
        roughness: 0.9,
        metalness: 0.0
    });
    applyDisplacement(material);
    
    floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
};

function applyDisplacement(material) {
    material.onBeforeCompile = (shader) => {
        // 1. Add Uniforms
        shader.uniforms.uStrength = { value: 1.2 }; 
        shader.uniforms.uMidlevel = { value: 0.35 };
        shader.uniforms.uSize = { value: 0.41 };

        // 2. Vertex Shader: Define varying and logic
        shader.vertexShader = `
            uniform float uStrength;
            uniform float uMidlevel;
            uniform float uSize;
            varying vec2 vUv; // Must be defined here

            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
            float noise(vec2 p) {
                vec2 i = floor(p); vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), f.x),
                           mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
            }
            float fbm(vec2 p) {
                float v = 0.0; float a = 0.5;
                for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
                return v;
            }
            ${shader.vertexShader}
        `.replace(
            '#include <begin_vertex>',
            `
            vUv = uv; // Assigning the value to pass to fragment
            float rawNoise = fbm(vUv / uSize);
            float elevation = (rawNoise - uMidlevel) * uStrength;
            vec3 transformed = vec3(position.x, position.y, position.z + elevation);
            `
        );

        // 3. Fragment Shader: Define varying and Circle Mask
        shader.fragmentShader = `
            varying vec2 vUv; // Must be defined here too
            ${shader.fragmentShader}
        `.replace(
            'void main() {',
            `
            void main() {
                // Circle mask: Center is (0.5, 0.5), Radius is 0.5
                if(distance(vUv, vec2(0.5)) > 0.5) discard; 
            `
        );
    };
}

function onWindodowResize() {
    // Update variables locally to get fresh window sizes
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate() {
    timer.update();
    const elapsedTime = timer.getElapsed();
    
    // to do parralax logic
    // floor.material.uniforms.uTime.value = elapsedTime;
    
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
}

init();