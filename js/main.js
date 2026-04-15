const uiSpeed = document.getElementById('speedDisplay');
const uiGauge = document.getElementById('gauge');
const uiSlot1 = document.getElementById('slot1');
const uiSlot2 = document.getElementById('slot2');
const uiBoostStatus = document.getElementById('boostStatus');
const uiLapCount = document.getElementById('lapCount');

function showTechAlert(text, color, duration = 800) {
  const el = document.getElementById('techAlert');
  el.innerHTML = text; el.style.color = color; el.style.opacity = 1;
  if(el.timeout) clearTimeout(el.timeout);
  el.timeout = setTimeout(() => { el.style.opacity = 0; }, duration);
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function previewCharacter(type) { changeCharacter(type); }
function selectMap(type) { loadMap(type); showTechAlert(type === 'village' ? '빌리지 손가락 선택됨!' : '테스트 구장 선택됨!', '#2ecc71'); }
function resumeGame() { isPaused = false; document.getElementById('pauseMenu').style.display = 'none'; }
function exitToLobby() {
    isPaused = false; isGameRunning = false; car.isFinished = false;
    document.getElementById('pauseMenu').style.display = 'none'; document.getElementById('gameUI').style.display = 'none';
    document.getElementById('lobbyUI').style.display = 'flex'; animateLobby();
}

// 스키드 마크(타이어 자국) 오브젝트 풀링
const MAX_SKIDS = 100;
const skidPoolL = []; const skidPoolR = [];
let skidIdx = 0;

carMesh = createKart(); scene.add(carMesh); changeCharacter('dizzy'); loadMap('village'); 
for(let i=0; i<MAX_SKIDS; i++) {
    let mL = new THREE.Mesh(skidGeom, sharedSkidMat); mL.visible = false; scene.add(mL); skidPoolL.push(mL);
    let mR = new THREE.Mesh(skidGeom, sharedSkidMat); mR.visible = false; scene.add(mR); skidPoolR.push(mR);
}

function animateLobby() {
    if (isGameRunning) return;
    lobbyAnimId = requestAnimationFrame(animateLobby);
    carMesh.rotation.y -= 0.01; renderer.render(scene, camera);
}
camera.position.set(13, 10, 18); camera.lookAt(new THREE.Vector3(0, 3, 0));
animateLobby();

window.addEventListener('keydown', e => { 
    if (e.repeat) return; 
    if (keys.hasOwnProperty(e.key)) {
        if (e.key === 'Shift' && isGameRunning && !isPaused && !car.isFinished) {
            let now = performance.now();
            let currentSteer = keys.ArrowLeft ? 1 : (keys.ArrowRight ? -1 : 0);
            let timeSinceRelease = now - car.shiftReleaseTime;
            
            if (timeSinceRelease < 300 && currentSteer !== 0 && currentSteer === car.driftStartDir && car.driftState > 0) {
                car.isDoubleDrifting = true; car.doubleDriftTimer = 40; showTechAlert("더블 드리프트!", "#9b59b6");
            } else { car.driftStartDir = currentSteer; }
        }
        keys[e.key] = true; 
    }
    if (e.key === 'Escape' && isGameRunning && !car.isFinished) {
        isPaused = !isPaused; document.getElementById('pauseMenu').style.display = isPaused ? 'flex' : 'none';
    }
});

window.addEventListener('keyup', e => { 
    if(keys.hasOwnProperty(e.key)) keys[e.key] = false; 
    if(e.key === 'Shift') car.shiftReleaseTime = performance.now();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); if (!isGameRunning) renderer.render(scene, camera);
});

