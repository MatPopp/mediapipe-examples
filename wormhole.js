// code based on https://github.com/bobbyroe/flythru-wireframe-wormhole/tree/main

import * as THREE from "three";
import spline from "./spline.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "jsm/postprocessing/UnrealBloomPass.js";
import getStarfield from "./getStarfield.js";

const mpHands = window;
const drawingUtils = window;
const controls = window;
const mpFaceMesh = window;
const face_config = { locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@` +
            `${mpFaceMesh.VERSION}/${file}`;
    } };
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const pointCounterElement = document.getElementById('point-counter');
const canvasCtx = canvasElement.getContext('2d');
const config = { locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`;
    } };
const fpsControl = new controls.FPS();
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

// wormhole animation
let w = window.innerWidth;
let h = window.innerHeight;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.3);
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

console.log("domElemnet added to mediapipe container")

// variables for steering with face and hand positions: 

let face_rot_z = 0; 
let face_rot_x = 0;
let face_rot_y = 0;

let x_rot_sensitivity = 0.3;
let y_rot_sensitivity = 0.25;
let z_rot_sensitivity = 0.15;

let mouth_open_distance = 0.02;

let enableFaceGeometry = false;

let camera_pos = spline.getPointAt(0);
let camera_speed = 0.01;

let camera_matrix = new THREE.Matrix4();

const box_points = 10;

let points_counter = 0; 

//laser variables
let last_fired = Date.now();
let mouse_clicked = false; 
let mouth_open = false;
let laser_delay = 100; // milliseconds
// initial camera matrix
camera_matrix.makeRotationFromEuler(new THREE.Euler(0, 0, 0));

// geometry variables 
const tubeRadius = 0.65; 

// post-processing
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 100);
bloomPass.threshold = 0.002;
bloomPass.strength = 3.5;
bloomPass.radius = 0;
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Sound Effects
const sounds = [];
let fitzSound, laserSound;
const manager = new THREE.LoadingManager();
manager.onLoad = () => console.log("loaded", sounds);
const audioLoader = new THREE.AudioLoader(manager);
const mp3s = ["fitz", "laser-01", "blarmp"];
const listener = new THREE.AudioListener();
camera.add(listener);
mp3s.forEach((name) => {
  const sound = new THREE.Audio(listener);
  sound.name = name;
  if (name === "blarmp") {
    fitzSound = sound;
  }
  if (name === "laser-01") {
    laserSound = sound;
  }
  sounds.push(sound);
  audioLoader.load(`./sfx/${name}.mp3`, function (buffer) {
    sound.setBuffer(buffer);
  });
});

const stars = getStarfield();
scene.add(stars);



// create a tube geometry from the spline
const tubeGeo = new THREE.TubeGeometry(spline, 222, tubeRadius, 16, true);

// create edges geometry from the spline
const tubeColor = new THREE.Color(0x5900ffff);
const edges = new THREE.EdgesGeometry(tubeGeo, 0.2);
const lineMat = new THREE.LineBasicMaterial({ color: 0xb34fffff });
const tubeLines = new THREE.LineSegments(edges, lineMat);
scene.add(tubeLines);

//create tube hit area

const hitMat = new THREE.MeshBasicMaterial({
  color: tubeColor,
  transparent: true,
  opacity: 0.01,
  side: THREE.BackSide
});
const tubeHitArea = new THREE.Mesh(tubeGeo, hitMat);
tubeHitArea.name = 'tube';
scene.add(tubeHitArea);

const boxGroup = new THREE.Group();
scene.add(boxGroup);

const numBoxes = 55;
const box_size = 0.15;
const boxGeo = new THREE.BoxGeometry(box_size, box_size, box_size);

function addBox() {
  const p = Math.random();
  const pos = tubeGeo.parameters.path.getPointAt(p);
  const color = new THREE.Color().setHSL(0.7 + p, 1, 0.5);
  const boxMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.05
  });
  const hitBox = new THREE.Mesh(boxGeo, boxMat);
  hitBox.name = 'box';

  pos.x += Math.random() - 0.4;
  pos.z += Math.random() - 0.4;
  hitBox.position.copy(pos);
  const rote = new THREE.Vector3(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  hitBox.rotation.set(rote.x, rote.y, rote.z);
  const edges = new THREE.EdgesGeometry(boxGeo, 0.2);

  const lineMat = new THREE.LineBasicMaterial({ color });
  const boxLines = new THREE.LineSegments(edges, lineMat);
  boxLines.position.copy(pos);
  boxLines.rotation.set(rote.x, rote.y, rote.z);
  hitBox.userData.box = boxLines;
  boxGroup.add(hitBox);
  scene.add(boxLines);
}

