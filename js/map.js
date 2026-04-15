// 🗺️ 맵 좌표 데이터 (globals.js의 mapToWorld 함수를 그대로 가져다 씁니다)
const trackPointsCanvas = [
    [1400, 1750], [400, 1750], [400, 1500], [1500, 1500], [1500, 1250], 
    [300, 1250], [300, 1000], [1500, 1000], [1500, 750], [400, 750], 
    [400, 500], [900, 500], [900, 150], [1700, 150], 
    [1700, 900], [1900, 900], [1900, 1750], [1400, 1750]
];
const trackPointsWorld = trackPointsCanvas.map(p => mapToWorld(p[0], p[1]));

const shortcutSegmentsWorld = [
    { p1: mapToWorld(1200, 1500), p2: mapToWorld(1200, 1250) },
    { p1: mapToWorld(600, 1250), p2: mapToWorld(600, 1000) }
];

function inShortcutZone(x, z) {
    if (Math.abs(x - 88) < 45 && z > 90 && z < 260) return true;
    if (Math.abs(x - -212) < 45 && z > -40 && z < 140) return true;
    return false;
}

function createMapTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 2048; const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#6ab04c'; ctx.fillRect(0, 0, 2048, 2048);
    ctx.fillStyle = '#3498db'; ctx.fillRect(750, 50, 1050, 550);

    ctx.lineWidth = 100; ctx.strokeStyle = '#e67e22'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(1200, 1500); ctx.lineTo(1200, 1250); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(600, 1250); ctx.lineTo(600, 1000); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(trackPointsCanvas[0][0], trackPointsCanvas[0][1]);
    for(let i=1; i<trackPointsCanvas.length; i++) ctx.lineTo(trackPointsCanvas[i][0], trackPointsCanvas[i][1]);
    ctx.closePath();
    
    ctx.lineWidth = 180; ctx.strokeStyle = '#e74c3c'; ctx.stroke();
    ctx.setLineDash([40, 40]); ctx.strokeStyle = '#ecf0f1'; ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 150; ctx.strokeStyle = '#7f8c8d'; ctx.stroke();
    ctx.lineWidth = 6; ctx.setLineDash([30, 30]); ctx.strokeStyle = '#f1c40f'; ctx.stroke(); ctx.setLineDash([]);
    
    ctx.lineWidth = 150; ctx.strokeStyle = '#8B4513'; 
    ctx.beginPath(); ctx.moveTo(900, 500); ctx.lineTo(900, 150); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(900, 150); ctx.lineTo(1700, 150); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = '#5C4033'; 
    for(let y=150; y<=500; y+=20) { ctx.beginPath(); ctx.moveTo(825, y); ctx.lineTo(975, y); ctx.stroke(); }
    for(let x=900; x<=1700; x+=20) { ctx.beginPath(); ctx.moveTo(x, 75); ctx.lineTo(x, 225); ctx.stroke(); }
    
    ctx.save(); ctx.translate(1400, 1750);
    for(let i = -15; i <= 15; i += 15) {
        for(let j = -75; j <= 75; j += 15) {
            ctx.fillStyle = (Math.abs(i/15 + j/15) % 2 === 0) ? '#111111' : '#ffffff';
            ctx.fillRect(i, j, 15, 15);
        }
    }
    ctx.restore();
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 16;
    return texture;
}

