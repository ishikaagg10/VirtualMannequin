import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { SkinningAnimation } from "./App.js";
import { Mat4, Vec3, Vec4, Vec2, Mat2, Quat } from "../lib/TSM.js";
import { Bone } from "./Scene.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";

/**
 * Might be useful for designing any animation GUI
 */
interface IGUI {
  viewMatrix(): Mat4;
  projMatrix(): Mat4;
  dragStart(me: MouseEvent): void;
  drag(me: MouseEvent): void;
  dragEnd(me: MouseEvent): void;
  onKeydown(ke: KeyboardEvent): void;
}

export enum Mode {
  playback,  
  edit  
}

	
/**
 * Handles Mouse and Button events along with
 * the the camera.
 */

export class GUI implements IGUI {
  private static readonly rotationSpeed: number = 0.05;
  private static readonly zoomSpeed: number = 0.1;
  private static readonly rollSpeed: number = 0.1;
  private static readonly panSpeed: number = 0.1;

  private camera!: Camera;
  private dragging!: boolean;
  private fps!: boolean;
  private prevX: number;
  private prevY: number;

  private height: number;
  private viewPortHeight: number;
  private width: number;

  private animation: SkinningAnimation;

  public time!: number;
  public mode!: Mode;

  public hoverX: number = 0;
  public hoverY: number = 0;

  public highlightedBoneIndex: number = -1;
  public draggingBone: boolean = false;

  /**
   *
   * @param canvas required to get the width and height of the canvas
   * @param animation required as a back pointer for some of the controls
   * @param sponge required for some of the controls
   */
  constructor(canvas: HTMLCanvasElement, animation: SkinningAnimation) {
    this.height = canvas.height;
    this.viewPortHeight = this.height - 200;
    this.width = canvas.width;
    this.prevX = 0;
    this.prevY = 0;
    
    this.animation = animation;
    
    this.reset();
    
    this.registerEventListeners(canvas);
  }

  public getNumKeyFrames(): number {
    //TODO: Fix for the status bar in the GUI
    return 0;
  }
  
  public getTime(): number { 
  	return this.time; 
  }
  
  public getMaxTime(): number { 
    //TODO: The animation should stop after the last keyframe
    return 0;
  }

  /**
   * Resets the state of the GUI
   */
  public reset(): void {
    this.fps = false;
    this.dragging = false;
    this.time = 0;
	this.mode = Mode.edit;

    this.camera = new Camera(
      new Vec3([0, 0, -6]),
      new Vec3([0, 0, 0]),
      new Vec3([0, 1, 0]),
      45,
      this.width / this.viewPortHeight,
      0.1,
      1000.0
    );
  }

  /**
   * Sets the GUI's camera to the given camera
   * @param cam a new camera
   */
  public setCamera(
    pos: Vec3,
    target: Vec3,
    upDir: Vec3,
    fov: number,
    aspect: number,
    zNear: number,
    zFar: number
  ) {
    this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
  }

  /**
   * Returns the view matrix of the camera
   */
  public viewMatrix(): Mat4 {
    return this.camera.viewMatrix();
  }

  /**
   * Returns the projection matrix of the camera
   */
  public projMatrix(): Mat4 {
    return this.camera.projMatrix();
  }

  /**
   * Callback function for the start of a drag event.
   * @param mouse
   */
  public dragStart(mouse: MouseEvent): void {
    if (mouse.offsetY > 600) {
      return;
    }
    
    this.dragging = true;
    this.prevX = mouse.screenX;
    this.prevY = mouse.screenY;

    if (this.highlightedBoneIndex !== -1 && mouse.button === 0) {
      this.draggingBone = true;
    }
  }

  public incrementTime(dT: number): void {
    if (this.mode === Mode.playback) {
      this.time += dT;
      if (this.time >= this.getMaxTime()) {
        this.time = 0;
        this.mode = Mode.edit;
      }
    }
  }
  