// add boxes along the tube
for (let i = 0; i < numBoxes; i += 1) {
  addBox();
}

// CROSSHAIRS
let mousePos = new THREE.Vector2();
const crosshairs = new THREE.Group();
crosshairs.position.z = -1;
camera.add(crosshairs);
const crossMat = new THREE.LineBasicMaterial({
  color: 0xffffff,
});
const lineGeo = new THREE.BufferGeometry();
const lineVerts = [0, 0.05, 0, 0, 0.02, 0];
lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));

for (let i = 0; i < 4; i += 1) {
  const line = new THREE.Line(lineGeo, crossMat);
  line.rotation.z = i * 0.5 * Math.PI;
  crosshairs.add(line);
}

// laser stuff 
const raycaster = new THREE.Raycaster();
const direction = new THREE.Vector3();
const impactPos = new THREE.Vector3();
const impactColor = new THREE.Color();
let impactBox = null;

let lasers = [];
const laserGeo = new THREE.IcosahedronGeometry(0.02, 2);

function cameraOutsideTube() {
  const camPos = camera.position;
  // check if camera is inside tube 

  let distance = tubeRadius *2;
  for (let t = 0; t <= 1.0; t += 0.01) {
    const pointOnPath = tubeGeo.parameters.path.getPointAt(t);
    const distToPoint = camPos.distanceTo(pointOnPath);
    if (distToPoint < distance) {
      distance = distToPoint;
    }
  }
  return distance > tubeRadius*1.1;
}

function getLaserBolt() {
  const laserMat = new THREE.MeshBasicMaterial({
    color: 0x03ff31ff,
    transparent: true,
    fog: false
  });
  var laserBolt = new THREE.Mesh(laserGeo, laserMat);
  laserBolt.position.copy(camera.position);

  let active = true;
  let laser_speed = 0.25;

  let goalPos = camera.position.clone()
    .setFromMatrixPosition(crosshairs.matrixWorld);

  const laserDirection = new THREE.Vector3(0, 0, 0);
  laserDirection.subVectors(laserBolt.position, goalPos)
    .normalize()
    .multiplyScalar(laser_speed);

  direction.subVectors(goalPos, camera.position);
  raycaster.set(camera.position, direction);
  let intersects = raycaster.intersectObjects([...boxGroup.children, tubeHitArea], true);

  if (intersects.length > 0) {
    impactPos.copy(intersects[0].point);
    impactColor.copy(intersects[0].object.material.color);
    if (intersects[0].object.name === 'box') {
      impactBox = intersects[0].object.userData.box;
      // remove the box that has been hit and add a new one elsewhere
      boxGroup.remove(intersects[0].object);
      addBox();
      fitzSound.stop();
      fitzSound.play();

      // update points counter
      points_counter += box_points;
      pointCounterElement.innerHTML = `<h1 style="color:green">${points_counter.toFixed(0)}</h1>`;
   }
  }

  let scale = 1.0;
  let opacity = 1.0;
  let isExploding = false;


  function update() {
    if (active === true) {
    if (isExploding === false) {
      laserBolt.position.sub(laserDirection);

      if (laserBolt.position.distanceTo(impactPos) < 0.5) {
        laserBolt.position.copy(impactPos);
        laserBolt.material.color.set(impactColor);
        isExploding = true;
        impactBox?.scale.setScalar(0.0);
      }
    } else {
      if (opacity > 0.01) {
        scale += 0.2;
        opacity *= 0.85;

      } else {
        opacity = 0.0;
        scale = 0.01;
        active = false;
      }
      laserBolt.scale.setScalar(scale);
      laserBolt.material.opacity = opacity;
      laserBolt.userData.active = active;
    }
  }
  }
  laserBolt.userData = { update, active };
  return laserBolt;
}

function fireLaser() {
  const laser = getLaserBolt();
  lasers.push(laser);
  scene.add(laser);
  laserSound.stop();
  laserSound.play();

  // cleanup
  let inactiveLasers = lasers.filter((l) => l.userData.active === false);
  scene.remove(...inactiveLasers);
  lasers = lasers.filter((l) => l.userData.active === true);
}


