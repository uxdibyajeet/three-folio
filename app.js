/* 
Author: Dibyajeet Kirttania
Dated: 05 May, 2026
*/
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Global variables
let scene, camera, renderer, composer, timer, floor, labelRenderer, loadingManager, isLoaded = false;

const mouse = { x: 0, y: 0 };      // raw normalized mouse -1 to 1
const target = { x: 0, y: 0 };     // smoothed target values

// ============================================================
//  GLOBAL CONFIGURATION
// ============================================================

//Developer top View
// Add to global variables
let isTopView = false;

const topViewSettings = {
    position: { x: 0, y: 20, z: 0 },  // directly above origin
    lookAt:   { x: 0, y: 0,  z: 0 },
    fov:      30,                       
};

//Studio Lighting controlls
const studioLightsSettings = [
    {
        name: 'Key Light - Couch',
        color: 0xffffff,
        intensity: 30.0,
        width: 0.5,
        height: 0.5,
        position: { x: -0.5, y: 1.6, z: -0.7 },
        lookAt: { x: 0.35, y: 2, z: 0.2 } // Points at the couch
    },
    {
        name: 'fill Light - Logo',
        color: 0xffffff, // Cool blue tint
        intensity: 6.0,
        width: 1.0,
        height: 1.0,
        position: {  x: 2, y: 3.0, z: 1.0 },
        lookAt: { x: -0.5, y: 0, z: 1.2 } // points at the logo
    },
    {
        name: 'fill Light - dual arch',
        color: 0xFFF4E0, // warm light
        intensity: 2.0,
        width: 2.0,
        height: 2.0,
        position: {  x: -2.5, y: 3.5, z: 1.0 },
        lookAt: { x: -0.8, y: 0, z: -1.2 } // points at the dual arch
    },
];

// Material Registry
const materialRegistry = {
    plinth: 'wall',   // populated on first call
    sand:   null,   // future use
    glass:  null,   // future use
};

// asset import and settings
const assetSettings = {
    // Shared path for the Draco decoder
    dracoPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/',
    
    // The Manifest: Add new models here
    manifest: [
        { 
            name: 'couch', 
            path: '/models/couch.glb', 
            plinth: 'central', 
            offset: { x: 0.25, y: 0, z: 0.20 }, 
            scale: 1.0,
            material: null
        },
        { 
            name: 'arch', 
            path: '/models/arch-central.glb', 
            plinth: 'central', 
            offset: { x: -0.8, y: 0, z: -1.2 }, 
            scale: 1.0,
            material: 'wall'
        },
        { 
            name: 'back-wall', 
            path: '/models/back-wall-central.glb', 
            plinth: 'central', 
            offset: { x: -0.5, y: 0, z: -0.8 }, 
            scale: 1.0,
            material: 'wall'
        },
        { 
            name: 'logo', 
            path: '/models/logo-object.glb', 
            plinth: 'central', 
            offset: { x: -0.85, y: 0, z: 1.2 }, 
            scale: 1.0,
            material: 'wall'
        },
        { 
            name: 'cactus', 
            path: '/models/prickley-pear.glb', 
            plinth: 'central', 
            offset: { x: 1.2, y: 0, z: -0.8 }, 
            scale: 1.0,
            material: null
        },
        { 
            name: 'experience-monolith', 
            path: '/models/experience.glb', 
            plinth: 'left', 
            offset: { x: 0, y: 0, z: 0 }, 
            scale: 1.0,
            material: 'wall',
        },
        { 
            name: 'work', 
            path: '/models/work.glb', 
            plinth: 'right', 
            offset: { x: 0, y: 0, z: 0 }, 
            scale: 1.0,
            material: 'wall',
        },
    ]
};

//SSAO
const ssaoSettings = {
    radius:        0.01,   // how far it samples — keep small for tight contact shadows
    minDistance:   0.001,
    maxDistance:   0.01,
    output:        SSAOPass.OUTPUT.Default, // change to .SSAO to debug just the AO pass
};

// billboard Text
const labelSettings = {
    centralBillboard: {
        text:   'Work in Progress!', 
        offset: { x: -0.4, y: 1.5, z: -0.9 }, // height above couch position
    }
};

// other settings

const plinthSettings = {
    horizontalDist: 2.75,
    lateralDist: -0.5,
    centralHeight:  1.0,
    navHeight:      0.5,
    bevel:          0.025,
    segments:       2,
    navY: 0.0 // // center Y — box extends ±navHeight/2, so top face sits at navY + navHeight/2
};

