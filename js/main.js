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

// 💡 스키드 마크 최적화 (오브젝트 풀링)
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

// 💡 이벤트 리스너 (오토 리피트 방지)
window.addEventListener('keydown', e => { 
    if (e.repeat) return; 
    if (keys.hasOwnProperty(e.key)) {
        if (e.key === 'Shift' && isGameRunning && !isPaused && !car.isFinished) {
            let now = performance.now();
            let currentSteer = keys.ArrowLeft ? 1 : (keys.ArrowRight ? -1 : 0);
            let timeSinceRelease = now - car.shiftReleaseTime;
            
            // 더블 드리프트
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

// 💡 5. 메인 인게임 루프
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

  let speedPenalty = Math.max(0.65, 1.0 - (absSpeed / 8.0)); 
  let tSpeed = (isSliding ? car.driftTurnSpeed : car.turnSpeed) * speedPenalty;
  if (car.isDoubleDrifting) tSpeed *= 1.45; 

  let targetSteer = 0; let steerDir = (car.speed >= 0) ? 1 : -1; 
  if (absSpeed > 0.1) {
    if (keys.ArrowLeft) { car.angle += tSpeed * steerDir; targetSteer = 0.5 * steerDir; }
    if (keys.ArrowRight) { car.angle -= tSpeed * steerDir; targetSteer = -0.5 * steerDir; }
  }
  car.steerAngle += (targetSteer - car.steerAngle) * 0.2; frontWheelL.rotation.y = car.steerAngle; frontWheelR.rotation.y = car.steerAngle;

  let angleDiff = car.angle - car.velocityAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2; while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  if (isSliding) {
      if (angleDiff > Math.PI) { car.angle = car.velocityAngle + Math.PI; angleDiff = Math.PI; } else if (angleDiff < -Math.PI) { car.angle = car.velocityAngle - Math.PI; angleDiff = -Math.PI; }
  }
  car.lastAngleDiff = angleDiff;

  let targetGrip = isSliding ? car.driftGrip : car.grip;
  if (car.isDoubleDrifting) targetGrip = 0.035; 

  let isOppositeDir = false; let isSpinningOut = Math.abs(angleDiff) > 1.5; 
  if (!isSpinningOut) {
      if (steerDir === 1) isOppositeDir = (angleDiff > 0.2 && keys.ArrowRight) || (angleDiff < -0.2 && keys.ArrowLeft);
      else isOppositeDir = (angleDiff > 0.2 && keys.ArrowLeft) || (angleDiff < -0.2 && keys.ArrowRight);
  }
  if (isSliding && isOppositeDir) { targetGrip = 0.5; car.driftState = 0; if (Math.abs(angleDiff) > 0.3 && Math.random() < 0.1 && car.speed >= 0) showTechAlert("뉴커팅!", "#e74c3c"); }
  
  let gripRecoverySpeed = isDrifting ? 0.2 : (isDragging ? 0.005 : 0.1); 
  car.currentGrip += (targetGrip - car.currentGrip) * gripRecoverySpeed; car.velocityAngle += angleDiff * car.currentGrip;

  let speedBefore = car.speed; let drag = 0.002 * (absSpeed * absSpeed); 
  if (keys.ArrowUp) { car.speed += currentAccel; if (car.speed > 0) car.speed -= drag; else car.speed += drag; } 
  else if (keys.ArrowDown) { car.speed -= 0.03; if (car.speed > 0) car.speed -= drag; else car.speed += drag; } 
  else { if (car.speed > 0) car.speed = Math.max(0, car.speed - drag - 0.01); else if (car.speed < 0) car.speed = Math.min(0, car.speed + drag + 0.01); }

  if (isDrifting) {
      if (keys.ArrowUp && car.speed > 0) { car.speed *= 0.996; if (Math.abs(angleDiff) > 1.0) car.speed *= 0.99; } 
      else if (keys.ArrowDown && car.speed < 0) { car.speed *= 0.996; if (Math.abs(angleDiff) > 1.0) car.speed *= 0.99; }
  }

  let isUserTokToki = isDragging && keys.ArrowUp && ((angleDiff > 0.15 && keys.ArrowLeft) || (angleDiff < -0.15 && keys.ArrowRight)) && Math.abs(angleDiff) < 0.95 && (car.isBoosting || car.isInstantBoosting);
  if (isUserTokToki) { car.speed += 0.015; car.toktokiTimer = 45; if (Math.random() < 0.05) showTechAlert("톡톡이 가속!", "#3498db"); } 
  else if (isDragging && keys.ArrowUp) { car.speed += 0.001; }

  if (car.toktokiTimer > 0) { car.toktokiTimer--; hardLimit = car.isBoosting ? 240/60 : (car.isInstantBoosting ? 154/60 : 135/60); } 
  else if (isDragging) { hardLimit = car.isBoosting ? 230/60 : (car.isInstantBoosting ? 154/60 : 130/60); }

  if (car.speed > hardLimit) car.speed = (speedBefore > hardLimit + 0.03) ? Math.min(car.speed, speedBefore - 0.03) : hardLimit;
  if (car.speed < MAX_REVERSE) car.speed = MAX_REVERSE; 

  carMesh.position.x += Math.sin(car.velocityAngle) * car.speed;
  carMesh.position.z += Math.cos(car.velocityAngle) * car.speed;
  
  let px = carMesh.position.x, pz = carMesh.position.z;
  
  // 💡 [거리 최적화] 트랙 중심과의 거리 및 가장 가까운 선분 1번 연산
  let minDistTrack = Infinity, closestXx = 0, closestZz = 0, cI = 0;
  if (currentMap === 'village') {
      for (let i = 0; i < trackPointsWorld.length - 1; i++) {
          let p1 = trackPointsWorld[i], p2 = trackPointsWorld[i+1];
          let A = px - p1.x, B = pz - p1.z, C = p2.x - p1.x, D = p2.z - p1.z;
          let dot = A*C + B*D, len_sq = C*C + D*D, param = (len_sq !== 0) ? dot / len_sq : -1;
          let xx, zz;
          if (param < 0) { xx = p1.x; zz = p1.z; } else if (param > 1) { xx = p2.x; zz = p2.z; } else { xx = p1.x + param*C; zz = p1.z + param*D; }
          let distSq = (px - xx)*(px - xx) + (pz - zz)*(pz - zz);
          if (distSq < minDistTrack) { minDistTrack = distSq; closestXx = xx; closestZz = zz; cI = i; }
      }
  }

  // R키 복귀
  if (keys.r || keys.R) {
      if (currentMap === 'village') {
          carMesh.position.set(closestXx, 0, closestZz);
          let dx = trackPointsWorld[cI+1].x - trackPointsWorld[cI].x;
          let dz = trackPointsWorld[cI+1].z - trackPointsWorld[cI].z;
          car.angle = Math.atan2(dx, dz); car.velocityAngle = car.angle;
      } else {
          carMesh.position.set(0, 0, 0); car.angle = 0; car.velocityAngle = 0;
      }
      car.speed = 0; car.driftState = 0; car.isBoosting = false; car.isInstantBoosting = false; car.visualRoll = 0;
      showTechAlert("🔄 복귀!", "#2ecc71"); keys.r = false; keys.R = false; return; 
  }

  // 💡 소수 물체 OBB 물리엔진 판정 (배너 기둥 등)
  let hitWall = false, bounceNx = 0, bounceNz = 0;
  let gridX = Math.floor(px / 50), gridZ = Math.floor(pz / 50);
  for(let i = -1; i <= 1; i++) {
      for(let j = -1; j <= 1; j++) {
          let key = (gridX + i) + ',' + (gridZ + j);
          let boxes = colliderGrid.get(key);
          if (boxes) {
              for (let box of boxes) {
                  let dx = px - box.x, dz = pz - box.z;
                  let cosR = Math.cos(-box.rot), sinR = Math.sin(-box.rot);
                  let lx = dx * cosR - dz * sinR, lz = dx * sinR + dz * cosR;
                  let hW = box.w / 2, hD = box.d / 2;
                  let cx = Math.max(-hW, Math.min(hW, lx)), cz = Math.max(-hD, Math.min(hD, lz));
                  let wCos = Math.cos(box.rot), wSin = Math.sin(box.rot);
                  let closestX = box.x + (cx * wCos - cz * wSin);
                  let closestZ = box.z + (cx * wSin + cz * wCos);
                  let distToWall = Math.hypot(px - closestX, pz - closestZ);
                  let carRadius = 2.0; 
                  
                  if (distToWall < carRadius) {
                      let pen = carRadius - distToWall;
                      let nx, nz;
                      if (distToWall === 0) {
                          if (hW - Math.abs(lx) < hD - Math.abs(lz)) { nx = Math.sign(lx) * wCos; nz = Math.sign(lx) * wSin; pen = (hW - Math.abs(lx)) + carRadius; } 
                          else { nx = -Math.sign(lz) * wSin; nz = Math.sign(lz) * wCos; pen = (hD - Math.abs(lz)) + carRadius; }
                      } else {
                          nx = (px - closestX) / distToWall; nz = (pz - closestZ) / distToWall;
                      }
                      px += nx * pen; pz += nz * pen;
                      hitWall = true; bounceNx = nx; bounceNz = nz;
                  }
              }
          }
      }
  }

  // 💡 수학적 벽면 판정 (지름길 및 오프로드 마감)
  if (currentMap === 'village') {
      let finalDistSq = minDistTrack;
      let finalClosestX = closestXx;
      let finalClosestZ = closestZz;
      let inShortcut = false;

      for (let seg of shortcutSegmentsWorld) {
          let A = px - seg.p1.x, B = pz - seg.p1.z, C = seg.p2.x - seg.p1.x, D = seg.p2.z - seg.p1.z;
          let dot = A*C + B*D, len_sq = C*C + D*D, param = (len_sq !== 0) ? dot / len_sq : -1;
          let xx, zz;
          if (param < 0) { xx = seg.p1.x; zz = seg.p1.z; } else if (param > 1) { xx = seg.p2.x; zz = seg.p2.z; } else { xx = seg.p1.x + param*C; zz = seg.p1.z + param*D; }
          let distSq = (px - xx)*(px - xx) + (pz - zz)*(pz - zz);
          if (distSq < finalDistSq) { 
              finalDistSq = distSq; finalClosestX = xx; finalClosestZ = zz; inShortcut = true; 
          }
      }

      let distTrack = Math.sqrt(finalDistSq);
      
      // 오프로드
      if (distTrack > 38 && distTrack <= 48) { 
          if (car.speed > 1.2) car.speed *= 0.94; 
          if (car.speed < -0.5) car.speed *= 0.94;
          car.currentGrip = 0.03; 
      }

      // 벽 튕김 (지름길 내부에서도 48px 이상 벗어나면 튕기도록 완벽 수정)
      if (distTrack > 48 && !inShortcut) {
          let nx = (px - finalClosestX) / distTrack, nz = (pz - finalClosestZ) / distTrack;
          px = finalClosestX + nx * 48; 
          pz = finalClosestZ + nz * 48;
          hitWall = true; bounceNx = nx; bounceNz = nz;
      }
      
      let distToHalf = Math.hypot(px - (-362), pz - (-12)); 
      if (distToHalf < 200) car.checkPoint = true; 
      
      let finishX = 188, finishZ = 363; 
      if (prevX > finishX && px <= finishX && Math.abs(pz - finishZ) < 80) {
          if (car.checkPoint && car.speed > 0 && !car.isFinished) {
              car.lap++; car.checkPoint = false;
              if (car.lap > 3) {
                  car.isFinished = true;
                  showTechAlert("🏁 FINISH! 🏁<br><span style='font-size:24px; color:white;'>5초 후 로비로 이동합니다.</span>", "#f1c40f", 5000);
                  setTimeout(exitToLobby, 5000);
              } else {
                  uiLapCount.innerText = car.lap; showTechAlert("LAP " + car.lap, "#3498db");
              }
          }
      }
  }

  // 충돌 대미지 (게이지 삭감 및 튕김)
  if (hitWall) {
      let vx = Math.sin(car.velocityAngle) * car.speed, vz = Math.cos(car.velocityAngle) * car.speed;
      let dotProduct = vx * bounceNx + vz * bounceNz;
      if (dotProduct < 0) {
          vx -= 1.6 * dotProduct * bounceNx; vz -= 1.6 * dotProduct * bounceNz;
          let impactSpeed = Math.abs(dotProduct);
          car.speed = Math.sqrt(vx*vx + vz*vz) * 0.4; if (car.speed > 0.01) car.velocityAngle = Math.atan2(vx, vz);
          car.driftState = 0; 
          let gaugeLoss = impactSpeed * 30; 
          car.gauge = Math.max(0, car.gauge - gaugeLoss); 
          car.visualRoll += (Math.random() - 0.5) * 0.8; 
          showTechAlert("💥 충돌! -" + Math.floor(gaugeLoss), "#e74c3c");
      }
  }
  carMesh.position.x = px; carMesh.position.z = pz;

  carMesh.rotation.y = car.angle;
  const springStiffness = 0.1; const damping = 0.85; 
  let clampedRollDiff = Math.max(-1.5, Math.min(1.5, angleDiff));
  let targetRoll = Math.max(-0.25, Math.min(0.25, -clampedRollDiff * (absSpeed / 4.0) * 0.4)); 
  car.rollVelocity = (car.rollVelocity + (targetRoll - car.visualRoll) * springStiffness) * damping; car.visualRoll += car.rollVelocity;
  carMesh.bodyWrapper.rotation.z = car.visualRoll;

  let targetPitch = keys.ArrowUp ? -0.04 * (car.speed / 4.0) : (keys.ArrowDown ? 0.08 * (Math.max(car.speed, 0) / 4.0) : 0); 
  if (car.isBoosting || car.isInstantBoosting) targetPitch = -0.1; 
  car.pitchVelocity = (car.pitchVelocity + (targetPitch - car.visualPitch) * springStiffness) * damping; car.visualPitch += car.pitchVelocity;
  carMesh.bodyWrapper.rotation.x = car.visualPitch;

  // 타이어 스키드 마크 (오브젝트 풀링 렌더링)
  if (Math.abs(angleDiff) > 0.08 && absSpeed > 0.5 && car.currentGrip < 0.12 && frameCount % 2 === 0) {
    const dirX = Math.sin(car.angle), dirZ = Math.cos(car.angle), rightX = Math.cos(car.angle), rightZ = -Math.sin(car.angle);
    let mL = skidPoolL[skidIdx];
    mL.rotation.x = -Math.PI / 2; mL.rotation.z = -car.angle;
    mL.position.set(carMesh.position.x - dirX*2.0 - rightX*1.5, 0.05, carMesh.position.z - dirZ*2.0 - rightZ*1.5);
    mL.scale.x = 1.0; mL.life = 40; mL.visible = true;
    let mR = skidPoolR[skidIdx];
    mR.rotation.x = -Math.PI / 2; mR.rotation.z = -car.angle;
    mR.position.set(carMesh.position.x - dirX*2.0 + rightX*1.5, 0.05, carMesh.position.z - dirZ*2.0 + rightZ*1.5);
    mR.scale.x = 1.0; mR.life = 40; mR.visible = true;
    skidIdx = (skidIdx + 1) % MAX_SKIDS;
  }
  for (let i = 0; i < MAX_SKIDS; i++) {
    if(skidPoolL[i].visible) { skidPoolL[i].life--; skidPoolL[i].scale.x *= 0.95; if(skidPoolL[i].life <= 0) skidPoolL[i].visible = false; }
    if(skidPoolR[i].visible) { skidPoolR[i].life--; skidPoolR[i].scale.x *= 0.95; if(skidPoolR[i].life <= 0) skidPoolR[i].visible = false; }
  }

  carMesh.fire1.visible = carMesh.fire2.visible = (car.isBoosting || car.isInstantBoosting);
  if(car.isBoosting || car.isInstantBoosting) {
      const scale = 1 + Math.random() * (car.isInstantBoosting ? 0.3 : 0.6);
      carMesh.fire1.scale.set(1, 1, scale); carMesh.fire2.scale.set(1, 1, scale);
  }

  if (isSliding && Math.abs(angleDiff) > 0.05 && car.speed > 1) {
    if (car.boosterCount < car.maxBoosters) {
      if (car.boostsGainedThisDrift < 1) {
        let multi = (car.isBoosting || car.isInstantBoosting) ? 1.6 : 2.2;
        if (car.isDoubleDrifting) multi *= 1.5;
        car.gauge += Math.abs(angleDiff) * (car.speed * 0.3) * multi; 
        if (car.gauge >= 100) { car.gauge = 100; }
      }
    } else { car.gauge = 0; }
  }
  if (!isSliding && car.speed > 1.0 && keys.ArrowUp) {
      if (car.boosterCount < car.maxBoosters) {
          car.gauge += car.speed * 0.04; 
          if (car.gauge >= 100) { car.boosterCount++; car.gauge = 0; boostGained = true; }
      }
  }

  if (boostGained) showTechAlert("부스터 획득!", "#3498db");

  uiSpeed.innerText = Math.floor(Math.abs(car.speed) * 60);
  uiGauge.style.width = car.gauge + '%';
  if (car.gauge >= 100) uiGauge.classList.add('maxed'); else uiGauge.classList.remove('maxed');
  uiSlot1.className = car.boosterCount >= 1 ? 'slot filled' : 'slot';
  uiSlot2.className = car.boosterCount >= 2 ? 'slot filled' : 'slot';
  
  if(car.isBoosting) { uiBoostStatus.innerText = "🚀 부스터 작동 중! 🚀"; uiBoostStatus.style.color = "#3498db"; }
  else if(car.isInstantBoosting) { uiBoostStatus.innerText = "💥 순간 부스터! 💥"; uiBoostStatus.style.color = "#f1c40f"; }
  else if (car.boosterCount > 0) { uiBoostStatus.innerText = "Ctrl 키를 눌러 부스터 발동!"; uiBoostStatus.style.color = "#e74c3c"; }
  else { uiBoostStatus.innerText = "드리프트(Shift)로 부스터를 모으세요"; uiBoostStatus.style.color = "white"; }

  const dynDist = (car.isBoosting || car.isInstantBoosting) ? 28 : 24; 
  const camAng = car.speed >= -0.1 ? car.angle : car.velocityAngle;
  camera.position.lerp(carMesh.position.clone().add(new THREE.Vector3(Math.sin(camAng+Math.PI)*dynDist, 20, Math.cos(camAng+Math.PI)*dynDist)), 0.3); 
  cameraLookTarget.lerp(carMesh.position.clone().add(new THREE.Vector3(Math.sin(camAng)*15, 0, Math.cos(camAng)*15)), 0.3);
  camera.lookAt(cameraLookTarget);

  renderer.render(scene, camera);
}
