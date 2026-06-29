import { writable, type Writable, get, type Unsubscriber } from "svelte/store";
import * as Cesium from "cesium";
import type { Map } from "$lib/map-cesium/map";
import type { VoxelLayer } from "./voxel-layer";

const EARTH_RADIUS = Cesium.Ellipsoid.WGS84.maximumRadius; // meter

function clamp({ value, min = 0, max = 1 }: { value: number; min?: number; max?: number }) {
	return Math.min(max, Math.max(min, value));
}

/**
 * Draggable horizontal slice plane for a {@link VoxelLayer}.
 *
 * Cesium's VoxelPrimitive only supports axis-aligned box clipping
 * (min/maxClippingBounds), not the tilted ClippingPlaneCollection used by the
 * 3D tileset {@link ClipSlider}. So this renders a horizontal grid plane that
 * the user drags up/down, and maps its height onto the voxel layer's existing
 * normalised vertical clip window via {@link VoxelLayer.setClip}("z", …). The
 * plane and the sidebar's vertical range slider stay in sync because they read
 * & write the same `clipping` store.
 *
 * Heights are multiplied by the scene's vertical exaggeration when positioning
 * the plane (voxels are vertically exaggerated, Entities are not), while the
 * clip window stays in normalized units.
 */
export class VoxelClipSlider {
	public layer: VoxelLayer;
	private map: Map;
	
	private bounds: { min: Cesium.Cartesian3; max: Cesium.Cartesian3 };
	private centerLon: number;
	private centerLat: number;
	private centerPosition: Cesium.Cartesian3;
	private up: Cesium.Cartesian3;

	private entity: Cesium.Entity | null = null;
	private inputHandler: Cesium.ScreenSpaceEventHandler;
	private dragging = false;
	private unsubscribers: Array<Unsubscriber> = [];
	public active: Writable<boolean> = writable(false);
	public showPlane: Writable<boolean> = writable(true);

	constructor(
		layer: VoxelLayer,
		map: Map,
		bounds: { min: Cesium.Cartesian3; max: Cesium.Cartesian3 }
	) {
		this.layer = layer;
		this.map = map;
		this.bounds = bounds;

		// Voxel provider bounds are geographic. x = lon (rad), y = lat (rad), z = height (m).
		this.centerLon = (bounds.min.x + bounds.max.x) / 2;
		this.centerLat = (bounds.min.y + bounds.max.y) / 2;
		this.centerPosition = Cesium.Cartesian3.fromRadians(this.centerLon, this.centerLat, 0);

		// ECEF coords of the up vector at the center of the volume, for dragging the plane up/down regardless of camera angle
		// Helpful diagram: https://en.wikipedia.org/wiki/Local_tangent_plane_coordinates
		const eastNorthUp = Cesium.Transforms.eastNorthUpToFixedFrame(this.centerPosition);

		// the local Z axis (up) as an ECEF direction. normalized to length 1: the vertical at our location
		this.up = Cesium.Matrix4.multiplyByPointAsVector(
			eastNorthUp,
			new Cesium.Cartesian3(0, 0, 1),
			new Cesium.Cartesian3()
		);
		Cesium.Cartesian3.normalize(this.up, this.up);

		this.inputHandler = new Cesium.ScreenSpaceEventHandler(this.map.viewer.scene.canvas);
		this.setSubscribers();
	}

	private setSubscribers(): void {
		this.unsubscribers.push(
			this.active.subscribe((isActive) => (isActive ? this.activate() : this.deactivate())),

			this.showPlane.subscribe((doShow) => {
				if (this.entity) {
					this.entity.show = doShow;
				}
				this.map.refresh();
			}),

			this.layer.visible.subscribe((doShow) => {
				if (!doShow) {
					this.active.set(false);
				}
			}),

			this.layer.config.added.subscribe((doShow) => {
				if (!doShow) {
					this.destroy();
				}
			})
		);
	}

	private activate(): void {
		this.makePlaneEntity();
		this.addInputActions();
	}

	private deactivate(): void {
		this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
		this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
		this.inputHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
		if (this.entity) {
			this.map.viewer.entities.remove(this.entity);
			this.entity = null;
		}
		this.map.refresh();
	}

	private destroy(): void {
		this.deactivate();
		this.inputHandler.destroy();
		this.unsubscribers.forEach((unsubscribe) => unsubscribe());
	}

	public reset(): void {
		const z = get(this.layer.clipping).z;

		this.layer.setClip("z", [z[0], 1]);
	}