const controlSettings = {
    azimuthRange:  0.1,
    altitudeRange: 0.025,
    smoothingX:    0.02,   // slower = smoother horizontal movement
    smoothingY:    0.05,   // vertical is snappier
    minTilt:      -1.0,
    maxTilt:       0.25,
};

const cameraSettings = {
    fov: 35,
    near: 0.1,
    far: 1000,
    position: { x: 7, y: 3.0, z: 7 },
    lookAt:   { x: 0, y: 0, z: 0 },
    mobileFovMultiplier: 1.2, // manually tested - best fit for portrait according to me
}

const sunSettings = {
    color:        0xd8d4a8,   // warm white 0xa8c4d8
    intensity:    8.0,        // default value 6.0
    elevation:    45,         // degrees above horizon (90 = straight up)
    azimuth:      162,        // degrees horizontal rotation
    distance:     30,         // how far from scene center
    shadowMapSize: 2048,
    shadowCameraSize: 15,     // left/right/top/bottom bounds
    shadowCameraFar: 50,
    shadowBias:   -0.0003,
    shadowRadius: 1.5,
};

const ambientSettings = {
    color:     0xa8c4d8,      // cool fill
    intensity: 0.6,
};

const displacementSettings = {
    strength:  0.08,           // height of peaks
    midlevel:  0.5,           // baseline offset (0=all peaks, 1=all craters)
    size:      0.035,          // noise frequency (smaller = finer detail)
    offset:    0.001,         // normal calculation precision
    worldScale: 40.0,         // should match plane size
    animSpeed: 0.05,         // displacement Animation Speed
};

const terrainSettings = {
    size:      40,            // plane width & height
    segments:  256,           // vertex density (256 mobile, 512 desktop)
    roughness: 0.9,
    metalness: 0.0,
    textureTiling: 12,        // how many times texture repeats
    aoIntensity:   1.5,
    normalScale:   1.0,       // normal map bump intensity
};

const skySettings = {
    topColor:    '#87CEEB',   // sky blue
    bottomColor: '#c8b89a',   // warm horizon haze
    offset:      0.3,         // gradient start height
    exponent:    0.4,         // blend softness
};

const fogSettings = {
    color:   '#c8b89a',       // should match sky bottomColor
    density: 0.03,
};

const rendererSettings = {
    toneMapping:         THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.1,
    pixelRatio:          2,   // cap for performance
};

const hemisphereSettings = {
    skyColor:    0x8ab4d4,  // cool blue — matches ambientSettings
    groundColor: 0xc4956a,  // warm amber — fills shadow with warmth
    intensity:   0.5,
};


//loading manager subtext
const loadingMessages = {
    // Triggered by file extension or name match
    geometry:  'Sculpting the terrain...',
    textures:  'Painting the sand...',
    models:    'Placing objects in the world...',
    compiling: 'Compiling shaders...',
    done:      'Almost there...',
};

// ============================================================
//  Start of code
// ============================================================

// developer view

function onKeyDown(e) {
    if (e.key !== 't' && e.key !== 'T') return;

    isTopView = !isTopView;

    if (isTopView) {
        // Switch to top view
        camera.position.set(
            topViewSettings.position.x,
            topViewSettings.position.y,
            topViewSettings.position.z
        );
        camera.lookAt(
            topViewSettings.lookAt.x,
            topViewSettings.lookAt.y,
            topViewSettings.lookAt.z
        );
        camera.fov = topViewSettings.fov;
        camera.updateProjectionMatrix();
        console.log('🔭 Top view — placement mode');
    } else {
        // Restore experience view
        camera.fov = cameraSettings.fov;
        camera.updateProjectionMatrix();
        console.log('👁️ Experience view restored');
    }
};

// engine function

