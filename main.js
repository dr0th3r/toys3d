import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GlitchPass } from "three/addons/postprocessing/GlitchPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";

//control buttons
const goBackBtn = document.querySelector(".go-back");

//screens
const videoScreen = document.querySelector(".video-screen");

const loader = new GLTFLoader();
let camera;

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let mixer;

let composer;
let outlinePass;

const registeredTransitions = {};

function setupTransition(action, goBackBtn, startObjName, screen) {
  let isOnScreen = false;

  action.loop = THREE.LoopPingPong;
  action.paused = true;
  action.play();

  const mixer = action.getMixer();
  mixer.addEventListener("loop", () => {
    action.paused = true;
    if (!isOnScreen) {
      isOnScreen = true;
      screen.classList.add("visible");
    } else {
      isOnScreen = false;
    }
  });

  goBackBtn.addEventListener("click", () => {
    action.paused = false;
    screen.classList.remove("visible");
  });

  registeredTransitions[startObjName] = () => {
    action.paused = false;
  };
}

function getIntersects(e) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  return raycaster.intersectObjects(scene.children, true);
}

document.addEventListener("click", onClick);

function onClick(e) {
  const intersects = getIntersects(e);

  if (intersects.length > 0) {
    const objName = intersects[0].object.name;
    console.log(objName);
    if (registeredTransitions[objName]) {
      registeredTransitions[objName]();
    }
  }
}

function setupOutline() {
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  outlinePass = getOutlineEffect(window, scene, camera);
  configureOutlineEffectSettings_Default(outlinePass);
  outlinePass.renderToScreen = true;

  composer.addPass(outlinePass);

  return composer;
}

function getOutlineEffect(window, scene, camera) {
  return new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
}

function configureOutlineEffectSettings_Default(outlinePass) {
  outlinePass.edgeStrength = 1000;
  outlinePass.edgeGlow = 1;
  outlinePass.edgeThickness = 2;
  outlinePass.pulsePeriod = 0;
  outlinePass.visibleEdgeColor.set("#ffffff");
  outlinePass.hiddenEdgeColor.set("#190a05");
}

document.addEventListener("mousemove", onMouseMove, false);

function onMouseMove(e) {
  const intersects = getIntersects(e);

  addOutline(intersects);
}

function addOutline(intersects) {
  outlinePass.selectedObjects = [];

  if (intersects.length > 0) {
    let objName = intersects[0].object.name;

    if (objName.includes("Cube")) {
      outlinePass.selectedObjects = [intersects[0].object];
    }
  }
}

loader.load(
  "assets/room.glb",
  function (gltf) {
    scene.add(gltf.scene);

    mixer = new THREE.AnimationMixer(gltf.scene);
    const clip = THREE.AnimationClip.findByName(
      gltf.animations,
      "CameraAction.001"
    );

    const action = mixer.clipAction(clip);
    setupTransition(action, goBackBtn, "Cube011", videoScreen);

    console.log(gltf);
    camera = gltf.cameras[0];

    setupOutline();
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  (error) => {
    console.error(error);
  }
);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 10, 5);
directionalLight.target.position.set(0, 0, 0);
scene.add(directionalLight.target);
scene.add(directionalLight);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  if (mixer) mixer.update(clock.getDelta());

  if (composer) composer.render();

  renderer.render(scene, camera);
}
animate();
