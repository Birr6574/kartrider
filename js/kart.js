function createCharacterModel(type) {
    const group = new THREE.Group();
    let mainColor = 0x1565c0; if(type === 'bazzi') mainColor = 0xe74c3c; if(type === 'dizzy') mainColor = 0xf1c40f;
    const headGroup = new THREE.Group(); headGroup.position.y = 2.0; 
    const headMat = new THREE.MeshLambertMaterial({color: mainColor});
    const centerMesh = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 32), headMat); centerMesh.castShadow = true; headGroup.add(centerMesh);
    
    if (type === 'dao' || !type) {
        const lobeGeom = new THREE.SphereGeometry(0.95, 32, 32); 
        const lobeL = new THREE.Mesh(lobeGeom, headMat); lobeL.position.set(-0.8, 0, 0); lobeL.castShadow = true; headGroup.add(lobeL);
        const lobeR = new THREE.Mesh(lobeGeom, headMat); lobeR.position.set(0.8, 0, 0); lobeR.castShadow = true; headGroup.add(lobeR);
    } else if (type === 'bazzi') {
        const earGeom = new THREE.SphereGeometry(0.45, 16, 16);
        const earL = new THREE.Mesh(earGeom, headMat); earL.position.set(-0.75, 1.1, 0); earL.castShadow = true; headGroup.add(earL);
        const earR = new THREE.Mesh(earGeom, headMat); earR.position.set(0.75, 1.1, 0); earR.castShadow = true; headGroup.add(earR);
    } else if (type === 'dizzy') {
        const podGeom = new THREE.SphereGeometry(0.55, 32, 32); const ringGeom = new THREE.TorusGeometry(0.55, 0.12, 16, 32); const ringMat = new THREE.MeshLambertMaterial({color: 0xcccccc}); 
        const podL = new THREE.Mesh(podGeom, headMat); podL.position.set(-0.85, 0.9, -0.6); podL.castShadow = true; headGroup.add(podL);
        const ringL = new THREE.Mesh(ringGeom, ringMat); ringL.position.copy(podL.position); ringL.lookAt(0, 0, 0); headGroup.add(ringL);
        const podR = new THREE.Mesh(podGeom, headMat); podR.position.set(0.85, 0.9, -0.6); podR.castShadow = true; headGroup.add(podR);
        const ringR = new THREE.Mesh(ringGeom, ringMat); ringR.position.copy(podR.position); ringR.lookAt(0, 0, 0); headGroup.add(ringR);
    }
    
    group.add(headGroup);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.2, 16), new THREE.MeshLambertMaterial({color: mainColor}));
    body.position.y = 0.6; body.castShadow = true; group.add(body);
    group.scale.set(1.5, 1.5, 1.5); return group;
}

