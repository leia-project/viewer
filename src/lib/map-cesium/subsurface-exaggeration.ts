import { type Readable, derived } from "svelte/store";
import * as Cesium from "cesium";

import type { Map } from "./map";
import type { Layer } from "$lib/map-core/layer";
import type { LayerConfig } from "$lib/map-core/layer-config";

/** Vertical reference heights are given in: its label name and the ellipsoidal
 * height of its 0 (the project area's geoid separation). */
export interface VerticalDatum {
	name: string;
	offset: number;
}

/** NAP, for configs without `verticalDatum` */
export const DEFAULT_VERTICAL_DATUM: VerticalDatum = { name: "NAP", offset: 44.335 };

/**
 * `verticalDatum` from config over DEFAULT_VERTICAL_DATUM. Missing or invalid
 * fields keep the default (invalid ones warn), so a bad offset can't NaN every
 * height. The offset may use a decimal comma, e.g. "43,5".
 */
export function parseVerticalDatum(value: unknown): VerticalDatum {
	if (value === undefined) {
		return DEFAULT_VERTICAL_DATUM;
	}

	if (typeof value !== "object" || value === null) {
		console.warn("verticalDatum: expected { name, offset }, using the default", value);
		return DEFAULT_VERTICAL_DATUM;
	}

	const { name, offset } = value as { name?: unknown; offset?: unknown };
	const datum = { ...DEFAULT_VERTICAL_DATUM };

	if (name !== undefined) {
		if (typeof name === "string" && name.trim() !== "") {
			datum.name = name.trim();
		} else {
			console.warn("verticalDatum: name must be a non-empty string, using the default", name);
		}
	}

	if (offset === undefined && datum.name !== DEFAULT_VERTICAL_DATUM.name) {
		console.warn(
			`verticalDatum: no offset for "${datum.name}", using the ${DEFAULT_VERTICAL_DATUM.name} offset of ${DEFAULT_VERTICAL_DATUM.offset} m`
		);
	}

	if (offset !== undefined) {
		const parsed = typeof offset === "string" ? Number(offset.replace(",", ".")) : offset;

		if (typeof parsed === "number" && Number.isFinite(parsed)) {
			datum.offset = parsed;
		} else {
			console.warn("verticalDatum: offset must be a finite number, using the default", offset);
		}
	}

	return datum;
}

/** A height relative to the datum as a label, eg "-12.5m NAP" */
export function formatDatumHeight(z: number, datum: VerticalDatum): string {
	const rounded = Math.round(z * 10) / 10; // round to decimeters
	const sign = rounded > 0 ? "+" : "";

	return `${sign}${rounded}m ${datum.name}`;
}

/** Height Cesium's scene-wide vertical exaggeration stretches away from
 * (scene.verticalExaggerationRelativeHeight), which we leave at Cesium's default. */
const SCENE_EXAGGERATION_PIVOT = 0;

/** The stretch behind both exaggerations: heights move away from `pivot` by
 * `factor`. SUBSURFACE_EXAGGERATION_VS is its GLSL twin. */
function exaggerateHeight(height: number, pivot: number, factor: number): number {
	return pivot + factor * (height - pivot);
}

/** Inverse of {@link exaggerateHeight} */
function unexaggerateHeight(height: number, pivot: number, factor: number): number {
	return pivot + (height - pivot) / factor;
}

export interface ExaggerationFactors {
	subsurface: number;
	scene: number;
	/** Ellipsoidal height of datum 0, the subsurface stretch's pivot */
	pivot: number;
}

/** True ellipsoidal height to subsurface-stretched height, before the scene-wide exaggeration */
export function toSubsurfaceHeight(
	height: number,
	{ subsurface, pivot }: Pick<ExaggerationFactors, "subsurface" | "pivot">
): number {
	return exaggerateHeight(height, pivot, subsurface);
}

/** True ellipsoidal height to rendered height: subsurface stretch, then the scene-wide one */
export function toRenderedHeight(height: number, factors: ExaggerationFactors): number {
	return exaggerateHeight(toSubsurfaceHeight(height, factors), SCENE_EXAGGERATION_PIVOT, factors.scene);
}

/** Inverse of {@link toRenderedHeight} */
export function fromRenderedHeight(rendered: number, { subsurface, scene, pivot }: ExaggerationFactors): number {
	return unexaggerateHeight(unexaggerateHeight(rendered, SCENE_EXAGGERATION_PIVOT, scene), pivot, subsurface);
}

/** Whether a layer should respond to the subsurface exaggeration slider, driven
 * by `settings.subsurface`. Voxel layers default to subsurface for now, 3D Tiles layers opt in */
export function appliesSubsurfaceExaggeration(config: LayerConfig): boolean {
	return config.settings?.subsurface ?? config.type === "3dtiles-voxel";
}

/** Derived store that is true while at least one subsurface-exaggeration layer
 * is visible */
