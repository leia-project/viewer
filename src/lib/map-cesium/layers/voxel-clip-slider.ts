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
 * VoxelPrimitive supports ClippingPlaneCollection but we clip through
 * min/maxClippingBounds instead. The range sliders in the layer controls
 * already use a normalised clip window. The drag writes into the same 
 * `clipping` store via {@link VoxelLayer.setClip}("z", …), so plane and
 * sliders stay in sync.
 *
 * The clip window stays in normalised units which survive exaggeration
 * changes. Heights are only mapped through the subsurface exaggeration when
 * positioning the plane entity and reading the drag
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
	private dragAnchor: Cesium.Cartesian3 | null = null;
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

		// Voxel provider bounds are geographic. x = lon (rad), y = lat (rad), z = height (m)
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
		return this.layer.stretchZ(this.currentHeight());
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
				const ray = this.map.viewer.scene.camera.getPickRay(event.position);
				const slicePlane = Cesium.Plane.fromPointNormal(
					Cesium.Cartesian3.fromRadians(this.centerLon, this.centerLat, this.displayHeight()),
					this.up
				);
				this.dragAnchor = (ray && Cesium.IntersectionTests.rayPlane(ray, slicePlane)) ?? null;

				if (!this.dragAnchor) {
					return;
				}

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

			const realHeight = this.layer.unstretchZ(displayHeight);
			const span = this.bounds.max.z - this.bounds.min.z;

			const normalizedHeight = (realHeight - this.bounds.min.z) / span;
			const t = clamp({ value: normalizedHeight });

			const z0 = get(this.layer.clipping).z[0];
			this.layer.setClip("z", [Math.min(z0, t), t]);
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

		this.inputHandler.setInputAction(() => {
			if (this.dragging) {
				this.dragging = false;
				this.dragAnchor = null;
				this.map.viewer.scene.screenSpaceCameraController.enableInputs = true;
				this.highlight(false);
			}
		}, Cesium.ScreenSpaceEventType.LEFT_UP);
	}

	/**
	 * Intersect the mouse ray with the camera-facing vertical plane through the
	 * grabbed point, and return the ECEF height of the hit. Dragging the mouse
	 * up/down then reads as moving the slice plane up/down regardless of the
	 * viewing angle, with the grabbed point staying under the cursor.
	 */
	private heightFromRay(ray: Cesium.Ray): number | null {
		if (!this.dragAnchor) {
			return null;
		}

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

		const plane = Cesium.Plane.fromPointNormal(this.dragAnchor, normal);
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