window.addEventListener('pointerdown', () => {
  mouse_clicked = true;
});
window.addEventListener('pointerup', () => {
  mouse_clicked = false; 
});

function onPointerMove(evt) {
  w = window.innerWidth;
  h = window.innerHeight;
  let aspect = w / h;
  let fudge = { x: aspect * 0.75, y: 0.75 };
  mousePos.x = ((evt.clientX / w) * 2 - 1) * fudge.x;
  mousePos.y = (-1 * (evt.clientY / h) * 2 + 1) * fudge.y;
}
window.addEventListener('pointermove', onPointerMove, false);


function updateCamera(t_ms) {
  const time = t_ms * 0.1;
  const looptime = 10 * 1000;

  camera_speed = 0.01 + 0.01 * t_ms/1000/60; // slowly accelerate

  // add points to counter over time if inside tube 
  if (!cameraOutsideTube()) {
    points_counter += camera_speed ;
    pointCounterElement.innerHTML = `<h1 style="color:green">${points_counter.toFixed(0)}</h1>`;
  }
  else{
    points_counter -= 10*camera_speed ;
    // red text to indicate loss of points
    pointCounterElement.innerHTML = `<h1 style="color:red">${points_counter.toFixed(0)}</h1>`;
  }
  //const p = (time % looptime) / looptime;
  //const pos = tubeGeo.parameters.path.getPointAt(p);
  //const lookAt = tubeGeo.parameters.path.getPointAt((p + 0.03) % 1);

  //move into direction of viewport
  let v_x = -camera_matrix.elements[8];
  let v_y = -camera_matrix.elements[9];
  let v_z = -camera_matrix.elements[10];
  let lookAtVector = new THREE.Vector3(v_x, v_y, v_z);
  
  camera_pos.addScaledVector(lookAtVector, camera_speed);
  camera.position.copy(camera_pos);
  //camera.lookAt(lookAt);
  
  let d_matrix = new THREE.Matrix4();
  // set rotation from face tracking data
  d_matrix.makeRotationFromEuler(new THREE.Euler(face_rot_x * x_rot_sensitivity, face_rot_y * y_rot_sensitivity, face_rot_z * z_rot_sensitivity));
  
  // apply rotation to camera matrix
  camera_matrix.multiplyMatrices(camera_matrix, d_matrix);

  //apply updated camera matrix
  camera.rotation.setFromRotationMatrix(camera_matrix)
}

function animate(t_ms = 0) {
  requestAnimationFrame(animate);
  updateCamera(t_ms);
  crosshairs.position.set(mousePos.x, mousePos.y, -1);
  lasers.forEach(l => l.userData.update());
  if ((mouse_clicked || mouth_open) && last_fired + laser_delay < Date.now()) {
    fireLaser();
    last_fired = Date.now();
  }
  composer.render(scene, camera);
}
animate();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);


// initialize canvas element for background drawing
canvasCtx.fillStyle = "#00000000";
canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
let currentFrame = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
let fingerDistanceThreshold = 0.04;

function onHandResults(results) {
    // Hide the spinner.
    document.body.classList.add('loaded');
    // Update the frame rate.
    fpsControl.tick();
    // Draw the overlays.
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.putImageData(currentFrame, 0, 0);
    // canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            
        currentFrame = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
    }
    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
            const classification = results.multiHandedness[index];
            const isRightHand = classification.label === 'Right';
            const landmarks = results.multiHandLandmarks[index];
            drawingUtils.drawConnectors(canvasCtx, landmarks, mpHands.HAND_CONNECTIONS, { color: isRightHand ? '#0055ff' : '#FF0000' });
            drawingUtils.drawLandmarks(canvasCtx, landmarks, {
                color: isRightHand ? '#0055ff' : '#FF0000',
                fillColor: isRightHand ? '#FF0000' : '#0055ff',
                radius: (data) => {
                    return drawingUtils.lerp(data.from.z, -0.15, .1, 10, 1);
                }
            });
        }
    }
    
    canvasCtx.restore();
    if (results.multiHandWorldLandmarks) {
        // We only get to call updateLandmarks once, so we need to cook the data to
        // fit. The landmarks just merge, but the connections need to be offset.
        const landmarks = results.multiHandWorldLandmarks.reduce((prev, current) => [...prev, ...current], []);
        const colors = [];
        let connections = [];
        for (let loop = 0; loop < results.multiHandWorldLandmarks.length; ++loop) {
            const offset = loop * mpHands.HAND_CONNECTIONS.length;
            const offsetConnections = mpHands.HAND_CONNECTIONS.map((connection) => [connection[0] + offset, connection[1] + offset]);
            connections = connections.concat(offsetConnections);
            const classification = results.multiHandedness[loop];
            colors.push({
                list: offsetConnections.map((unused, i) => i + offset),
                color: classification.label,
            });
        }
    }
}

