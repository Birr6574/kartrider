// 1. Three.js 기본 환경 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.85); scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(50, 100, 50); dirLight.castShadow = true;
dirLight.shadow.camera.top = 500; dirLight.shadow.camera.bottom = -500; dirLight.shadow.camera.left = -500; dirLight.shadow.camera.right = 500;
dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

const mapGroup = new THREE.Group();
scene.add(mapGroup);

// 💡 공간 분할 (Spatial Hashing) 그리드 및 OBB 콜라이더
const colliderGrid = new Map();
const boxColliders = [];
function addBoxCollider(x, z, w, d, rotY) {
    let box = {x, z, w, d, rot: rotY};
    let cx = Math.floor(x / 50), cz = Math.floor(z / 50);
    let key = cx + ',' + cz;
    if(!colliderGrid.has(key)) colliderGrid.set(key, []);
    colliderGrid.get(key).push(box);
    boxColliders.push(box);
}

// 공통 좌표 변환 함수
const mapToWorld = (cx, cz) => ({ x: (cx / 2048) * 1024 - 512, z: (cz / 2048) * 1024 - 512 });

// 전역 상태 변수들
let currentMap = 'village';
let isGameRunning = false; 
let lobbyAnimId; 
let isPaused = false;
let carMesh;
let frameCount = 0;
let frontWheelL, frontWheelR; 

const sharedSkidMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.5, depthWrite: false });
const skidMarks = []; 
const skidGeom = new THREE.PlaneGeometry(0.6, 1.0);
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Shift: false, Control: false, r: false, R: false };

const MAX_NORMAL = 130 / 60; const MAX_INSTANT = 154 / 60; const MAX_BOOST = 220 / 60; const MAX_REVERSE = -100 / 60; 

const car = {
  speed: 0, accel: 0.02, boostAccel: 0.06, instantAccel: 0.035, turnSpeed: 0.045, driftTurnSpeed: 0.08, 
  grip: 0.18, driftGrip: 0.025, currentGrip: 0.18, angle: 0, velocityAngle: 0, gauge: 0, boosterCount: 0, maxBoosters: 2,
  isBoosting: false, boostTime: 0, driftState: 0, boostsGainedThisDrift: 0, lastAngleDiff: 0, 
  wasDrifting: false, instantBoostWindow: 0, canTriggerInstant: false, isInstantBoosting: false, instantBoostTimer: 0, toktokiTimer: 0,
  visualRoll: 0, rollVelocity: 0, visualPitch: 0, pitchVelocity: 0, steerAngle: 0,
  lap: 1, checkPoint: false, isFinished: false,
  shiftReleaseTime: 0, isDoubleDrifting: false, doubleDriftTimer: 0, driftStartDir: 0
};

const cameraLookTarget = new THREE.Vector3();