function init() {
    setupLoadingManager();
    scene = new THREE.Scene();
    timer = new THREE.Timer();
    const canvas = document.querySelector('.webgl');

    // Main Camera
    camera = new THREE.PerspectiveCamera(
        cameraSettings.fov, 
        window.innerWidth / window.innerHeight, 
        cameraSettings.near, 
        cameraSettings.far
    );
    camera.position.set(cameraSettings.position.x, cameraSettings.position.y, cameraSettings.position.z);
    camera.lookAt(cameraSettings.lookAt.x, cameraSettings.lookAt.y, cameraSettings.lookAt.z);


    // Renderer Setup
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); //alpha: true
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, rendererSettings.pixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = rendererSettings.toneMapping;
    renderer.toneMappingExposure = rendererSettings.toneMappingExposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    //Post Processing SSAO
    composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
    ssaoPass.kernelRadius  = ssaoSettings.radius;
    ssaoPass.minDistance   = ssaoSettings.minDistance;
    ssaoPass.maxDistance   = ssaoSettings.maxDistance;
    ssaoPass.output        = ssaoSettings.output;
    composer.addPass(ssaoPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // Billboard Text
    // Label Renderer
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.classList.add('label-renderer')
    document.body.appendChild(labelRenderer.domElement);

    // Listeners
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);

    scene.fog = new THREE.FogExp2(fogSettings.color, fogSettings.density);

    // Initialize the world environment
    RectAreaLightUniformsLib.init()          
    handleLights();
    createStudioLights();
    createEnvironment();
    animate();        
};

// Material Builder
function getMaterial(name) {
    // Return cached instance if already created
    if (materialRegistry[name]) return materialRegistry[name];
    const textureLoader = new THREE.TextureLoader(loadingManager);

    if (name === 'wall') {
        const normalMap    = textureLoader.load('/textures/wall/normal.jpg');
        const roughnessMap = textureLoader.load('/textures/wall/roughness.jpg');

        [normalMap, roughnessMap].forEach(tex => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(1, 1);
        });

        materialRegistry.wall = new THREE.MeshStandardMaterial({
            color:        '#eccca6',
            normalMap:    normalMap,
            roughnessMap: roughnessMap,
            roughness:    1.2,
            metalness:    0.2,
            normalScale:  new THREE.Vector2(2, 2),
        });

        return materialRegistry.wall;
    }

    // Add more materials here as needed:
    // if (name === 'glass') { ... }

    console.warn(`getMaterial: unknown material "${name}"`);
    return null;
};

//Handle orbit
function onMouseMove(e) {
// Normalize to -1 ... 1
    mouse.x = (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
};

//Lights
function handleLights() {
    const ambientLight = new THREE.AmbientLight(ambientSettings.color, ambientSettings.intensity);
    scene.add(ambientLight);

    const sunLamp = new THREE.DirectionalLight(sunSettings.color, sunSettings.intensity); // warm, soft

    const phi = THREE.MathUtils.degToRad(90 - sunSettings.elevation); // low sun ~25° above horizon
    const theta = THREE.MathUtils.degToRad(sunSettings.azimuth);
    const distance = sunSettings.distance;
    sunLamp.position.set(
        distance * Math.sin(phi) * Math.cos(theta),
        distance * Math.cos(phi),
        distance * Math.sin(phi) * Math.sin(theta)
    );
    sunLamp.target.position.set(0, 0, 0);
    scene.add(sunLamp);
    scene.add(sunLamp.target);

    const hemiLight = new THREE.HemisphereLight(
        hemisphereSettings.skyColor,
        hemisphereSettings.groundColor,
        hemisphereSettings.intensity
    );
    scene.add(hemiLight);

    sunLamp.castShadow = true;
    sunLamp.shadow.radius = sunSettings.shadowRadius;
    sunLamp.shadow.mapSize.width = sunSettings.shadowMapSize;
    sunLamp.shadow.mapSize.height = sunSettings.shadowMapSize;
    sunLamp.shadow.camera.far = sunSettings.shadowCameraFar;
    sunLamp.shadow.camera.left = -sunSettings.shadowCameraSize;
    sunLamp.shadow.camera.right = sunSettings.shadowCameraSize;
    sunLamp.shadow.camera.top = sunSettings.shadowCameraSize;
    sunLamp.shadow.camera.bottom = -sunSettings.shadowCameraSize;
    sunLamp.shadow.bias = sunSettings.shadowBias; // prevents shadow acne
};

//Other Lights
function createStudioLights() {
    studioLightsSettings.forEach(config => {
        const rectLight = new THREE.RectAreaLight(
            config.color, 
            config.intensity, 
            config.width, 
            config.height
        );

        rectLight.position.set(config.position.x, config.position.y, config.position.z);
        
        // RectAreaLights need to "lookAt" a vector to rotate correctly
        rectLight.lookAt(config.lookAt.x, config.lookAt.y, config.lookAt.z);

        scene.add(rectLight);

        // Optional: Add a helper to see the light's placement during fine-tuning
        // const helper = new RectAreaLightHelper(rectLight);
        // scene.add(helper);
    });
};


function createEnvironment() {
    const geometry = new THREE.PlaneGeometry(terrainSettings.size, terrainSettings.size, terrainSettings.segments, terrainSettings.segments);

    const textureLoader = new THREE.TextureLoader();

    // Load all maps — swap paths to your actual files
    const colorMap     = textureLoader.load('/textures/sand/color.png');
    const normalMap    = textureLoader.load('/textures/sand/normal.png');
    const roughnessMap = textureLoader.load('/textures/sand/roughness.png');
    const aoMap        = textureLoader.load('/textures/sand/ao.png');

    // Tile all maps identically
    [colorMap, normalMap, roughnessMap, aoMap].forEach(tex => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(terrainSettings.textureTiling, terrainSettings.textureTiling); // adjust tiling
    });

    colorMap.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshStandardMaterial({
        map:              colorMap,
        normalMap:        normalMap,
        normalScale:      new THREE.Vector2(terrainSettings.normalScale, terrainSettings.normalScale), // intensity of normal detail
        roughnessMap:     roughnessMap,
        roughness:        terrainSettings.roughness,   // multiplied with roughnessMap values
        metalness:        terrainSettings.metalness,
        aoMap:            aoMap,
        aoMapIntensity:   terrainSettings.aoIntensity,   // 0 = no AO, 1 = full AO
        flatShading:      false,
    });

    applyDisplacement(material);

    floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;

    floor.geometry.setAttribute(
        'uv2',
        floor.geometry.attributes.uv
    );

    floor.receiveShadow = true;
    floor.castShadow = false;
    scene.add(floor);

    const plinths = createPlinths();
    assetFactory(plinths);
    createSky();
}

