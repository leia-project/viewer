import * as Cesium from "cesium";
import type { Map } from "../module/map";
import { writable, type Writable, get, type Unsubscriber } from "svelte/store";
import type { ThreedeeLayer } from "../module/layers/threedee-layer";


export class ClipSlider {
	
	public layer: ThreedeeLayer;
	private tileset: Cesium.Cesium3DTileset;
	private map: Map;
	private inputHandler: Cesium.ScreenSpaceEventHandler;

	private plane: Cesium.Plane = new Cesium.ClippingPlane(new Cesium.Cartesian3(1, 1, 1), 0);
	public slider: Cesium.Entity = new Cesium.Entity();
	public showSlider: Writable<boolean> = writable(true);

	public angleXY: Writable<number> = writable(180);
	public angleZ: Writable<number> = writable(0);
	private tempAngleXY: number = get(this.angleXY);
	private tempDistance: number = 0;

	private unsubscribers: Array<Unsubscriber> = new Array<Unsubscriber>();

	public active: Writable<boolean> = writable(false);
	public sliceMode: Writable<boolean> = writable(false);
	public minSliceHeight: Writable<number> = writable(-2);
	public maxSliceHeight: Writable<number> = writable(2);
	public heightSliceHeight: Writable<number> = writable(0);
	

	constructor(layer: ThreedeeLayer, map: Map) {
		this.layer = layer;
		this.tileset = layer.source;
		this.map = map;
		this.inputHandler = new Cesium.ScreenSpaceEventHandler(this.map.viewer.scene.canvas);
		this.updatePlaneOrientation();
		this.setSubscribers();
	}

	private setSubscribers(): void {
		this.unsubscribers.push(

			this.active.subscribe((b) => {
				this.toggleClippingPlanes(b);
			}),

			this.showSlider.subscribe((b) => {
				this.slider.show = b
			}),

			this.angleXY.subscribe(() => { 
				this.updatePlaneDistanceXY();
				this.updatePlaneOrientation();
			}),

			this.angleZ.subscribe(() => this.updatePlaneOrientation()),

			this.layer.visible.subscribe((b) => {
				if (!b) this.active.set(false);
			}),

			this.layer.config.added.subscribe((b) => {
				if (!b) this.destroy();
			}),

			this.layer.tilesetHeight.subscribe(() => { 
				if (get(this.active)) {
					this.map.viewer.entities.remove(this.slider);
					this.makePlaneEntity();
				}
			})
		)
	}

	public toggleClippingPlanes(active: boolean): void {
		if (!this.tileset.clippingPlanes) this.tileset.clippingPlanes = new Cesium.ClippingPlaneCollection();
		active ? this.activate() : this.deactivate();
	}

	private activate(): void {
		this.tileset.clippingPlanes.removeAll();
		this.tileset.clippingPlanes.add(this.plane);
		this.tileset.clippingPlanes.enabled = true
		
		this.setModelMatrix();
		this.makePlaneEntity();
		this.addInputActions();
	}

	public deactivate(): void {
		this.tileset.clippingPlanes.remove(this.plane);
		this.map.viewer.entities.remove(this.slider);
		this.removeInputActions();
	}

	private destroy(): void {
		this.map.viewer.entities.remove(this.slider);
		this.inputHandler.destroy();
		this.unsubscribers.forEach((unsubscriber) => unsubscriber());
	}

	public reset(): void {
		this.angleXY.set(180);
		this.angleZ.set(0);
		this.plane.distance = 0;
	}

	private setModelMatrix(): void {		
		if (!Cesium.Matrix4.equals(this.tileset.root.transform, Cesium.Matrix4.IDENTITY)) {
			// We use the center of the bounding sphere as the origin of the clipping planes, so we:
			// 1. Get the transform of the tileset's bounding sphere center in a earthNorthUp frame
			// 2. Get the inverse transform of the tileset's clippingPlane reference frame
			// 3. Multiplication of 1 and 2 allows use to transfer the clipping planes from the default clipping plane origin to the northEastUp frame of the bounding sphere center
			const transformMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(this.tileset.boundingSphere.center);
			const tilesetRootTransform = Cesium.Matrix4.inverse(this.tileset.root.transform, new Cesium.Matrix4()); // Should satisfy conditions of the more efficient inverseTransformation but this does not work
			const centerInverseTransform = Cesium.Matrix4.multiplyTransformation(tilesetRootTransform, transformMatrix, new Cesium.Matrix4());
			this.tileset.clippingPlanes.modelMatrix = centerInverseTransform;
		}
		else if (this.tileset.clippingPlanes.modelMatrix !== Cesium.Matrix4.IDENTITY) {
			this.tileset.clippingPlanes.modelMatrix = Cesium.Matrix4.IDENTITY;
			// TO DO:
			// The modelMatrix of the 3D tileset may have been shifted when the globe clipping planes are set on the tileset (e.g. in project-clip.ts or set3DTilesetClippingPlanes in subsurface cesium-handler.ts)
			// In this case, we need to shift the clipping planes as well 
		}
	}