  /**
   * The callback function for a drag event.
   * This event happens after dragStart and
   * before dragEnd.
   * @param mouse
   */
  public drag(mouse: MouseEvent): void {
    let x = mouse.offsetX;
    let y = mouse.offsetY;
    if (this.dragging) {
      const dx = mouse.screenX - this.prevX;
      const dy = mouse.screenY - this.prevY;
      this.prevX = mouse.screenX;
      this.prevY = mouse.screenY;

      if (dx === 0 && dy === 0) {
        return;
      }

      if (this.draggingBone && this.highlightedBoneIndex !== -1) {
        let meshes = this.animation.getScene().meshes;
        if (meshes.length > 0) {
          let bone = meshes[0].bones[this.highlightedBoneIndex];
          
          let axis = this.camera.up().copy().scale(-dx).add(this.camera.right().copy().scale(-dy)).normalize();
          let angle = Math.sqrt(dx * dx + dy * dy) * 0.01;
          
          let parentRot = new Quat([0, 0, 0, 1]);
          if (bone.parent !== -1) {
            parentRot = meshes[0].bones[bone.parent].rotation.copy();
          }
          
          let invParentRot = parentRot.inverse();
          let parentMat = invParentRot.toMat3();
          let localAxis = parentMat.multiplyVec3(axis).normalize();
          
          let dragRot = Quat.fromAxisAngle(localAxis, angle);
          bone.localRotation = dragRot.multiply(bone.localRotation);
        }
      } else {
        const mouseDir: Vec3 = this.camera.right();
        mouseDir.scale(-dx);
        mouseDir.add(this.camera.up().scale(dy));
        mouseDir.normalize();

        switch (mouse.buttons) {
          case 1: {
            let rotAxis: Vec3 = Vec3.cross(this.camera.forward(), mouseDir);
            rotAxis = rotAxis.normalize();

            if (this.fps) {
              this.camera.rotate(rotAxis, GUI.rotationSpeed);
            } else {
              this.camera.orbitTarget(rotAxis, GUI.rotationSpeed);
            }
            break;
          }
          case 2: {
            this.camera.offsetDist(Math.sign(mouseDir.y) * GUI.zoomSpeed);
            break;
          }
          default: {
            break;
          }
        }
      }
    } 
    else {
      if (y > 600 || this.mode !== Mode.edit) return;

      let x_ndc = (x / this.width) * 2.0 - 1.0;
      let y_ndc = 1.0 - (y / 600.0) * 2.0; 

      let invProj = this.projMatrix().copy().inverse();
      let invView = this.viewMatrix().copy().inverse();
      
      let clipCoords = new Vec4([x_ndc, y_ndc, -1.0, 1.0]); 
      
      let eyeCoords = invProj.multiplyVec4(clipCoords);
      eyeCoords = new Vec4([eyeCoords.x, eyeCoords.y, -1.0, 0.0]);
      
      let worldRayDir = invView.multiplyVec4(eyeCoords);
      let rayDir = new Vec3([worldRayDir.x, worldRayDir.y, worldRayDir.z]).normalize();
      
      let rayOrigin = this.camera.pos();

      let closestBoneIndex = -1;
      let closestT = Infinity;
      const hitRadius = 0.2;
      
      let meshes = this.animation.getScene().meshes;
      if (meshes.length > 0) {
        let bones = meshes[0].bones;
        
        for (let i = 0; i < bones.length; i++) {
          let bone = bones[i];
          
          let A = bone.position;
          let B = bone.endpoint;
          
          let AB = new Vec3([B.x - A.x, B.y - A.y, B.z - A.z]);
          if (Vec3.dot(AB, AB) < 0.0001) continue;
          
          let w0 = new Vec3([rayOrigin.x - A.x, rayOrigin.y - A.y, rayOrigin.z - A.z]);
          
          let a = Vec3.dot(rayDir, rayDir);
          let b = Vec3.dot(rayDir, AB);
          let c = Vec3.dot(AB, AB);
          let d = Vec3.dot(rayDir, w0);
          let e = Vec3.dot(AB, w0);
          
          let denom = a * c - b * b;
          let sc = 0;
          let tc = 0;
          
          if (denom < 1e-5) {
            sc = 0;
            tc = (b > c ? d / b : e / c);
          } else {
            sc = (a * e - b * d) / denom;
            tc = (b * e - c * d) / denom;
          }
          
          if (sc < 0.0) { sc = 0.0; tc = -d / a; }
          else if (sc > 1.0) { sc = 1.0; tc = (b - d) / a; }
          
          if (tc < 0) continue;
          
          let pointOnRay = new Vec3([
            rayOrigin.x + tc * rayDir.x,
            rayOrigin.y + tc * rayDir.y,
            rayOrigin.z + tc * rayDir.z
          ]);
          let pointOnSeg = new Vec3([
            A.x + sc * AB.x,
            A.y + sc * AB.y,
            A.z + sc * AB.z
          ]);
          
          let distVec = new Vec3([
            pointOnRay.x - pointOnSeg.x,
            pointOnRay.y - pointOnSeg.y,
            pointOnRay.z - pointOnSeg.z
          ]);
          let distance = Math.sqrt(Vec3.dot(distVec, distVec));
          
          if (distance < hitRadius && tc < closestT) {
            closestT = tc;
            closestBoneIndex = i;
          }
        }
      }

      if (this.highlightedBoneIndex !== closestBoneIndex) {
        this.highlightedBoneIndex = closestBoneIndex;
      }
    }
  }
  
 
  public getModeString(): string {
    switch (this.mode) {
      case Mode.edit: { return "edit: " + this.getNumKeyFrames() + " keyframes"; }
      case Mode.playback: { return "playback: " + this.getTime().toFixed(2) + " / " + this.getMaxTime().toFixed(2); }
    }
  }
  
