import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";

const goBackBtn = document.getElementById("go-back");

const teacherOverlay = document.querySelector(".teacher-overlay");
const teddyOverlay = document.querySelector(".teddy-overlay");
const projectsOverlay = document.querySelector(".projects-overlay");
const projectorOverlay = document.querySelector(".projector-overlay");
const notebookOverlay = document.querySelector(".notebook-overlay");

async function loadRoom() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync("assets/room3.glb");
  return gltf;
}

loadRoom().then((model) => {
  const scene = new Scene(model, goBackBtn);
  //scene.goToEnd("Plane004_2");
  scene.render();
});

class Scene {
  constructor(model, goBackBtn, baseScale = 7.5) {
    this.model = model;
    this.goBackBtn = goBackBtn;
    this.baseScale = baseScale;
    this.setupRenderer();
    this.resize();
    this.setupLighting();
    this.setupPostprocessing();
    this.setupAnimations();
    this.setupClickHandling();
    this.setupAutoResizing();
  }

  render() {
    this.composer.render(this.model.scene, this.model.cameras[0]);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer();
    this.resizeRenderer();
    this.renderer.setClearColor(0x030303, 1);
    this.currentScale = this.baseScale;
    document.body.appendChild(this.renderer.domElement);
  }

  resize(scale = this.currentScale) {
    //updates current scale
    this.currentScale = scale;
    const aspectRatio = window.innerWidth / window.innerHeight;
    let width, height;

    this.resizeRenderer();

    if (window.innerWidth > window.innerHeight) {
      width = scale;
      height = scale / aspectRatio;
    }

    if (window.innerWidth < window.innerHeight) {
      width = scale * aspectRatio;
      height = scale;
    }

    this.model.cameras[0].left = -width;
    this.model.cameras[0].right = width;
    this.model.cameras[0].top = height;
    this.model.cameras[0].bottom = -height;
    this.model.cameras[0].updateProjectionMatrix();
  }

  resizeRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, true);
    this.renderer.setPixelRatio(Math.max(window.devicePixelRatio, 2));
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.model.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    this.model.scene.add(directionalLight);
  }

  setupAnimations() {
    this.mixer = new Mixer(
      this.model.scene,
      this.onFinish.bind(this),
      this.onReturn.bind(this),
      this.baseScale,
      this.resize.bind(this)
    );
    this.clock = new THREE.Clock();

    this.mixer.addAnimation(
      "Cube011",
      this.model.animations[0],
      6,
      projectorOverlay
    );
    this.mixer.addAnimation("teddy", this.model.animations[1], 6, teddyOverlay);
    this.mixer.addAnimation(
      "Plane003_2",
      this.model.animations[4],
      6.2,
      teacherOverlay
    );
    this.mixer.addAnimation(
      "Cube028",
      this.model.animations[2],
      6.2,
      projectsOverlay
    );
    this.mixer.addAnimation(
      "Plane004_2",
      this.model.animations[5],
      6.5,
      notebookOverlay
    );

    this.currentAnimation = null;
  }

  goToEnd(animationName) {
    this.mixer.goToEnd(animationName);
    //we have to "animate" to the end, so that we can keep our logic simple
    //actually only one (last) frame is rendered
    this.shouldAnimate = true;
    this.animate();
  }

  setupPostprocessing() {
    this.raycaster = new THREE.Raycaster();

    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(window.innerWidth, window.innerHeight);

    this.composer.addPass(
      new RenderPass(this.model.scene, this.model.cameras[0])
    );

    this.outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.model.scene,
      this.model.cameras[0]
    );

    this.composer.addPass(this.outlinePass);

    this.composer.addPass(new ShaderPass(GammaCorrectionShader));

    this.setupOutlineOfInteractiveElements();
  }

  setupClickHandling() {
    this.shouldAnimate = false;
    window.addEventListener("click", () => {
      //if no interactable object is hovered over, return
      if (!this.lastIntersectObjName) return;

      this.clearOutline();

      this.shouldAnimate = true;
      this.mixer.play(this.lastIntersectObjName);
      this.animate();
    });

    this.goBackBtn.addEventListener("click", () => {
      //no need to clear outline here, because we are going back to the main scene
      this.shouldAnimate = true;
      this.mixer.resume();
      this.animate();
    });
  }

  getIntersects(e) {
    const mouse = new THREE.Vector2();
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(mouse, this.model.cameras[0]);

    return this.raycaster.intersectObjects(this.model.scene.children, true);
  }

  //checks if we hover over an interactive element and should add an outline
  setupOutlineOfInteractiveElements() {
    this.lastPosX = 0;
    this.lastPosY = 0;
    this.lastIntersectObjName = null;
    this.shouldHideOutline = false;
    window.addEventListener("mousemove", (e) => {
      //no detection when animating
      if (this.shouldAnimate || this.shouldHideOutline) return;

      const difference =
        Math.abs(this.lastPosX - e.clientX) +
        Math.abs(this.lastPosY - e.clientY);
      if (difference > 10) {
        const intersects = this.getIntersects(e);
        if (!intersects || intersects.length === 0) return;
        else {
          const objName = intersects[0].object.name;
          if (
            this.lastIntersectObjName !== objName &&
            this.mixer.hasAnimation(objName)
          ) {
            this.lastIntersectObjName = objName;
            this.setOutline(intersects[0].object);
            this.render();
          } else if (!this.mixer.hasAnimation(objName)) {
            console.log("no animation for:", objName);
            this.lastIntersectObjName = null;
            this.clearOutline();
            this.render();
          } else {
          }
        }
      }
    });
  }

  setOutline(obj) {
    this.outlinePass.selectedObjects = [obj];
    document.body.style.cursor = "pointer";
  }

  clearOutline() {
    this.outlinePass.selectedObjects = [];
    document.body.style.cursor = "default";
  }

  setupAutoResizing() {
    window.addEventListener("resize", () => {
      this.resize();
      this.render();
    });
  }

  animate() {
    if (!this.shouldAnimate) return;
    requestAnimationFrame(this.animate.bind(this));

    this.mixer.update();

    this.render();
  }

  onFinish() {
    this.shouldAnimate = false;
    this.shouldHideOutline = true;
    this.goBackBtn.style.display = "block";
  }

  onReturn() {
    this.shouldAnimate = false;
    this.shouldHideOutline = false;
    this.goBackBtn.style.display = "none";
  }
}