//const hands = new mpHands.Hands(config);
//hands.onResults(onResults);

// Present a control panel through which the user can manipulate the solution
// options.
// new controls
//     .ControlPanel(controlsElement, {
//     selfieMode: true,
//     maxNumHands: 2,
//     modelComplexity: 1,
//     minDetectionConfidence: 0.5,
//     minTrackingConfidence: 0.5,
//     fingerDistanceThreshold: 0.04,
// })
//     .add([
//     new controls.StaticText({ title: 'MediaPipe Hands' }),
//     fpsControl,
//     new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
//     new controls.SourcePicker({
//         onFrame: async (input, size) => {
//             const aspect = size.height / size.width;
//             let width, height;
//             if (window.innerWidth > window.innerHeight) {
//                 height = window.innerHeight;
//                 width = height / aspect;
//             }
//             else {
//                 width = window.innerWidth;
//                 height = width * aspect;
//             }
//             canvasElement.width = width;
//             canvasElement.height = height;
//             await hands.send({ image: input });
//         },
//     }),
//     new controls.Slider({
//         title: 'Max Number of Hands',
//         field: 'maxNumHands',
//         range: [1, 4],
//         step: 1
//     }),
//     new controls.Slider({
//         title: 'Model Complexity',
//         field: 'modelComplexity',
//         discrete: ['Lite', 'Full'],
//     }),
//     new   controls.Slider({
//         title: 'Min Detection Confidence',
//         field: 'minDetectionConfidence',
//         range: [0, 1],
//         step: 0.01
//     }),
//     new controls.Slider({
//         title: 'Min Tracking Confidence',
//         field: 'minTrackingConfidence',
//         range: [0, 1],
//         step: 0.01
//     }),
//     new controls.Slider({
//         title: 'Finger Distance Threshold',
//         field: 'fingerDistanceThreshold',
//         range: [0.01, 0.1],
//         step: 0.001
//     }),
// ])
//     .on(x => {
//     const options = x;

//     // update variables outside of this scope
//     videoElement.classList.toggle('selfie', options.selfieMode);
//     fingerDistanceThreshold = options.fingerDistanceThreshold;
//     hands.setOptions(options);
// });



function onResults(results) {
    // Hide the spinner.
    document.body.classList.add('loaded');
    // Update the frame rate.
    fpsControl.tick();
    // Draw the overlays.
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    // canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiFaceLandmarks) {

      if (enableFaceGeometry) {
          for (const landmarks of results.multiFaceLandmarks) {
              drawingUtils.drawConnectors(canvasCtx, landmarks, mpFaceMesh.FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
              drawingUtils.drawConnectors(canvasCtx, landmarks, mpFaceMesh.FACEMESH_RIGHT_EYE, { color: '#FF3030' });
              drawingUtils.drawConnectors(canvasCtx, landmarks, mpFaceMesh.FACEMESH_RIGHT_EYEBROW, { color: '#FF3030' });
              drawingUtils.drawConnectors(canvasCtx, landmarks, mpFaceMesh.FACEMESH_LEFT_EYE, { color: '#30FF30' });
              drawingUtils.drawConnectors(canvasCtx, landmarks, mpFaceMesh.FACEMESH_LEFT_EYEBROW, { color: '#30FF30' });
              drawingUtils.drawConnectors(canvasCtx, landmarks, mpFaceMesh.FACEMESH_FACE_OVAL, { color: '#E0E0E0' });
              drawingUtils.drawConnectors(canvasCtx, landmarks, mpFaceMesh.FACEMESH_LIPS, { color: '#E0E0E0' });
              if (solutionOptions.refineLandmarks) {
                  drawingUtils.drawConnectors(canvasCtx, landmarks, mpFaceMesh.FACEMESH_RIGHT_IRIS, { color: '#FF3030' });
                  drawingUtils.drawConnectors(canvasCtx, landmarks, mpFaceMesh.FACEMESH_LEFT_IRIS, { color: '#30FF30' });
              }
          }
        }

        // use landmarks to update rot_x, rot_y, rot_z for steering
        const leftEye = results.multiFaceLandmarks[0][33];
        const rightEye = results.multiFaceLandmarks[0][263];
        const noseTip = results.multiFaceLandmarks[0][1];

        // calculate z rotation based on eye positions
        const dx = rightEye.x - leftEye.x;
        const dy = rightEye.y - leftEye.y;
        face_rot_z = -Math.atan2(dy, dx);
        const centerX = (leftEye.x + rightEye.x) / 2;
        const centerY = (leftEye.y + rightEye.y) / 2;
        
        // calculate y rotation based on eye z positions
        const eyeZDiff = rightEye.z - leftEye.z;
        face_rot_y = -Math.atan2(eyeZDiff, dx);
        
        // calculate x rotation based forehead and chin positions
        const forehead = results.multiFaceLandmarks[0][10];
        const chin = results.multiFaceLandmarks[0][152];
        const dyFace = chin.y - forehead.y;
        face_rot_x = -Math.atan2(chin.z - forehead.z, dyFace);

        // check if mouth open (landmarks 13 and 14)
        const mouthTop = results.multiFaceLandmarks[0][13];
        const mouthBottom = results.multiFaceLandmarks[0][14];
        const mouthOpenDist = Math.sqrt(
          (mouthTop.x - mouthBottom.x) ** 2 +
          (mouthTop.y - mouthBottom.y) ** 2 +
          (mouthTop.z - mouthBottom.z) ** 2
        );
        if (mouthOpenDist > mouth_open_distance) {
          mouth_open = true;
        } else {
          mouth_open = false;
        }
    }
    canvasCtx.restore();
}

