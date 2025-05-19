import * as Cesium from "cesium";
import type { CesiumProject } from "../MapToolProjects/project";

export default class FlyCamera {
	private viewer: Cesium.Viewer;
	private scene: Cesium.Scene;
	private camera: Cesium.Camera;
	private mouseSpeed: number;
	private speedModOff: number;
	private speedModOn: number;
	private speedSlowOn: number;
	private mouseMoveX: number;
	private mouseMoveY: number;
	private moveSpeed: number;
	private speedModifier: number;
	public enabled: boolean;
	public groundPOV: boolean;
	public requestingRender: boolean;
	public POVActive: boolean;
	public clickHandler: Cesium.ScreenSpaceEventHandler;
	public base = process.env.APP_URL;

	public movementHandler: Cesium.ScreenSpaceEventHandler;

	private keys: any;

	constructor(
		viewer: Cesium.Viewer,
		mouseSpeed = 0.003,
		moveSpeed = 1.0,
		speedModOn = 6.5,
		slowModOn = 6.5
	) {
		this.viewer = viewer;
		this.scene = this.viewer.scene;
		this.camera = this.viewer.camera;
		this.mouseSpeed = mouseSpeed;
		this.speedModOff = 1.0;
		this.speedModOn = speedModOn;
		this.speedSlowOn = slowModOn;
		this.requestingRender = viewer.scene.requestRenderMode;

		this.mouseMoveX = 0;
		this.mouseMoveY = 0;
		this.moveSpeed = moveSpeed;
		this.speedModifier = this.speedModOff;
		this.enabled = false;
		this.groundPOV = false;
		this.POVActive = false;
		this.clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
		this.movementHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
		this.setupKeys();
		this.setupEvents();
	}

	private setupKeys() {
		this.keys = {
			w: { downAction: () => this.moveHorizontally(true) },
			a: { downAction: () => this.moveLeft() },
			s: { downAction: () => this.moveHorizontally(false) },
			d: { downAction: () => this.moveRight() },

			arrowup: { downAction: () => this.moveHorizontally(true) },
			arrowleft: { downAction: () => this.moveLeft() },
			arrowdown: { downAction: () => this.moveHorizontally(false) },
			arrowright: { downAction: () => this.moveRight() },

			q: { downAction: () => this.moveUp() },
			e: { downAction: () => this.moveDown() },

			r: {
				continuesly: false,
				downAction: () => this.slowModifierOn(),
				upAction: () => this.slowModifierOff()
			},
			shift: {
				continuesly: false,
				downAction: () => this.speedModifierOn(),
				upAction: () => this.speedModifierOff()
			}
		};

		for (const property in this.keys) {
			if (this.keys[property].continuesly === undefined) {
				this.keys[property].continuesly = true;
			}
			this.keys[property].state = "up";
			this.keys[property].updated = false;
		}
	}

	private setupEvents() {
		this.addMouseMoveEvent();
		this.addKeyDownEvent();
		this.addKeyUpEvent();
		this.addPointerLockChangeEvent();
		this.addClockTickEvent();
	}

	private addMouseMoveEvent() {
		this.scene.canvas.addEventListener("mousemove", (event) => this.onMouseMove(event));
	}

	private addKeyDownEvent() {
		window.addEventListener(
			"keydown",
			(e) => {
				const key = e.key.toLowerCase();

				if (this.enabled) {
					if (this.keys[key]) {
						this.keys[key].state = "down";
						this.keys[key].updated = true;
					}
				}
			},
			true
		);
	}

	private addKeyUpEvent() {
		window.addEventListener(
			"keyup",
			(e) => {
				const key = e.key.toLowerCase();
				if (this.keys[key]) {
					this.keys[key].state = "up";
					this.keys[key].updated = true;
				}
			},
			true
		);
	}

	public switchPointerCamera() {
		if (!this.enabled) {
			this.lockPointer();
		} else {
			this.unlockPointer();
			
		}
	}

