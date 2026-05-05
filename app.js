/* 
Author: Dibyajeet Kirttania
Dated: 05 May, 2026
*/
import * as THREE from 'three';

const user = 'Dibyajeet';
console.log(`Hello! ${user}`);

// Global variables
let scene, camera, renderer, timer;

const cameraSettings = {
    fov: 50,
    near: 0.1,
    far: 1000,
    position: { x: 0, y: 2, z: 5 },
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

    // Renderer Setup
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Listeners
    window.addEventListener('resize', onWindodowResize);

    // Initialize the world environment
    handleLights();
    createEnvironment(); // Added this call
    animate();           // Added this call
};

function handleLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLamp = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLamp.position.set(sunPosition.x, sunPosition.y, sunPosition.z);
    scene.add(sunLamp);
};

function createEnvironment() {
    const geometry = new THREE.PlaneGeometry(20, 20, 64, 64);
    const material = new THREE.MeshStandardMaterial({ 
        color: '#c5a172', 
        wireframe: false,
        roughness: 0.8
    });
    
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
};

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
    
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
}

init();