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
const clip = THREE.AnimationClip.findByName(
  model.animations,
  "CameraAction.001"
);
const cameraAction = mixer.clipAction(clip);
cameraAction.play();

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

  renderer.render(scene, camera);
}

animate();