function createKart() {
  const kartRoot = new THREE.Group(); const kartBody = new THREE.Group(); kartRoot.add(kartBody);
  const whiteMat = new THREE.MeshLambertMaterial({color: 0xf5f6fa}); const blueMat = new THREE.MeshLambertMaterial({color: 0x3498db});
  const darkMat = new THREE.MeshLambertMaterial({color: 0x2c3e50}); const blackMat = new THREE.MeshLambertMaterial({color: 0x111111});
  
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 5.0), darkMat); chassis.position.y = 0.5; chassis.castShadow = true; kartBody.add(chassis);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.5), whiteMat); nose.position.set(0, 0.6, 2.8); nose.castShadow = true; kartBody.add(nose);
  const noseAccent = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.8), blueMat); noseAccent.position.set(0, 0.9, 2.3); noseAccent.rotation.x = Math.PI / 12; noseAccent.castShadow = true; kartBody.add(noseAccent);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 3.2), whiteMat); sideL.position.set(-1.4, 0.7, 0.5); sideL.castShadow = true; kartBody.add(sideL);
  const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 3.2), whiteMat); sideR.position.set(1.4, 0.7, 0.5); sideR.castShadow = true; kartBody.add(sideR);
  const engine = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.6), darkMat); engine.position.set(0, 1.1, -1.8); engine.castShadow = true; kartBody.add(engine);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.4), darkMat); seat.position.set(0, 1.5, -0.9); seat.rotation.x = -Math.PI / 16; seat.castShadow = true; kartBody.add(seat);
  const steerColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2), darkMat); steerColumn.position.set(0, 1.4, 1.4); steerColumn.rotation.x = Math.PI / 4; kartBody.add(steerColumn);
  const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.1, 8, 24), blackMat); steerWheel.position.set(0, 1.8, 1.0); steerWheel.rotation.x = Math.PI / 4; kartBody.add(steerWheel);
  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 1.2), blueMat); spoilerWing.position.set(0, 2.5, -2.8); spoilerWing.castShadow = true; kartBody.add(spoilerWing);
  const supportL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.8), whiteMat); supportL.position.set(-1.2, 1.9, -2.5); supportL.castShadow = true; kartBody.add(supportL);
  const supportR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.8), whiteMat); supportR.position.set(1.2, 1.9, -2.5); supportR.castShadow = true; kartBody.add(supportR);
  kartRoot.charSlot = new THREE.Group(); kartRoot.charSlot.position.set(0, 1.6, -0.2); kartBody.add(kartRoot.charSlot);

  const wheelGeom = new THREE.CylinderGeometry(0.8, 0.8, 0.8, 24); wheelGeom.rotateZ(Math.PI / 2); 
  frontWheelL = new THREE.Group(); frontWheelL.position.set(-2.0, 0.8, 2.5); const fwlMesh = new THREE.Mesh(wheelGeom, blackMat); fwlMesh.castShadow = true; frontWheelL.add(fwlMesh); kartBody.add(frontWheelL);
  frontWheelR = new THREE.Group(); frontWheelR.position.set(2.0, 0.8, 2.5); const fwrMesh = new THREE.Mesh(wheelGeom, blackMat); fwrMesh.castShadow = true; frontWheelR.add(fwrMesh); kartBody.add(frontWheelR);
  const backWheelL = new THREE.Mesh(wheelGeom, blackMat); backWheelL.position.set(-2.0, 0.8, -2); backWheelL.castShadow = true; kartBody.add(backWheelL);
  const backWheelR = new THREE.Mesh(wheelGeom, blackMat); backWheelR.position.set(2.0, 0.8, -2); backWheelR.castShadow = true; kartBody.add(backWheelR);

  const exhaustGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12); exhaustGeom.rotateX(Math.PI / 2); const exhaustMat = new THREE.MeshLambertMaterial({color: 0x7f8c8d});
  const ex1 = new THREE.Mesh(exhaustGeom, exhaustMat); ex1.position.set(-0.8, 0.8, -2.8); kartBody.add(ex1);
  const ex2 = new THREE.Mesh(exhaustGeom, exhaustMat); ex2.position.set(0.8, 0.8, -2.8); kartBody.add(ex2);

  const fireGeom = new THREE.ConeGeometry(0.6, 3.0, 12); fireGeom.rotateX(-Math.PI / 2); const fireMat = new THREE.MeshBasicMaterial({color: 0x3498db}); 
  kartRoot.fire1 = new THREE.Mesh(fireGeom, fireMat); kartRoot.fire1.position.set(-0.8, 0.8, -4.2); kartRoot.fire1.visible = false; kartBody.add(kartRoot.fire1);
  kartRoot.fire2 = new THREE.Mesh(fireGeom, fireMat); kartRoot.fire2.position.set(0.8, 0.8, -4.2); kartRoot.fire2.visible = false; kartBody.add(kartRoot.fire2);
  
  const fakeShadow = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32).rotateX(-Math.PI / 2).scale(1, 1, 1.8), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  fakeShadow.position.y = 0.05; kartRoot.add(fakeShadow);
  kartRoot.bodyWrapper = kartBody; return kartRoot;
}

function changeCharacter(type) { 
    carMesh.charSlot.clear(); 
    carMesh.charSlot.add(createCharacterModel(type)); 
}