// 💡 [시각 최적화] 렉 없이 아름답게 그리기만 하는 스마트 돌담 (물리 엔진 등록X)
function buildSmartWalls() {
    const R = 48; const step = 2.5; const rawPoints = [];
    for (let i = 0; i < trackPointsWorld.length - 1; i++) {
        let p1 = trackPointsWorld[i], p2 = trackPointsWorld[i+1];
        let dx = p2.x - p1.x, dz = p2.z - p1.z;
        let len = Math.hypot(dx, dz); let nx = dz / len, nz = -dx / len;
        for (let d = 0; d <= len; d += step) {
            let cx = p1.x + dx * d / len, cz = p1.z + dz * d / len;
            rawPoints.push({x: cx + nx * R, z: cz + nz * R}); rawPoints.push({x: cx - nx * R, z: cz - nz * R});
        }
        for (let a = 0; a < Math.PI * 2; a += step / R) {
            rawPoints.push({x: p1.x + Math.cos(a) * R, z: p1.z + Math.sin(a) * R});
            rawPoints.push({x: p2.x + Math.cos(a) * R, z: p2.z + Math.sin(a) * R});
        }
    }
    
    const validPoints = rawPoints.filter(pt => {
        let minDist = Infinity;
        for (let i = 0; i < trackPointsWorld.length - 1; i++) {
            let p1 = trackPointsWorld[i], p2 = trackPointsWorld[i+1];
            let A = pt.x - p1.x, B = pt.z - p1.z, C = p2.x - p1.x, D = p2.z - p1.z;
            let dot = A * C + B * D, len_sq = C * C + D * D, param = (len_sq !== 0) ? dot / len_sq : -1;
            let xx, zz;
            if (param < 0) { xx = p1.x; zz = p1.z; } else if (param > 1) { xx = p2.x; zz = p2.z; } else { xx = p1.x + param * C; zz = p1.z + param * D; }
            let distSq = (pt.x - xx)*(pt.x - xx) + (pt.z - zz)*(pt.z - zz);
            if (distSq < minDist) minDist = distSq;
        }
        if (Math.sqrt(minDist) < R - 0.5) return false;
        if (inShortcutZone(pt.x, pt.z)) return false; 
        return true;
    });

    const WALL_H = 18; const TOP_H = 4;
    const baseGeom = new THREE.CylinderGeometry(1.8, 1.8, WALL_H, 8); const topGeom = new THREE.CylinderGeometry(2.0, 2.0, TOP_H, 8);
    const baseMat = new THREE.MeshLambertMaterial({color: 0x95a5a6}); const topMat = new THREE.MeshLambertMaterial({color: 0x27ae60});
    const baseInst = new THREE.InstancedMesh(baseGeom, baseMat, validPoints.length); const topInst = new THREE.InstancedMesh(topGeom, topMat, validPoints.length);
    const dummy = new THREE.Object3D();
    
    validPoints.forEach((pt, idx) => {
        dummy.position.set(pt.x, WALL_H / 2, pt.z); dummy.updateMatrix(); baseInst.setMatrixAt(idx, dummy.matrix);
        dummy.position.set(pt.x, WALL_H + TOP_H / 2, pt.z); dummy.updateMatrix(); topInst.setMatrixAt(idx, dummy.matrix);
        // 🚨 addBoxCollider(물리충돌) 삭제됨 -> 렉 완벽 해결!
    });
    
    baseInst.castShadow = true; topInst.castShadow = true; mapGroup.add(baseInst); mapGroup.add(topInst);
}

function createTree(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 10), new THREE.MeshLambertMaterial({color: 0x795548}));
    trunk.position.y = 5; trunk.castShadow = true; group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(12, 8, 8), new THREE.MeshLambertMaterial({color: 0x27ae60}));
    leaves.position.y = 15; leaves.castShadow = true; group.add(leaves);
    group.position.set(x, 0, z); mapGroup.add(group);
}

function createHouse(x, z, rotY) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(30, 20, 30), new THREE.MeshLambertMaterial({color: 0xffeaa7}));
    body.position.y = 10; body.castShadow = true; group.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(24, 15, 4), new THREE.MeshLambertMaterial({color: 0xd35400}));
    roof.position.y = 27.5; roof.rotation.y = Math.PI / 4; roof.castShadow = true; group.add(roof);
    group.position.set(x, 0, z); group.rotation.y = rotY; mapGroup.add(group);
}