class Mixer {
  constructor(scene, onFinish, onReturn, baseScale, resizeCallback) {
    this.mixer = new THREE.AnimationMixer(scene);
    this.clock = new THREE.Clock();
    this.transitions = {};
    this.currentAnimation = null;
    this.isPlayingForward = true;
    this.onFinish = onFinish;
    this.onReturn = onReturn;
    this.baseScale = baseScale;
    this.resizeCallback = resizeCallback;
    this.setupEvents();
  }

  setupEvents() {
    this.mixer.addEventListener("loop", () => {
      if (this.isPlayingForward) {
        this.isPlayingForward = false;
        this.pause();
        this.onFinish();
      } else {
        this.isPlayingForward = true;
        this.stop();
        this.onReturn();
      }
    });
  }

  addAnimation(name, clip, zoomScalar = 5, newScreen) {
    const action = this.mixer.clipAction(clip);

    this.transitions[name] = new Animation(action, zoomScalar, newScreen);
  }

  hasAnimation(name) {
    return this.transitions[name] !== undefined;
  }

  play(name) {
    if (!this.hasAnimation(name)) return;

    this.currentAnimation = this.transitions[name];
    this.clock.start();
    this.currentAnimation.play();
  }

  stop() {
    if (this.currentAnimation) {
      this.clock.stop();
      this.currentAnimation.stop();
    }
  }

  pause() {
    if (this.currentAnimation) {
      this.currentAnimation.pause();
      this.clock.stop();
    }
  }

  resume() {
    if (this.currentAnimation) {
      this.currentAnimation.resume();
      this.clock.start();
    }
  }

  update() {
    this.mixer.update(this.clock.getDelta());
    const progress = this.currentAnimation.getProgress(this.isPlayingForward);
    if (progress > 0.05) {
      //progress resets at the end of animation so we have to check this to not rescale to big
      this.resizeCallback(
        this.baseScale - progress * this.currentAnimation.zoomScalar
      );
      this.currentAnimation.updateScreenOpacity(progress);
    }
  }

  goToEnd(animationName) {
    if (!this.hasAnimation(animationName)) return;
    this.play(animationName);
    this.currentAnimation.action.time =
      this.currentAnimation.action.getClip().duration;
  }
}

class Animation {
  constructor(action, zoomScalar = 0, newScreen, ease = easeInOutCubic) {
    this.action = action;
    this.zoomScalar = zoomScalar;
    this.action.clampWhenFinished = true;
    this.action.loop = THREE.LoopPingPong;
    this.ease = ease;
    this.newScreen = newScreen;
  }

  play() {
    this.action.play();
    this.newScreen.classList.remove("hidden");
  }

  stop() {
    this.action.stop();
    //if we stop, we always want to reset the opacity
    this.updateScreenOpacity(0);
    this.newScreen.classList.add("hidden");
  }

  pause() {
    this.action.paused = true;
  }

  resume() {
    this.action.paused = false;
  }

  getProgress(isPlayingForward) {
    const progress = this.action.time / this.action.getClip().duration;
    return this.ease(isPlayingForward ? progress : 1 - progress);
  }

  updateScreenOpacity(opacity) {
    if (this.newScreen)
      this.newScreen.style.opacity = opacity <= 0.09 ? 0 : opacity;
  }
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

const adobeBtn = document.getElementById("adobe-btn");
const rhinoBtn = document.getElementById("rhino-btn");
const adobeGallery = document.getElementById("adobe");
const rhinoGallery = document.getElementById("rhino");

adobeBtn.addEventListener("click", () => {
  adobeGallery.classList.remove("hidden");
  rhinoGallery.classList.add("hidden");
});
rhinoBtn.addEventListener("click", () => {
  adobeGallery.classList.add("hidden");
  rhinoGallery.classList.remove("hidden");
});