  /**
   * Callback function for the end of a drag event
   * @param mouse
   */
  public dragEnd(mouse: MouseEvent): void {
    this.dragging = false;
    this.draggingBone = false;
    this.prevX = 0;
    this.prevY = 0;
  }

  /**
   * Callback function for a key press event
   * @param key
   */
  public onKeydown(key: KeyboardEvent): void {
    switch (key.code) {
      case "Digit1": {
        this.animation.setScene("./static/assets/skinning/split_cube.dae");
        break;
      }
      case "Digit2": {
        this.animation.setScene("./static/assets/skinning/long_cubes.dae");
        break;
      }
      case "Digit3": {
        this.animation.setScene("./static/assets/skinning/simple_art.dae");
        break;
      }      
      case "Digit4": {
        this.animation.setScene("./static/assets/skinning/mapped_cube.dae");
        break;
      }
      case "Digit5": {
        this.animation.setScene("./static/assets/skinning/robot.dae");
        break;
      }
      case "Digit6": {
        this.animation.setScene("./static/assets/skinning/head.dae");
        break;
      }
      case "Digit7": {
        this.animation.setScene("./static/assets/skinning/wolf.dae");
        break;
      }
      case "KeyW": {
        this.camera.offset(
            this.camera.forward().negate(),
            GUI.zoomSpeed,
            true
          );
        break;
      }
      case "KeyA": {
        this.camera.offset(this.camera.right().negate(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyS": {
        this.camera.offset(this.camera.forward(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyD": {
        this.camera.offset(this.camera.right(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyR": {
        this.animation.reset();
        break;
      }
      case "ArrowLeft": {
        if (this.highlightedBoneIndex !== -1) {
          let meshes = this.animation.getScene().meshes;
          if (meshes.length > 0) {
            let bone = meshes[0].bones[this.highlightedBoneIndex];
            let rollAxis = new Vec3([
              bone.initialEndpoint.x - bone.initialPosition.x,
              bone.initialEndpoint.y - bone.initialPosition.y,
              bone.initialEndpoint.z - bone.initialPosition.z
            ]).normalize();
            let rollRot = Quat.fromAxisAngle(rollAxis, -GUI.rollSpeed);
            bone.localRotation = bone.localRotation.copy().multiply(rollRot);
          }
        } else {
          this.camera.roll(GUI.rollSpeed, false);
        }
        break;
      }
      case "ArrowRight": {
        if (this.highlightedBoneIndex !== -1) {
          let meshes = this.animation.getScene().meshes;
          if (meshes.length > 0) {
            let bone = meshes[0].bones[this.highlightedBoneIndex];
            let rollAxis = new Vec3([
              bone.initialEndpoint.x - bone.initialPosition.x,
              bone.initialEndpoint.y - bone.initialPosition.y,
              bone.initialEndpoint.z - bone.initialPosition.z
            ]).normalize();
            let rollRot = Quat.fromAxisAngle(rollAxis, GUI.rollSpeed);
            bone.localRotation = bone.localRotation.copy().multiply(rollRot);
          }
        } else {
          this.camera.roll(GUI.rollSpeed, true);
        }
        break;
      }
      case "ArrowUp": {
        this.camera.offset(this.camera.up(), GUI.zoomSpeed, true);
        break;
      }
      case "ArrowDown": {
        this.camera.offset(this.camera.up().negate(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyK": {
        if (this.mode === Mode.edit) {
		//TODO: Add keyframes if required by project spec
        }
        break;
      }      
      case "KeyP": {
        if (this.mode === Mode.edit && this.getNumKeyFrames() > 1)
        {
          this.mode = Mode.playback;
          this.time = 0;
        } else if (this.mode === Mode.playback) {
          this.mode = Mode.edit;
        }
        break;
      }
      default: {
        console.log("Key : '", key.code, "' was pressed.");
        break;
      }
    }
  }

  /**
   * Registers all event listeners for the GUI
   * @param canvas The canvas being used
   */
  private registerEventListeners(canvas: HTMLCanvasElement): void {
    /* Event listener for key controls */
    window.addEventListener("keydown", (key: KeyboardEvent) =>
      this.onKeydown(key)
    );

    /* Event listener for mouse controls */
    canvas.addEventListener("mousedown", (mouse: MouseEvent) =>
      this.dragStart(mouse)
    );

    canvas.addEventListener("mousemove", (mouse: MouseEvent) =>
      this.drag(mouse)
    );

    canvas.addEventListener("mouseup", (mouse: MouseEvent) =>
      this.dragEnd(mouse)
    );

    /* Event listener to stop the right click menu */
    canvas.addEventListener("contextmenu", (event: any) =>
      event.preventDefault()
    );
  }
}
