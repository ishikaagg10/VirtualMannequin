import { Camera } from "../lib/webglutils/Camera.js";
import { Vec3 } from "../lib/TSM.js";
export var Mode;
(function (Mode) {
    Mode[Mode["playback"] = 0] = "playback";
    Mode[Mode["edit"] = 1] = "edit";
})(Mode || (Mode = {}));
/**
 * Handles Mouse and Button events along with
 * the the camera.
 */
export class GUI {
    /**
     *
     * @param canvas required to get the width and height of the canvas
     * @param animation required as a back pointer for some of the controls
     * @param sponge required for some of the controls
     */
    constructor(canvas, animation) {
        this.hoverX = 0;
        this.hoverY = 0;
        this.height = canvas.height;
        this.viewPortHeight = this.height - 200;
        this.width = canvas.width;
        this.prevX = 0;
        this.prevY = 0;
        this.animation = animation;
        this.reset();
        this.registerEventListeners(canvas);
    }
    getNumKeyFrames() {
        //TODO: Fix for the status bar in the GUI
        return 0;
    }
    getTime() {
        return this.time;
    }
    getMaxTime() {
        //TODO: The animation should stop after the last keyframe
        return 0;
    }
    /**
     * Resets the state of the GUI
     */
    reset() {
        this.fps = false;
        this.dragging = false;
        this.time = 0;
        this.mode = Mode.edit;
        this.camera = new Camera(new Vec3([0, 0, -6]), new Vec3([0, 0, 0]), new Vec3([0, 1, 0]), 45, this.width / this.viewPortHeight, 0.1, 1000.0);
    }
    /**
     * Sets the GUI's camera to the given camera
     * @param cam a new camera
     */
    setCamera(pos, target, upDir, fov, aspect, zNear, zFar) {
        this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
    }
    /**
     * Returns the view matrix of the camera
     */
    viewMatrix() {
        return this.camera.viewMatrix();
    }
    /**
     * Returns the projection matrix of the camera
     */
    projMatrix() {
        return this.camera.projMatrix();
    }
    /**
     * Callback function for the start of a drag event.
     * @param mouse
     */
    dragStart(mouse) {
        if (mouse.offsetY > 600) {
            // outside the main panel
            return;
        }
        // TODO: Add logic to rotate the bones, instead of moving the camera, if there is a currently highlighted bone
        this.dragging = true;
        this.prevX = mouse.screenX;
        this.prevY = mouse.screenY;
    }
    incrementTime(dT) {
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
    drag(mouse) {
        let x = mouse.offsetX;
        let y = mouse.offsetY;
        if (this.dragging) {
            const dx = mouse.screenX - this.prevX;
            const dy = mouse.screenY - this.prevY;
            this.prevX = mouse.screenX;
            this.prevY = mouse.screenY;
            /* Left button, or primary button */
            const mouseDir = this.camera.right();
            mouseDir.scale(-dx);
            mouseDir.add(this.camera.up().scale(dy));
            mouseDir.normalize();
            if (dx === 0 && dy === 0) {
                return;
            }
            switch (mouse.buttons) {
                case 1: {
                    let rotAxis = Vec3.cross(this.camera.forward(), mouseDir);
                    rotAxis = rotAxis.normalize();
                    if (this.fps) {
                        this.camera.rotate(rotAxis, GUI.rotationSpeed);
                    }
                    else {
                        this.camera.orbitTarget(rotAxis, GUI.rotationSpeed);
                    }
                    break;
                }
                case 2: {
                    /* Right button, or secondary button */
                    this.camera.offsetDist(Math.sign(mouseDir.y) * GUI.zoomSpeed);
                    break;
                }
                default: {
                    break;
                }
            }
        }
        // TODO: Add logic here:
        // 1) To highlight a bone, if the mouse is hovering over a bone;
        // 2) To rotate a bone, if the mouse button is pressed and currently highlighting a bone.
    }
    getModeString() {
        switch (this.mode) {
            case Mode.edit: {
                return "edit: " + this.getNumKeyFrames() + " keyframes";
            }
            case Mode.playback: {
                return "playback: " + this.getTime().toFixed(2) + " / " + this.getMaxTime().toFixed(2);
            }
        }
    }
    /**
     * Callback function for the end of a drag event
     * @param mouse
     */
    dragEnd(mouse) {
        this.dragging = false;
        this.prevX = 0;
        this.prevY = 0;
        // TODO: Handle ending highlight/dragging logic as needed
    }
    /**
     * Callback function for a key press event
     * @param key
     */
    onKeydown(key) {
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
                this.camera.offset(this.camera.forward().negate(), GUI.zoomSpeed, true);
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
                //TODO: Handle bone rolls when a bone is selected
                this.camera.roll(GUI.rollSpeed, false);
                break;
            }
            case "ArrowRight": {
                //TODO: Handle bone rolls when a bone is selected
                this.camera.roll(GUI.rollSpeed, true);
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
                if (this.mode === Mode.edit && this.getNumKeyFrames() > 1) {
                    this.mode = Mode.playback;
                    this.time = 0;
                }
                else if (this.mode === Mode.playback) {
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
    registerEventListeners(canvas) {
        /* Event listener for key controls */
        window.addEventListener("keydown", (key) => this.onKeydown(key));
        /* Event listener for mouse controls */
        canvas.addEventListener("mousedown", (mouse) => this.dragStart(mouse));
        canvas.addEventListener("mousemove", (mouse) => this.drag(mouse));
        canvas.addEventListener("mouseup", (mouse) => this.dragEnd(mouse));
        /* Event listener to stop the right click menu */
        canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    }
}
GUI.rotationSpeed = 0.05;
GUI.zoomSpeed = 0.1;
GUI.rollSpeed = 0.1;
GUI.panSpeed = 0.1;
//# sourceMappingURL=Gui.js.map