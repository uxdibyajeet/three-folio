/* 
Author: Dibyajeet Kirttania
Dated: 05 May, 2026
*/
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Global variables
let scene, camera, renderer, timer, floor, controls;

// ============================================================
//  GLOBAL CONFIGURATION
// ============================================================

const controlSettings = {
    enableDamping:   true,
    dampingFactor:   0.05,
    enablePan:       false,    // no panning — rotation only
    enableZoom:      false,    // no zoom — fixed distance
    minDistance:     10,       // lock distance for parallax feel
    maxDistance:     10,       // same as min = truly fixed distance
    maxPolarAngle:   Math.PI / 2.2,  // can't go below ground
    minPolarAngle:   Math.PI / 6,    // can't look straight up
    rotateSpeed:     0.4,      // slower = more cinematic parallax feel
    autoRotate:      false,    // set true if you want idle rotation
    autoRotateSpeed: 0.5,
};

const cameraSettings = {
    fov: 50,
    near: 0.1,
    far: 1000,
    position: { x: 10, y: 2, z: 10 },
    lookAt:   { x: 0, y: 0, z: 0 },
}

const sunSettings = {
    color:        0xfff4e0,   // warm white
    intensity:    8.0,
    elevation:    50,         // degrees above horizon (90 = straight up)
    azimuth:      -55,        // degrees horizontal rotation
    distance:     20,         // how far from scene center
    shadowMapSize: 2048,
    shadowCameraSize: 15,     // left/right/top/bottom bounds
    shadowCameraFar: 50,
    shadowBias:   -0.0003,
};

const ambientSettings = {
    color:     0xf5d9a8,      // warm fill
    intensity: 0.8,
};

const displacementSettings = {
    strength:  0.5,           // height of peaks
    midlevel:  0.4,           // baseline offset (0=all peaks, 1=all craters)
    size:      0.08,          // noise frequency (smaller = finer detail)
    offset:    0.001,         // normal calculation precision
    worldScale: 50.0,         // should match plane size
    animSpeed: 0.015,         // displacement Animation Speed
};

const terrainSettings = {
    size:      50,            // plane width & height
    segments:  512,           // vertex density (256 mobile, 512 desktop)
    roughness: 0.9,
    metalness: 0.0,
    textureTiling: 12,        // how many times texture repeats
    aoIntensity:   1.0,
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
    density: 0.018,
};

const rendererSettings = {
    toneMapping:         THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.1,
    pixelRatio:          2,   // cap for performance
};

// ============================================================
//  Start of code
// ============================================================

function init() {
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
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, rendererSettings.pixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = rendererSettings.toneMapping;
    renderer.toneMappingExposure = rendererSettings.toneMappingExposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    //Camera Orbit
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = controlSettings.enableDamping;
    controls.dampingFactor   = controlSettings.dampingFactor;
    controls.enablePan       = controlSettings.enablePan;
    controls.enableZoom      = controlSettings.enableZoom;
    controls.minDistance     = controlSettings.minDistance;
    controls.maxDistance     = controlSettings.maxDistance;
    controls.maxPolarAngle   = controlSettings.maxPolarAngle;
    controls.minPolarAngle   = controlSettings.minPolarAngle;
    controls.rotateSpeed     = controlSettings.rotateSpeed;
    controls.autoRotate      = controlSettings.autoRotate;
    controls.autoRotateSpeed = controlSettings.autoRotateSpeed;
    controls.target.set(
        cameraSettings.lookAt.x,
        cameraSettings.lookAt.y,
        cameraSettings.lookAt.z
    );

    // Listeners
    window.addEventListener('resize', onWindowResize);

    scene.fog = new THREE.FogExp2(fogSettings.color, fogSettings.density);

    // Initialize the world environment
    handleLights();
    createEnvironment();
    animate();           
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

    sunLamp.castShadow = true;
    sunLamp.shadow.mapSize.width = sunSettings.shadowMapSize;
    sunLamp.shadow.mapSize.height = sunSettings.shadowMapSize;
    sunLamp.shadow.camera.far = sunSettings.shadowCameraFar;
    sunLamp.shadow.camera.left = -sunSettings.shadowCameraSize;
    sunLamp.shadow.camera.right = sunSettings.shadowCameraSize;
    sunLamp.shadow.camera.top = sunSettings.shadowCameraSize;
    sunLamp.shadow.camera.bottom = -sunSettings.shadowCameraSize;
    sunLamp.shadow.bias = sunSettings.shadowBias; // prevents shadow acne
}

function createEnvironment() {
    const geometry = new THREE.PlaneGeometry(terrainSettings.size, terrainSettings.size, terrainSettings.segments, terrainSettings.segments);

    const textureLoader = new THREE.TextureLoader();

    // Load all maps — swap paths to your actual files
    const colorMap     = textureLoader.load('/textures/sand/color.png');
    const normalMap    = textureLoader.load('/textures/sand/normal.png');
    const roughnessMap = textureLoader.load('/textures/sand/roughness.png');
    const aoMap        = textureLoader.load('/textures/sand/ao.jpg');
    const displacementMap = textureLoader.load('/textures/sand/displacement.jpg'); // optional

    // Tile all maps identically
    [colorMap, normalMap, roughnessMap, aoMap, displacementMap].forEach(tex => {
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
        // displacementMap:  displacementMap,
        // displacementScale: 0.3,
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
    // Update variables locally to get fresh window sizes
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, rendererSettings.pixelRatio));
}

function animate() {
    timer.update();
    const elapsedTime = timer.getElapsed();
    
    controls.update();

    // update terrain shader displacement
    if (floor && floor.material.userData.shader) {
        floor.material.userData.shader.uniforms.uTime.value = elapsedTime;
    };
    
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
}

init();