document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('lobbyUI').style.display = 'none'; document.getElementById('gameUI').style.display = 'block';
  document.getElementById('charModal').style.display = 'none'; document.getElementById('mapModal').style.display = 'none';
  document.activeElement.blur(); 
  
  car.lap = 1; car.checkPoint = false; car.isFinished = false;
  car.speed = 0; car.gauge = 0; car.boosterCount = 0; car.driftState = 0; car.isDoubleDrifting = false; car.lastDriftDir = 0;
  uiLapCount.innerText = car.lap;
  if(currentMap !== 'village') document.getElementById('lapDisplay').style.display = 'none';
  else document.getElementById('lapDisplay').style.display = 'block';

  for(let i=0; i<MAX_SKIDS; i++) { skidPoolL[i].visible = false; skidPoolR[i].visible = false; }
  isGameRunning = true; cancelAnimationFrame(lobbyAnimId);
  
  if (currentMap === 'village') {
      car.angle = -Math.PI / 2; car.velocityAngle = -Math.PI / 2; carMesh.rotation.y = -Math.PI / 2;
      const startPos = mapToWorld(1400, 1750); carMesh.position.set(startPos.x, 0, startPos.z);
      camera.position.set(carMesh.position.x + 24, 20, carMesh.position.z); camera.lookAt(carMesh.position);
  } else {
      car.angle = 0; car.velocityAngle = 0; carMesh.rotation.y = 0;
      carMesh.position.set(0, 0, 0); camera.position.set(0, 20, -24); camera.lookAt(carMesh.position);
  }
  animateGame(); 
});

function animateGame() {
  if (!isGameRunning) return;
  requestAnimationFrame(animateGame);
  frameCount++;

  if (isPaused) { renderer.render(scene, camera); return; } 

  let prevX = carMesh.position.x; 

  if (car.isFinished) {
      keys.ArrowUp = false; keys.ArrowDown = false; keys.Shift = false; keys.Control = false;
      car.speed *= 0.95; 
  }

  if (keys.Control && car.boosterCount > 0 && !car.isBoosting && car.speed >= 0) { car.isBoosting = true; car.boosterCount--; car.boostTime = 150; }
  if (car.isBoosting) { car.boostTime--; if(car.boostTime <= 0) car.isBoosting = false; }

  let absSpeed = Math.abs(car.speed);
  let isDrifting = keys.Shift && absSpeed > 0.5;
  
  if (car.isDoubleDrifting) {
      car.doubleDriftTimer--;
      if (car.doubleDriftTimer <= 0 || !keys.Shift) car.isDoubleDrifting = false;
  }

  if (isDrifting) car.driftState = 1; else if (car.driftState === 1 && Math.abs(car.lastAngleDiff) > 0.1) car.driftState = 2; else if (car.driftState === 2 && Math.abs(car.lastAngleDiff) < 0.04) car.driftState = 0; else if (!isDrifting && Math.abs(car.lastAngleDiff) < 0.1) car.driftState = 0; 
  if (car.driftState === 0) car.boostsGainedThisDrift = 0; 
  let isDragging = (car.driftState === 2); let isSliding = isDrifting || isDragging; 

  if (!isDrifting && car.wasDrifting && Math.abs(car.lastAngleDiff) > 0.08 && car.speed >= 0) { car.instantBoostWindow = 30; car.canTriggerInstant = !keys.ArrowUp; }
  if (car.instantBoostWindow > 0) {
    car.instantBoostWindow--;
    if (car.speed >= 0 && !keys.ArrowUp) car.canTriggerInstant = true;
    if (car.speed >= 0 && keys.ArrowUp && car.canTriggerInstant && !car.isInstantBoosting) {
      car.isInstantBoosting = true; car.instantBoostTimer = 30; car.instantBoostWindow = 0; car.speed += 0.3; showTechAlert("순간 부스터!", "#f1c40f");
      if (Math.abs(car.lastAngleDiff) < 0.3) { car.driftState = 0; car.currentGrip = 0.8; }
    }
  }
  if (car.isInstantBoosting) { car.instantBoostTimer--; if (car.instantBoostTimer <= 0) car.isInstantBoosting = false; }
  
  let boostGained = false;
  if (car.wasDrifting && !isSliding) {
      if (car.gauge >= 100 && car.boosterCount < car.maxBoosters) {
          car.boosterCount++; car.gauge = 0; boostGained = true;
      }
  }
  car.wasDrifting = isDrifting; 

  let currentMax = car.isBoosting ? MAX_BOOST : (car.isInstantBoosting ? MAX_INSTANT : MAX_NORMAL);
  let currentAccel = car.isBoosting ? car.boostAccel : (car.isInstantBoosting ? car.instantAccel : car.accel);
  let hardLimit = currentMax;

  let speedPenalty = Math.max(0.65, 1.
