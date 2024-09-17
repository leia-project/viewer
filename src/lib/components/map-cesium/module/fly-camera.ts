import type * as Cesium from "cesium";

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

		this.mouseMoveX = 0;
		this.mouseMoveY = 0;
		this.moveSpeed = moveSpeed;
		this.speedModifier = this.speedModOff;
		this.enabled = false;

		this.setupKeys();
		this.setupEvents();
	}

	private setupKeys() {
		this.keys = {
			a: { downAction: () => this.moveLeft() },
			d: { downAction: () => this.moveRight() },
			q: { downAction: () => this.moveUp() },
			w: { downAction: () => this.moveForward() },
			s: { downAction: () => this.moveBackward() },
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

	private addPointerLockChangeEvent() {
		document.addEventListener("pointerlockchange", (event) => {
			if (document.pointerLockElement === null) {
				this.enabled = false;
			}
		});
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

	public switchPointerCamera() {
		if (!this.enabled) {
			this.scene.canvas.requestPointerLock();
		} else {
			document.exitPointerLock();
		}

		this.enabled = !this.enabled;
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

	private moveForward() {
		const speed = this.getMoveSpeed();
		this.camera.moveForward(speed);
	}

	private moveBackward() {
		const speed = this.getMoveSpeed();
		this.camera.moveBackward(speed);
	}

	private moveLeft() {
		const speed = this.getMoveSpeed();
		this.camera.moveLeft(speed);
	}

	private moveRight() {
		const speed = this.getMoveSpeed();
		this.camera.moveRight(speed);
	}

	private moveUp() {
		const speed = this.getMoveSpeed();
		this.camera.moveUp(speed);
	}

	private moveDown() {
		const speed = this.getMoveSpeed();
		this.camera.moveDown(speed);
	}

	private viewerUpdate() {
		this.mouseLook();
		console.log(this.camera.position)
		for (const property in this.keys) {
			const key = this.keys[property];
			if (key.downAction && key.state == "down" && (key.continuesly || key.updated)) {
				key.downAction();
				key.updated = false;
			}

			if (key.upAction && key.state == "up" && key.updated) {
				key.upAction();
				key.updated = false;
			}
		}
	}
}