export function anySubsurfaceLayerVisible(layers: Readable<Array<Layer>>): Readable<boolean> {
	return derived(
		layers,
		(layers, set: (value: boolean) => void) => {
			const subsurface = layers.filter((layer) => appliesSubsurfaceExaggeration(layer.config));
			if (subsurface.length === 0) {
				set(false);
				return;
			}
			return derived(
				subsurface.map((layer) => layer.visible),
				(visibilities) => visibilities.some(Boolean)
			).subscribe(set);
		},
		false
	);
}

/**
 * Stretches a tileset vertically to exaggerate the subsurface.
 *
 * The shader math is copied from Cesium's built-in vertical-exaggeration shader,
 * VerticalExaggerationStageVS:
 * https://github.com/CesiumGS/cesium/blob/1.140/packages/engine/Source/Shaders/Model/VerticalExaggerationStageVS.glsl
 *
 * The difference: Cesium's version stretches the whole scene at once. This one
 * is fed our own uniforms (u_exaggeration, u_pivot) so it stretches only this
 * tileset and leaves the terrain alone. Every vertex is pushed up or down along
 * the "up" direction, away from the pivot height, scaled by the exaggeration.
 *
 * The bulk of the shader is just working out each vertex's height above the
 * ellipsoid and its up-direction. It does this relative to the camera (the
 * czm_eyeEllipsoid* uniforms) rather than from absolute Earth coordinates,
 * because absolute coordinates are too large to compute accurately in 32-bit
 * float precision on the GPU. This is Cesium's trick, kept as-is.
 *
 * Two things about when this runs:
 * - It runs after Cesium's instancing stage, so positionMC is already the
 *   vertex placed at its real-world location.
 * - It runs after Cesium's own scene exaggeration, which has already scaled
 *   heights. So u_pivot must be passed in already scaled too (pivot × scene
 *   exaggeration), otherwise the pivot wouldn't line up with the stretched
 *   geometry.
 */
const SUBSURFACE_EXAGGERATION_VS = /* glsl */`
void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
	vec3 positionMC = vsInput.attributes.positionMC;

	// Distance from the camera to the local center of ellipsoid curvature.
	vec4 positionENU = czm_modelToEnu * vec4(positionMC, 1.0);
	vec2 azimuth = normalize(positionENU.xy);
	float azimuthalCurvature = dot(azimuth * azimuth, czm_eyeEllipsoidCurvature);
	float eyeToCenter = 1.0 / azimuthalCurvature + czm_eyeHeight;

	// Approximate the ellipsoid normal at the vertex position, using a
	// circular approximation for the Earth curvature along the geodesic.
	vec3 positionEC = (czm_modelView * vec4(positionMC, 1.0)).xyz;
	vec3 centerToVertex = eyeToCenter * czm_eyeEllipsoidNormalEC + positionEC;
	vec3 vertexNormalEC = normalize(centerToVertex);

	// Approximate the height above the ellipsoid from the camera height and
	// the versine of the angular distance between camera and vertex.
	float verticalDistance = dot(positionEC, czm_eyeEllipsoidNormalEC);
	float horizontalDistance = length(positionEC - verticalDistance * czm_eyeEllipsoidNormalEC);
	float sinTheta = horizontalDistance / (eyeToCenter + verticalDistance);
	bool isSmallAngle = clamp(sinTheta, 0.0, 0.05) == sinTheta;
	float exactVersine = 1.0 - dot(czm_eyeEllipsoidNormalEC, vertexNormalEC);
	float smallAngleVersine = 0.5 * sinTheta * sinTheta;
	float versine = isSmallAngle ? smallAngleVersine : exactVersine;
	float dHeight = dot(positionEC, vertexNormalEC) - eyeToCenter * versine;
	float vertexHeight = czm_eyeHeight + dHeight;

	vec3 vertexNormalMC = normalize((czm_inverseModelView * vec4(vertexNormalEC, 0.0)).xyz);
	float stretch = (vertexHeight - u_pivot) * (u_exaggeration - 1.0);
	vsOutput.positionMC = positionMC + stretch * vertexNormalMC;
}
`;

/**
 * Makes a tileset follow map.options.exaggeration: the same stretch about datum 0
 * as the voxels, so equal depths line up across subsurface layers.
 *
 * Also renders it unlit and without shadows, since lighting distorts categorical
 * soil colours (and stretching skews normals). That has to live on the same
 * CustomShader, as a tileset holds only one.
 *
 * Returns a dispose function.
 */
export function applySubsurfaceExaggeration(map: Map, tileset: Cesium.Cesium3DTileset): () => void {
	tileset.shadows = Cesium.ShadowMode.DISABLED;

	const shader = new Cesium.CustomShader({
		lightingModel: Cesium.LightingModel.UNLIT,
		uniforms: {
			u_exaggeration: { type: Cesium.UniformType.FLOAT, value: 1 },
			u_pivot: { type: Cesium.UniformType.FLOAT, value: 0 }
		},
		vertexShaderText: SUBSURFACE_EXAGGERATION_VS
	});
	tileset.customShader = shader;

	return map.options.exaggeration.subscribe((factors) => {
		shader.setUniform("u_exaggeration", factors.subsurface);
		// The scene stage already scaled heights, so pass the pivot at its rendered height
		shader.setUniform("u_pivot", toRenderedHeight(factors.pivot, factors));
		map.refresh();
	});
}
