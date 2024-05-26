import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

async function loadRoom() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync("assets/room.glb");
  return gltf;
}

//renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight, true);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

//model
const model = await loadRoom();
const scene = model.scene;
const camera = model.cameras[0];

//animations
const mixer = new THREE.AnimationMixer(model.scene);
const projectorClip = THREE.AnimationClip.findByName(
  model.animations,
  "CameraAction.001"
);
const projectorAction = mixer.clipAction(projectorClip);

//transitions
const transitions = {};

let currentTransition;

function getIntersects(e) {
  const mouse = new THREE.Vector2();
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  return raycaster.intersectObjects(scene.children, true);
}

function setupTransition(triggerObjName, action, goBackBtn, newScreen) {
  let isOnScreen = false;

  const duration = action.getClip().duration;
  const transitionTempalte = {
    action,
    duration,
    screen: newScreen,
    isPlayingForwards: !isOnScreen,
  };

  action.loop = THREE.LoopPingPong;
  action.paused = true;
  action.play();

  const mixer = action.getMixer();
  mixer.addEventListener("loop", () => {
    currentTransition = null;
    action.paused = true;
    isOnScreen = !isOnScreen;
    isOnScreen && (newScreen.style.opacity = 1);
  });

  goBackBtn.addEventListener("click", () => {
    currentTransition = {
      ...transitionTempalte,
      isPlayingForwards: !isOnScreen,
    };
    action.paused = false;
    newScreen.style.opacity = 0;
  });

  transitions[triggerObjName] = () => {
    currentTransition = {
      ...transitionTempalte,
      isPlayingForwards: !isOnScreen,
    };
    action.paused = false;
  };
}

setupTransition(
  "Cube011",
  projectorAction,
  document.querySelector(".go-back"),
  document.querySelector(".video-screen")
);

document.addEventListener("click", (e) => {
  const intersects = getIntersects(e);
  if (intersects.length > 0) {
    const triggerObjName = intersects[0].object.name;
    console.log(triggerObjName);
    transitions[triggerObjName] && transitions[triggerObjName]();
  }
});

//transition functions
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

//resize camera
const zoomOut = 15; //the bigger the number, the more zoomed out the camera will be
const factor = 2; //the bigger the number, the more zoomed in the camera will be

function resizeCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  let width, height;

  if (window.innerWidth > window.innerHeight) {
    width = zoomOut / factor;
    height = zoomOut / aspect / factor;
  } else {
    width = (zoomOut * aspect) / factor;
    height = zoomOut / factor;
  }

  camera.left = -width;
  camera.right = width;
  camera.top = height;
  camera.bottom = -height;
  camera.updateProjectionMatrix();
}
resizeCamera();
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight, true);
  resizeCamera();
});

//light
const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);

//animation loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  mixer.update(clock.getDelta());

  if (currentTransition) {
    const { action, duration, screen, isPlayingForwards } = currentTransition;

    const animationProgress = action.time / duration;
    if (isPlayingForwards) {
      screen.style.opacity = easeInOutCubic(animationProgress);
    } else {
      screen.style.opacity = easeInOutCubic(1 - animationProgress);
    }
  }  

  renderer.render(scene, camera);
}

animate();