	private addPointerLockChangeEvent() {
		document.addEventListener("pointerlockchange", (event) => {
			if (document.pointerLockElement === null) {
				this.switchPointerCamera();
			}
		});
	}
	public lockPointer() {
		this.scene.globe.depthTestAgainstTerrain = true;
		this.scene.screenSpaceCameraController.enableCollisionDetection = true;
		this.scene.canvas.requestPointerLock();
		this.POVActive = true;
		this.enabled = true;
		document.getElementById("navfooter").style.visibility = "hidden";
	}

	public unlockPointer() {
		this.enabled = false;
		this.scene.globe.depthTestAgainstTerrain = false;
		this.scene.screenSpaceCameraController.enableCollisionDetection = false;
		this.POVActive = false;
		  
		//wait out the pointerlock restriction without errors
		setTimeout(() => {
			document.getElementById("navfooter").style.visibility = "visible";
		}, 1000);

    

	}

	private addClockTickEvent() {
		this.viewer.clock.onTick.addEventListener((clock) => this.viewerUpdate());
	}

	private onMouseMove(event: MouseEvent) {
		if (!this.enabled) {
			return;
		}

		if (event.movementX || event.movementY) {
			// the condition workarounds https://bugzilla.mozilla.org/show_bug.cgi?id=1417702
			// in Firefox, event.mouseMoveX is -2 even though there is no movement
			this.mouseMoveX += event.movementX;
			this.mouseMoveY += event.movementY;
		}
	}

	public enablePositionSelection() {
		this.groundPOV = true;

		//povactive differs from enabled variable in order to block stacking position marker
		this.POVActive = true;
		document.body.style.cursor = "grab";
		if (this.requestingRender) {
			this.viewer.scene.requestRenderMode = false;
		}
	}