function createClockTower(x, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(20, 50, 20), new THREE.MeshLambertMaterial({color: 0xecf0f1}));
    body.position.y = 25; body.castShadow = true; group.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(18, 20, 4), new THREE.MeshLambertMaterial({color: 0x2980b9}));
    roof.position.y = 60; roof.rotation.y = Math.PI / 4; roof.castShadow = true; group.add(roof);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(6, 16), new THREE.MeshBasicMaterial({color: 0xffffff}));
    clock.position.set(0, 40, 10.1); group.add(clock);
    group.position.set(x, 0, z); mapGroup.add(group);
}

function createStartBanner(x, z, rotY) {
    const group = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({color: 0x2c3e50});
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(4, 35, 4), mat); p1.position.set(0, 17.5, -60); p1.castShadow = true; group.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(4, 35, 4), mat); p2.position.set(0, 17.5, 60); p2.castShadow = true; group.add(p2);
    
    // 오직 시작 배너 기둥 2개만 3D 물리박스(OBB)로 등록합니다.
    let sin = Math.sin(rotY), cos = Math.cos(rotY);
    addBoxCollider(x + (-60)*(-sin), z + (-60)*cos, 4, 4, rotY);
    addBoxCollider(x + (60)*(-sin), z + (60)*cos, 4, 4, rotY);

    const topBox = new THREE.Mesh(new THREE.BoxGeometry(4, 12, 124), new THREE.MeshLambertMaterial({color: 0x3498db})); 
    topBox.position.set(0, 35, 0); topBox.castShadow = true; group.add(topBox);

    const bannerCanvas = document.createElement('canvas'); bannerCanvas.width = 1024; bannerCanvas.height = 128;
    const bCtx = bannerCanvas.getContext('2d'); bCtx.fillStyle = '#2980b9'; bCtx.fillRect(0, 0, 1024, 128);
    bCtx.fillStyle = '#ffffff'; bCtx.font = 'bold 70px sans-serif'; bCtx.textAlign = 'center'; bCtx.textBaseline = 'middle';
    bCtx.fillText('🏁 FINISH LINE 🏁', 512, 64);
    const planeMat = new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(bannerCanvas), transparent: true});
    
    const b1 = new THREE.Mesh(new THREE.PlaneGeometry(124, 12), planeMat); b1.position.set(2.1, 35, 0); b1.rotation.y = Math.PI / 2; group.add(b1);
    const b2 = new THREE.Mesh(new THREE.PlaneGeometry(124, 12), planeMat); b2.position.set(-2.1, 35, 0); b2.rotation.y = -Math.PI / 2; group.add(b2);

    group.position.set(x, 0, z); group.rotation.y = rotY; mapGroup.add(group);
}

function loadMap(mapName) {
    currentMap = mapName;
    while(mapGroup.children.length > 0) { mapGroup.remove(mapGroup.children[0]); }
    colliderGrid.clear(); boxColliders.length = 0; 

    if (mapName === 'village') {
        scene.background = new THREE.Color(0x87CEEB); scene.fog = new THREE.Fog(0x87CEEB, 200, 900);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1024, 1024), new THREE.MeshLambertMaterial({map: createMapTexture()}));
        plane.rotation.x = -Math.PI / 2; plane.receiveShadow = true; mapGroup.add(plane);
        
        const start = mapToWorld(1400, 1750); createStartBanner(start.x, start.z, 0); 
        buildSmartWalls();
        
        for(let z = 400; z <= 1800; z += 300) { let p = mapToWorld(200, z); createHouse(p.x, p.z, Math.PI/2); }
        let towerP = mapToWorld(1760, 680); createClockTower(towerP.x, towerP.z);
        let treeP = mapToWorld(1400, 600); createTree(treeP.x, treeP.z);
        
    } else if (mapName === 'test') {
        scene.background = new THREE.Color(0xe0e5ec); scene.fog = new THREE.Fog(0xe0e5ec, 100, 600);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), new THREE.MeshLambertMaterial({color: 0xffffff}));
        plane.rotation.x = -Math.PI / 2; plane.receiveShadow = true; mapGroup.add(plane);
        const gridHelper = new THREE.GridHelper(10000, 500, 0xcccccc, 0xe0e0e0); mapGroup.add(gridHelper);
    }
}