	// Creates slider (visual of gridded plane)
	private makePlaneEntity(): void {
		const boundingSphere = this.tileset.boundingSphere;
		const radius = boundingSphere.radius;
		this.slider = new Cesium.Entity({
			position: boundingSphere.center,
			plane: {
				dimensions: new Cesium.Cartesian2(radius * 2, radius * 2),
				material: new Cesium.GridMaterialProperty({color: Cesium.Color.fromCssColorString("#757575"), cellAlpha: 0.1, lineCount: new Cesium.Cartesian2(20, 20), lineThickness: new Cesium.Cartesian2(0.5, 0.5)}),
				plane: new Cesium.CallbackProperty(() => {
					          console.log("plane callback");
					          this.map.viewer.scene.requestRender();
					          return this.plane 
					        }, false), // Smooth but requires a lot of computation
				outline: true,
				outlineColor: Cesium.Color.BLACK,
			},
		});
		this.map.viewer.entities.add(this.slider);
		this.map.refresh();
	}
	

	private addInputActions(): void {
		this.inputHandler.setInputAction((m: any) => {
			const pickedObject = this.map.viewer.scene.pick(m.position);
			if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id) && Cesium.defined(pickedObject.id.plane)) {
				const pickedEntity = pickedObject.id;
				if (pickedEntity === this.slider && this.slider.plane) {
					//@ts-ignore
					this.slider.plane.material.cellAlpha = new Cesium.ConstantProperty(0.4);
					this.map.viewer.scene.screenSpaceCameraController.enableInputs = false;

					/*
					We need to determine how the clipping plane normal is oriented with respect to the camera position so we can shift the plane in the right direction based on screen space moves. 
					To do so, we:
					1. Get the inverse transform of the eastNorthUp frame at the bounding sphere center, which is the reference frame of the clipping plane normal 
					2. Transform the camera reference frame to this eastNorthUp frame
					3. Translate the transformed camera reference frame to the origin of the eastNorthUp frame, while keeping its rotation and orientation. Like this, we get the position of the camera relative to the clipping plane normal
					4. Transform the clipping plane normal to the camera reference frame. This gives us the x, y and z components of the clipping plane normal in the camera reference frame
					5. We apply some corrections to control the speed
					*/
					const cameraFrame = this.map.viewer.scene.camera.inverseViewMatrix;
					const eastNorthUp = Cesium.Transforms.eastNorthUpToFixedFrame(this.tileset.boundingSphere.center);
					const eastNorthUpInverse = Cesium.Matrix4.inverseTransformation(eastNorthUp, new Cesium.Matrix4());

					const cameraMatrixRelativeToNormal = Cesium.Matrix4.multiplyTransformation(eastNorthUpInverse, cameraFrame, new Cesium.Matrix4());
					const cameraPositionRelativeToNormal = Cesium.Matrix4.getTranslation(cameraMatrixRelativeToNormal, new Cesium.Cartesian3());
					const translationMatrix = Cesium.Matrix4.fromTranslation(cameraPositionRelativeToNormal, new Cesium.Matrix4());
					const cameraAtOrigin = Cesium.Matrix4.multiplyTransformation(Cesium.Matrix4.inverseTransformation(translationMatrix, new Cesium.Matrix4()), cameraMatrixRelativeToNormal, new Cesium.Matrix4());
					
					const components = Cesium.Matrix4.multiplyByPointAsVector(Cesium.Matrix4.inverseTransformation(cameraAtOrigin, new Cesium.Matrix4()), this.plane.normal, new Cesium.Cartesian3());
					
					let scaleCorrection = 1 / Math.sqrt(components.x * components.x + components.y * components.y); // Correction because the z-component is never considered
					const distanceCameraPlaneOrigin = Cesium.Cartesian3.distance(cameraPositionRelativeToNormal, Cesium.Cartesian3.multiplyByScalar(this.plane.normal, -this.plane.distance, new Cesium.Cartesian3()));
					scaleCorrection *= distanceCameraPlaneOrigin / 8000; // The further away, the faster the sliding

				//Only for debugging. Check plane normal and check the orientation of the camera frame and the eastNorthUp frame relative to which the plane normal is defined
					//this.debugMatrix(cameraFrame, this.map);
					//this.debugMatrix(eastNorthUp, this.map);
					//this.debugNormal(this.plane.normal, eastNorthUp, this.map);		
				/*
					const cameraFrameX = new Cesium.Cartesian3(cameraAtOrigin[0], cameraAtOrigin[4], cameraAtOrigin[8]); // y component of screenspace
					const cameraFrameY = new Cesium.Cartesian3(cameraAtOrigin[1], cameraAtOrigin[5], cameraAtOrigin[9]); 
					const cameraFrameZ = new Cesium.Cartesian3(cameraAtOrigin[2], cameraAtOrigin[6], cameraAtOrigin[10]); // x component of screenspace
					const projectionX = Cesium.Cartesian3.projectVector(cameraFrameX, this.plane.normal, new Cesium.Cartesian3());
					const projectionY = Cesium.Cartesian3.projectVector(cameraFrameY, this.plane.normal, new Cesium.Cartesian3());
					const projectionZ = Cesium.Cartesian3.projectVector(cameraFrameZ, this.plane.normal, new Cesium.Cartesian3());
				*/

					this.inputHandler.setInputAction((m: any): void => {
						if (pickedEntity === this.slider) {
							const deltaX = m.startPosition.x - m.endPosition.x;
							const deltaY = m.startPosition.y - m.endPosition.y;
							this.updatePlanePosition(deltaX, deltaY, components, scaleCorrection);
						}
					}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
				}
			}
		}, Cesium.ScreenSpaceEventType.LEFT_DOWN);