	public handleMovement(movingEntity: Cesium.Entity) {
		const viewer = this.viewer;
		const movementHandler = this.movementHandler;

		movementHandler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
			let pickedPosition = viewer.scene.pickPosition(movement.endPosition);
			if (Cesium.defined(pickedPosition)) {
				targetPosition = pickedPosition;
			}
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

		//tweening
		let currentPosition = Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO);
		let targetPosition = Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO);
		const smoothfactor = 0.4;

		movingEntity.position = new Cesium.CallbackProperty(() => {
			const distance = Cesium.Cartesian3.distance(currentPosition, targetPosition);
			const epsilon = 0.001;

			if (distance < epsilon) {
				currentPosition = targetPosition;
			} else {
				Cesium.Cartesian3.lerp(currentPosition, targetPosition, smoothfactor, currentPosition);
			}
			return currentPosition;
		}, false);

		return movementHandler;
	}

	public handleClick() {
		let viewer = this.viewer;
		const clickHandler = this.clickHandler;

		clickHandler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
			this.disablePositionSelection();
			let pickedPosition = viewer.scene.pickPosition(click.position);

			if (Cesium.defined(pickedPosition)) {
				this.disablePositionSelection();
				const offset = Cesium.Cartesian3.fromElements(0, 0, 0); //height
				const newCameraPosition = Cesium.Cartesian3.add(
					pickedPosition,
					offset,
					new Cesium.Cartesian3()
				);

				const up = Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_Z);

				viewer.camera.setView({
					destination: newCameraPosition,
					orientation: {
						direction: this.getForwardFromPosition(newCameraPosition),
						up: up
					}
				});

				this.switchPointerCamera();
			}
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

		return clickHandler;
	}

	public disablePositionSelection() {
		this.clickHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
		this.movementHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
		this.viewer.entities.removeById("CursorBoard");
		this.viewer.scene.requestRenderMode = this.requestingRender;
		this.viewer.scene.requestRender();
		this.POVActive = false;
		document.body.style.cursor = "auto";
	}

	public bringToGroundPOV() {
		if (this.POVActive) {
			this.disablePositionSelection();
			return;
		}

		this.enablePositionSelection();

		let movingEntity = this.viewer.entities.add({
			name: "Cursor tracker",
			position: Cesium.Cartesian3.ZERO,
			id: "CursorBoard",
			billboard: {
				image:
				this.base + "/images/pov_man.png",
				width: 42,
				height: 42,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM
			}
		});

		this.handleMovement(movingEntity);
		this.handleClick();
	}

	public bringToFlyingPOV() {
		if (this.POVActive) {
			this.disablePositionSelection();
		}
		this.groundPOV = false;
		this.switchPointerCamera();
	}

	private speedModifierOn() {
		this.speedModifier = this.speedModOn;
	}

	private speedModifierOff() {
		this.speedModifier = this.speedModOff;
	}

	private slowModifierOn() {
		this.speedModifier = 1 / this.speedSlowOn;
	}

	private slowModifierOff() {
		this.speedModifier = this.speedModOff;
	}

	private getHeightSpeedModifier() {
		const height = this.camera.positionCartographic.height;
		const heightModifier = Math.max(1, height / 100);
		return heightModifier;
	}

	private getMoveSpeed() {
		return this.moveSpeed * this.speedModifier * this.getHeightSpeedModifier();
	}

	private getMouseSpeed() {
		return this.mouseSpeed;
	}

	private mouseLook() {
		if (!this.enabled) {
			return;
		}

		const speed = this.getMouseSpeed();
		const heading = this.camera.heading + this.mouseMoveX * speed;
		const pitch = this.camera.pitch - this.mouseMoveY * speed;

		this.mouseMoveX = 0;
		this.mouseMoveY = 0;

		this.camera.setView({
			orientation: {
				heading: heading,
				pitch: pitch
			}
		});
	}

	private getForwardFromPosition(cameraPosition: Cesium.Cartesian3) {
		const transform = Cesium.Transforms.eastNorthUpToFixedFrame(this.camera.position);

		const east = new Cesium.Cartesian3(transform[0], transform[1], transform[2]);
		const north = new Cesium.Cartesian3(transform[4], transform[5], transform[6]);
		const heading = this.camera.heading;

		const forward = Cesium.Cartesian3.add(
			Cesium.Cartesian3.multiplyByScalar(north, Math.cos(heading), new Cesium.Cartesian3()),
			Cesium.Cartesian3.multiplyByScalar(east, Math.sin(heading), new Cesium.Cartesian3()),
			new Cesium.Cartesian3()
		);

		Cesium.Cartesian3.normalize(forward, forward);

		return forward;
	}

	private applyGravity() {
		if(this.groundPOV) {
			const groundHeight =
			  this.scene.globe.getHeight(this.camera.positionCartographic);
		   
  
			  if(groundHeight) {
		  this.camera.moveDown((this.camera.positionCartographic.height - 1) - groundHeight)
			  }
		  }
	}

	private moveHorizontally(ahead: boolean) {
		let speed;

		if (ahead) {
			speed = this.getMoveSpeed();
		} else {
			speed = this.getMoveSpeed() - this.getMoveSpeed() * 2;
		}
		let forward = this.getForwardFromPosition(this.camera.position);
		this.camera.move(forward, speed);

		this.applyGravity();
	}

	private moveLeft() {
		const speed = this.getMoveSpeed();
		this.camera.moveLeft(speed);

		this.applyGravity();

	}

	private moveRight() {
		const speed = this.getMoveSpeed();
		this.camera.moveRight(speed);

		this.applyGravity();

	}

	private moveUp() {
		if (!this.groundPOV) {
			const speed = this.getMoveSpeed();
			this.camera.moveUp(speed);
		}
	}

	private moveDown() {
		if (!this.groundPOV) {
			const speed = this.getMoveSpeed();
			this.camera.moveDown(speed);
		}
	}

	private viewerUpdate() {
		this.mouseLook();
		for (const property in this.keys) {
			const key = this.keys[property];

                if(!this.enabled) {
					key.state = "up";
					key.updated = false;
				}

			if (key.downAction && key.state == "down" && (key.continuesly || key.updated) && this.enabled) {
				key.downAction();
				key.updated = false;
			}

			if (key.upAction && key.state == "up" && key.updated && this.enabled) {
				key.upAction();
				key.updated = false;
			}
		}
	}
}