	/** Real unexaggerated voxel provider height of the current top cut */
	private currentHeight(): number {
		const t = get(this.layer.clipping).z[1];

		return this.bounds.min.z + t * (this.bounds.max.z - this.bounds.min.z);
	}

	private displayHeight(): number {
		return this.currentHeight() * get(this.map.options.verticalExaggeration);
	}

	private makePlaneEntity(): void {
		const lonSpan = this.bounds.max.x - this.bounds.min.x;
		const latSpan = this.bounds.max.y - this.bounds.min.y;

		const width = lonSpan * Math.cos(this.centerLat) * EARTH_RADIUS;
		const height = latSpan * EARTH_RADIUS;

		this.entity = new Cesium.Entity({
			position: new Cesium.CallbackPositionProperty(() => {
				this.map.viewer.scene.requestRender();

				return Cesium.Cartesian3.fromRadians(this.centerLon, this.centerLat, this.displayHeight());
			}, false),

			plane: {
				// Horizontal plane in the entity's local ENU frame.
				plane: new Cesium.Plane(new Cesium.Cartesian3(0, 0, 1), 0),
				dimensions: new Cesium.Cartesian2(width, height),
				material: new Cesium.GridMaterialProperty({
					color: Cesium.Color.fromCssColorString("#757575"),
					cellAlpha: 0.1,
					lineCount: new Cesium.Cartesian2(20, 20),
					lineThickness: new Cesium.Cartesian2(0.5, 0.5)
				}),
				outline: true,
				outlineColor: Cesium.Color.BLACK
			}
		});
		this.entity.show = get(this.showPlane);
		this.map.viewer.entities.add(this.entity);
		this.map.refresh();
	}

	private addInputActions(): void {
		this.inputHandler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
			const picked = this.map.viewer.scene.pick(event.position);

			if (picked?.id === this.entity) {
				this.dragging = true;
				this.map.viewer.scene.screenSpaceCameraController.enableInputs = false;
				this.highlight(true);
			}
		}, Cesium.ScreenSpaceEventType.LEFT_DOWN);

		this.inputHandler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
			if (!this.dragging) {
				return;
			}

			const ray = this.map.viewer.scene.camera.getPickRay(event.endPosition);

			if (!ray) {
				return;
			}

			const displayHeight = this.heightFromRay(ray);

			if (displayHeight === null) {
				return;
			}

			const verticalExaggeration = get(this.map.options.verticalExaggeration);
			const realHeight = displayHeight / verticalExaggeration;
			const span = this.bounds.max.z - this.bounds.min.z;

			const normalizedHeight = (realHeight - this.bounds.min.z) / span;
			const t = clamp({ value: normalizedHeight });

			const z0 = get(this.layer.clipping).z[0];
			this.layer.setClip("z", [Math.min(z0, t), t]);
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

		this.inputHandler.setInputAction(() => {
			if (this.dragging) {
				this.dragging = false;
				this.map.viewer.scene.screenSpaceCameraController.enableInputs = true;
				this.highlight(false);
			}
		}, Cesium.ScreenSpaceEventType.LEFT_UP);
	}

	/**
	 * Intersect the mouse ray with the vertical plane through the voxel volume's center
	 * axis that faces the camera, and return the ECEF height of the hit. Dragging
	 * the mouse up/down then reads as moving the slice plane up/down regardless of
	 * the viewing angle.
	 */
	private heightFromRay(ray: Cesium.Ray): number | null {
		const cameraDirection = this.map.viewer.scene.camera.directionWC;
		const dotUp = Cesium.Cartesian3.dot(cameraDirection, this.up);
		
		const normal = Cesium.Cartesian3.subtract(
			cameraDirection,
			Cesium.Cartesian3.multiplyByScalar(this.up, dotUp, new Cesium.Cartesian3()),
			new Cesium.Cartesian3()
		);

		// Camera looking straight up/down, so ray parallel to the plane, no intersection.
		const epsilon = 1e-6;
		if (Cesium.Cartesian3.magnitude(normal) < epsilon) {
			return null;
		}

		// normalize in place
		Cesium.Cartesian3.normalize(normal, normal);

		const plane = Cesium.Plane.fromPointNormal(this.centerPosition, normal);
		const point = Cesium.IntersectionTests.rayPlane(ray, plane);

		if (!point) {
			return null;
		}

		return Cesium.Cartographic.fromCartesian(point).height;
	}

	private highlight(on: boolean): void {
		if (this.entity?.plane) {
			(this.entity.plane.material as Cesium.GridMaterialProperty).cellAlpha =
				new Cesium.ConstantProperty(on ? 0.4 : 0.1);
		}
	}
}
