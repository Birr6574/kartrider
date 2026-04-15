// 🗺️ 맵 좌표 데이터
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

// 💡 지름길 존 판별 함수
function inShortcutZone(x, z) {
    if (Math.abs(x - 88) < 45 && z > 90 && z < 260) return true; // 숏컷 1
    if (Math.abs(x - -212) < 45 && z > -40 && z < 140) return true; // 숏컷 2
    return false;
}

function createMapTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 2048; const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#6ab04c'; ctx.fillRect(0, 0, 2048, 2048);
    ctx.fillStyle = '#3498db'; ctx.fillRect(750, 50, 1050, 550); // 강물

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

// 💡 [핵심 최적화] 12000개의 실린더 대신, 선분을 따라 쭉 늘린 단일 BoxGeometry 사용
function buildOptimizedWalls() {
    const wallMat = new THREE.MeshLambertMaterial({color: 0x95a5a6});
    const topMat = new THREE.MeshLambertMaterial({color: 0x27ae60});
    const R = 48; // 트랙 폭

    function addWallLine(x1, z1, x2, z2) {
        let dx = x2 - x1, dz = z2 - z1;
        let len = Math.hypot(dx, dz);
        let cx = (x1 + x2)/2, cz = (z1 + z2)/2;
        
        // 지름길 구간에는 돌담을 세우지 않고 뚫어둠!
        if(inShortcutZone(cx, cz)) return; 
        
        let angle = Math.atan2(dx, dz);
        
        let wall = new THREE.Mesh(new THREE.BoxGeometry(4, 18, len), wallMat);
        wall.position.set(cx, 9, cz); wall.rotation.y = angle; wall.castShadow = true;
        mapGroup.add(wall);
        
        let top = new THREE.Mesh(new THREE.BoxGeometry(5, 4, len + 0.5), topMat);
        top.position.set(cx, 20, cz); top.rotation.y = angle; top.castShadow = true;
        mapGroup.add(top);
    }

    for(let i=0; i<trackPointsWorld.length; i++) {
        let p1 = trackPointsWorld[i];
        let p2 = trackPointsWorld[(i+1) % trackPointsWorld.length]; 
        let dx = p2.x - p1.x, dz = p2.z - p1.z;
        let len = Math.hypot(dx, dz);
        if (len === 0) continue;
        let nx = dz/len, nz = -dx/len;
        
        // 좌우 양쪽에 통짜 벽 생성
        addWallLine(p1.x + nx*R, p1.z + nz*R, p2.x + nx*R, p2.z + nz*R);
        addWallLine(p1.x - nx*R, p1.z - nz*R, p2.x - nx*R, p2.z - nz*R);
        
        // 코너 틈새 마감
        if(!inShortcutZone(p2.x + nx*R, p2.z + nz*R)) {
           let joint = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 18, 8), wallMat);
           joint.position.set(p2.x + nx*R, 9, p2.z + nz*R); mapGroup.add(joint);
        }
        if(!inShortcutZone(p2.x - nx*R, p2.z - nz*R)) {
           let joint = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 18, 8), wallMat);
           joint.position.set(p2.x - nx*R, 9, p2.z - nz*R); mapGroup.add(joint);
        }
    }
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
    
    // 이 배너 기둥만 물리 충돌 객체로 등록! (벽돌담은 안 넣음)
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
    colliderGrid.clear(); 
    boxColliders.length = 0; // OBB 물리벽 완벽 초기화

    if (mapName === 'village') {
        scene.background = new THREE.Color(0x87CEEB); scene.fog = new THREE.Fog(0x87CEEB, 200, 900);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1024, 1024), new THREE.MeshLambertMaterial({map: createMapTexture()}));
        plane.rotation.x = -Math.PI / 2; plane.receiveShadow = true; mapGroup.add(plane);
        
        const start = mapToWorld(1400, 1750); createStartBanner(start.x, start.z, 0); 
        
        buildOptimizedWalls(); // 최적화된 단일 박스 도형벽 불러오기
        
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