const solutionOptions = {
    selfieMode: true,
    maxNumFaces: 1,
    refineLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    x_rot_sensitivity: x_rot_sensitivity,
    y_rot_sensitivity: y_rot_sensitivity,
    z_rot_sensitivity: z_rot_sensitivity,
    mouth_open_distance: 0.02, 
    enableFaceGeometry: false,

};
const faceMesh = new mpFaceMesh.FaceMesh(face_config);

faceMesh.setOptions(solutionOptions);
faceMesh.onResults(onResults);
// Present a control panel through which the user can manipulate the solution
// options.


new controls
    .ControlPanel(controlsElement, solutionOptions)
    .add([
    new controls.StaticText({ title: 'MediaPipe Face Mesh' }),
    fpsControl,
    new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new controls.SourcePicker({
        onFrame: async (input, size) => {
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
            }
            else {
                width = window.innerWidth;
                height = width * aspect;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            await faceMesh.send({ image: input });
        },
    }),
    new controls.Slider({
        title: 'Max Number of Faces',
        field: 'maxNumFaces',
        range: [1, 4],
        step: 1
    }),
    new controls.Toggle({ title: 'Refine Landmarks', field: 'refineLandmarks' }),
    new controls.Slider({
        title: 'Min Detection Confidence',
        field: 'minDetectionConfidence',
        range: [0, 1],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Min Tracking Confidence',
        field: 'minTrackingConfidence',
        range: [0, 1],
        step: 0.01
    }),
    new controls.Slider({
        title: 'X Rotation Sensitivity',
        field: 'x_rot_sensitivity',
        range: [0.0, 1.0],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Y Rotation Sensitivity',
        field: 'y_rot_sensitivity',
        range: [0.0, 1.0],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Z Rotation Sensitivity',
        field: 'z_rot_sensitivity',
        range: [0.0, 1.0],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Mouth Open Distance',
        field: 'mouth_open_distance',
        range: [0.01, 0.1],
        step: 0.001
    }),
    new controls.Toggle({ 
      title: 'Enable Face Geometry', 
      field: 'enableFaceGeometry' 
    }),
])
    .on(x => {
    const options = x;
    videoElement.classList.toggle('selfie', options.selfieMode);
    faceMesh.setOptions(options);
    x_rot_sensitivity = options.x_rot_sensitivity;
    y_rot_sensitivity = options.y_rot_sensitivity;
    z_rot_sensitivity = options.z_rot_sensitivity;
    mouth_open_distance = options.mouth_open_distance;
    enableFaceGeometry = options.enableFaceGeometry;
});

// toggle hide / show controls whe c button is pressed

window.addEventListener('keydown', (event) => {
  if (event.key === 'c') {
    if (controlsElement.style.display === 'none') {
      controlsElement.style.display = 'block';
    } else {
      controlsElement.style.display = 'none';
    }
  }
});