//Sky Box
function createSky() {
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
            uTopColor:    { value: new THREE.Color(skySettings.topColor) }, // sky blue
            uBottomColor: { value: new THREE.Color(skySettings.bottomColor) }, // sandy horizon
            uOffset:      { value: skySettings.offset },  // where the gradient starts
            uExponent:    { value: skySettings.exponent },  // how sharp the blend is
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPos.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uTopColor;
            uniform vec3 uBottomColor;
            uniform float uOffset;
            uniform float uExponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition).y + uOffset;
                gl_FragColor = vec4(mix(uBottomColor, uTopColor, max(pow(max(h, 0.0), uExponent), 0.0)), 1.0);
            }
        `,
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
};


// Generate Plinths / bases
function createPlinths() {
    const { bevel, segments, centralHeight, navHeight, horizontalDist, navY, lateralDist } = plinthSettings;

    const textureLoader = new THREE.TextureLoader();

    // load Material
    const baseMaterial = getMaterial('wall');


    // ── Central plinth — unique size, stays a regular Mesh ──────
    const centralGeo = new RoundedBoxGeometry(3, centralHeight, 3, segments, bevel);
    const central    = new THREE.Mesh(centralGeo, baseMaterial);
    central.position.set(0, navY, 0);
    central.castShadow    = true;
    central.receiveShadow = true;
    scene.add(central);

    // Nav plinths identical size, use InstancedMesh
    const navGeo  = new RoundedBoxGeometry(2, navHeight, 2, segments, bevel);
    const navMesh = new THREE.InstancedMesh(navGeo, baseMaterial, 3);
    navMesh.castShadow    = true;
    navMesh.receiveShadow = true;

    // Instance positions
    const navPositions = [
        { name: 'left',  x: lateralDist,   z: horizontalDist },  // 0
        { name: 'right', x: horizontalDist, z: lateralDist   },  // 1
        { name: 'front', x: horizontalDist, z: horizontalDist},  // 2
    ];

    const matrix = new THREE.Matrix4();
    navPositions.forEach((pos, i) => {
        matrix.makeTranslation(pos.x, navY, pos.z);
        navMesh.setMatrixAt(i, matrix);
    });
    navMesh.instanceMatrix.needsUpdate = true;
    scene.add(navMesh);

    // ── Return individual references for assetFactory ────────────
    // Extract world positions from the instance matrix for asset placement
    const leftPos  = new THREE.Vector3(navPositions[0].x, navY, navPositions[0].z);
    const rightPos = new THREE.Vector3(navPositions[1].x, navY, navPositions[1].z);
    const frontPos = new THREE.Vector3(navPositions[2].x, navY, navPositions[2].z);

    // Wrap in position-only objects so assetFactory still works unchanged
    return {
        central: central,
        left:    { position: leftPos  },
        right:   { position: rightPos },
        front:   { position: frontPos },
        baseMaterial: baseMaterial,
    };
};

//importing assets
function assetFactory(plinths) {
    const loader = new GLTFLoader(loadingManager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(assetSettings.dracoPath);
    loader.setDRACOLoader(dracoLoader);

    assetSettings.manifest.forEach((asset) => {
        loader.load(asset.path, (gltf) => {
            const model = gltf.scene;
            const targetPlinth = plinths[asset.plinth];

            if (targetPlinth) {
                // 1. Calculate Base Height (Top of Plinth)
                const isCentral    = asset.plinth === 'central';
                const plinthHeight = isCentral ? plinthSettings.centralHeight : plinthSettings.navHeight;
                const baseHeight   = plinthSettings.navY + (plinthHeight / 2);

                // 2. Apply Coordinates (Plinth Position + Fine-tune Offsets)
                model.position.set(
                    targetPlinth.position.x + asset.offset.x,
                    baseHeight + asset.offset.y,
                    targetPlinth.position.z + asset.offset.z
                );

                // 3. Apply Scale
                model.scale.setScalar(asset.scale);

                // 4. Shadows + Material override
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow    = true;
                        node.receiveShadow = true;

                        // If manifest specifies a material key, fetch from registry
                        // null or omitted = keep GLB's own material unchanged
                        if (asset.material) {
                            const mat = getMaterial(asset.material);
                            if (mat) node.material = mat;
                        }
                    }
                });

                scene.add(model);

                // Populate Billboard
                if (asset.name === 'couch') {
                    createBillboard(model);
                }
            }
        },
        undefined,
        (err) => console.error(`Error loading ${asset.name}:`, err));
    });
};

//Logic for the terrain
function applyDisplacement(material) {
    material.onBeforeCompile = (shader) => {
        material.userData.shader = shader;
        shader.uniforms.uTime      = { value: 0 };
        shader.uniforms.uStrength  = { value: displacementSettings.strength };
        shader.uniforms.uMidlevel  = { value: displacementSettings.midlevel };
        shader.uniforms.uSize      = { value: displacementSettings.size };
        shader.uniforms.uAnimSpeed = { value: displacementSettings.animSpeed };

        shader.vertexShader = `
            uniform float uTime;
            uniform float uStrength;
            uniform float uMidlevel;
            uniform float uSize;
            uniform float uAnimSpeed;
            varying vec2 vUv;

            // --- Simplex Noise ---
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187,
                                    0.366025403784439,
                                   -0.577350269189626,
                                    0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m * m;
                m = m * m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            // --- FBM built on Simplex ---
            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
                for (int i = 0; i < 4; i++) {
                    v += a * (snoise(p) * 0.5 + 0.5);
                    p  = rot * p * 2.1;
                    a *= 0.5;
                }
                return v;
            }

            float getHeight(vec2 uv) {
                return (fbm((uv / uSize) + uTime * uAnimSpeed) - uMidlevel) * uStrength;
            }

            ${shader.vertexShader}
        `.replace(
            '#include <beginnormal_vertex>',
            `
            #include <beginnormal_vertex>

            float offset     = ${displacementSettings.offset.toFixed(4)};
            float worldScale = ${displacementSettings.worldScale.toFixed(1)};
            float h  = getHeight(uv);
            float hX = getHeight(uv + vec2(offset, 0.0));
            float hY = getHeight(uv + vec2(0.0, offset));

            vec3 v1 = normalize(vec3(worldScale * offset, 0.0, hX - h));
            vec3 v2 = normalize(vec3(0.0, worldScale * offset, hY - h));

            objectNormal = normalize(cross(v1, v2));
            `
        ).replace(
            '#include <begin_vertex>',
            `
            vUv = uv;
            float elevation = getHeight(vUv);
            vec3 transformed = vec3(position.x, position.y, position.z + elevation);
            `
        );

        shader.fragmentShader = shader.fragmentShader
            .replace(
                'void main() {',
                `varying vec2 vUv;
                void main() {
                    if(distance(vUv, vec2(0.5)) > 0.5) discard;`
            );
    };
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height
    camera.aspect = aspect;
    //responsive resize
    if (aspect < 1) {
        let calculatedFov = cameraSettings.fov * (1 / aspect) * cameraSettings.mobileFovMultiplier;
        camera.fov = Math.min(75, calculatedFov);
    } else {
        camera.fov = cameraSettings.fov;
    };

    camera.updateProjectionMatrix();
    composer.setSize(width, height);
    labelRenderer.setSize(width, height);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, rendererSettings.pixelRatio));
};

// billboard Function
function createBillboard(model) {
    const { centralBillboard } = labelSettings;

    const div = document.createElement('div');
    div.className = 'central-billboard';
    div.textContent = centralBillboard.text;

    const label = new CSS2DObject(div);
    label.position.set(
        centralBillboard.offset.x,
        centralBillboard.offset.y,
        centralBillboard.offset.z
    );

    label.element.parentNode && (label.element.style.overflow = 'hidden');

    const observer = new MutationObserver(() => {
    if (label.element.parentElement) {
            label.element.parentElement.style.overflow = 'hidden';
            label.element.parentElement.style.pointerEvents = 'none';
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    model.add(label);
};

// Loading Manager Setup
function setupLoadingManager() {
    loadingManager = new THREE.LoadingManager();

    const screen   = document.getElementById('loading-screen');
    const subtext  = document.getElementById('loading-subtext');
    const fill     = document.getElementById('loading-bar-fill');
    const percent  = document.getElementById('loading-percent');

    loadingManager.onStart = (url, loaded, total) => {
        subtext.textContent = getLoadingMessage(url);
    };

    loadingManager.onProgress = (url, loaded, total) => {
        const progress = Math.round((loaded / total) * 100);
        fill.style.width    = `${progress}%`;
        percent.textContent = `${progress}%`;
        subtext.textContent = getLoadingMessage(url);
    };

    loadingManager.onLoad = () => {
        percent.textContent = '100%';
        fill.style.width    = '100%';
        subtext.textContent = loadingMessages.done;
        isLoaded = true;

        // Short delay so user sees 100% before fade
        setTimeout(() => {
            screen.classList.add('hidden');
            // Remove from DOM after fade completes
            screen.addEventListener('transitionend', () => screen.remove(), { once: true });
        }, 500);
    };

    loadingManager.onError = (url) => {
        subtext.textContent = `Failed to load: ${url.split('/').pop()}`;
        console.error(`LoadingManager: failed to load ${url}`);
    };
}

function getLoadingMessage(url) {
    if (url.match(/\.(glb|gltf)$/i)) return loadingMessages.models;
    if (url.match(/\.(jpg|jpeg|png|webp)$/i)) return loadingMessages.textures;
    return loadingMessages.geometry;
};

function animate() {
    timer.update();
    const elapsedTime = timer.getElapsed();

    // Only run parallax in experience mode
    if (!isTopView && isLoaded) {
        target.x += (mouse.x - target.x) * controlSettings.smoothingX;
        target.y += (mouse.y - target.y) * controlSettings.smoothingY;

        const clampedY = Math.max(controlSettings.minTilt, Math.min(controlSettings.maxTilt, target.y));
        const azimuth  = -target.x * controlSettings.azimuthRange;
        const altitude = -clampedY * controlSettings.altitudeRange;

        const radius = Math.sqrt(
            cameraSettings.position.x ** 2 +
            cameraSettings.position.y ** 2 +
            cameraSettings.position.z ** 2
        );

        const baseAzimuth  = Math.atan2(cameraSettings.position.x, cameraSettings.position.z);
        const baseAltitude = Math.asin(cameraSettings.position.y / radius);

        camera.position.x = radius * Math.cos(baseAltitude - altitude) * Math.sin(baseAzimuth + azimuth);
        camera.position.y = radius * Math.sin(baseAltitude - altitude);
        camera.position.z = radius * Math.cos(baseAltitude - altitude) * Math.cos(baseAzimuth + azimuth);

        camera.lookAt(
            cameraSettings.lookAt.x,
            cameraSettings.lookAt.y,
            cameraSettings.lookAt.z
        );
    }

    if (floor && floor.material.userData.shader) {
        floor.material.userData.shader.uniforms.uTime.value = elapsedTime;
    }

    composer.render();
    labelRenderer.render(scene, camera);
    window.requestAnimationFrame(animate);
};

init();