		this.inputHandler.setInputAction(() => {
			if (this.slider.plane) {
				//@ts-ignore
				this.slider.plane.material.cellAlpha = new Cesium.ConstantProperty(0.1);
			}
			this.map.viewer.scene.screenSpaceCameraController.enableInputs = true;
			this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
		}, Cesium.ScreenSpaceEventType.LEFT_UP);
	}


	private removeInputActions(): void {
		this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
		this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
		this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
	}


	private updatePlanePosition(deltaX: number, deltaY: number, conversionVector: Cesium.Cartesian3, scaleCorrection: number): void {
		const shift = deltaX * conversionVector.x - deltaY * conversionVector.y;
		this.plane.distance += shift * scaleCorrection;
		this.tempDistance = this.plane.distance;
		this.tempAngleXY = get(this.angleXY);
	}


	public updatePlaneOrientation(): void {
		const angleXY = get(this.angleXY) * Math.PI / 180;
		const angleZ = (get(this.angleZ) - 0.01) * Math.PI / 180; // 0.01 subtraction to avoid x or y to be 0
		this.plane.normal.x = Math.cos(angleXY) * Math.cos(angleZ);
		this.plane.normal.y = Math.sin(angleXY) * Math.cos(angleZ);
		this.plane.normal.z = Math.sin(angleZ);
	}


	public updatePlaneDistanceXY(): void {
		const delta = this.tempAngleXY - get(this.angleXY) ;
		this.plane.distance = this.tempDistance *  Math.cos(delta * Math.PI / 180);
	}


	// Debugging functions:
	/*
	private debugMatrix(matrix: Cesium.Matrix4, map: Map): void {
		const p1 = new Cesium.Cartesian3(500, 0, 0);
		const p2 = new Cesium.Cartesian3(0, 500, 0);
		const p3 = new Cesium.Cartesian3(0, 0, 500);
		const p4 = new Cesium.Cartesian3(0, 0, 0);

		const p1c = Cesium.Matrix4.multiplyByPoint(matrix, p1, new Cesium.Cartesian3());
		const p2c = Cesium.Matrix4.multiplyByPoint(matrix, p2, new Cesium.Cartesian3());
		const p3c = Cesium.Matrix4.multiplyByPoint(matrix, p3, new Cesium.Cartesian3());
		const p4c = Cesium.Matrix4.multiplyByPoint(matrix, p4, new Cesium.Cartesian3());

		map.viewer.entities.add({
			position: p1c,
			point: {
				pixelSize: 10,
				color: Cesium.Color.RED,
			},
		});
		map.viewer.entities.add({
			position: p2c,
			point: {
				pixelSize: 10,
				color: Cesium.Color.GREEN,
			},
		});
		map.viewer.entities.add({
			position: p3c,
			point: {
				pixelSize: 10,
				color: Cesium.Color.BLUE,
			},
		});
		map.viewer.entities.add({
			position: p4c,
			point: {
				pixelSize: 10,
				color: Cesium.Color.YELLOW,
			},
		});

		// draw line entities between the points
		map.viewer.entities.add({
			polyline: {
				positions: [p1c, p4c],
				width: 3,
				material: Cesium.Color.RED,
			},
		});
		map.viewer.entities.add({
			polyline: {
				positions: [p2c, p4c],
				width: 3,
				material: Cesium.Color.GREEN,
			},
		});
		map.viewer.entities.add({
			polyline: {
				positions: [p3c, p4c],
				width: 3,
				material: Cesium.Color.BLUE,
			},
		});
	}


	private debugNormal(normal: Cesium.Cartesian3, transform: Cesium.Matrix4, map: Map): void{
		const normalPosition = Cesium.Matrix4.multiplyByPoint(transform, Cesium.Cartesian3.multiplyByScalar(normal, 250, new Cesium.Cartesian3), new Cesium.Cartesian3());
		const originPosition = Cesium.Matrix4.multiplyByPoint(transform, new Cesium.Cartesian3(0, 0, 0), new Cesium.Cartesian3());
		map.viewer.entities.add({
			position: normalPosition,
			point: {
				pixelSize: 10,
				color: Cesium.Color.GOLDENROD,
			},
		});
		map.viewer.entities.add({
			position: originPosition,
			point: {
				pixelSize: 10,
				color: Cesium.Color.GOLDENROD,
			},
		});

		map.viewer.entities.add({
			polyline: {
				positions: [originPosition, normalPosition],
				width: 3,
				material: Cesium.Color.GOLD,
			},
		});
	}
	*/
}