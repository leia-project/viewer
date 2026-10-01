import { get } from "svelte/store";
import * as Cesium from "cesium";

import type { Map } from "./map";
import { NAP_OFFSET_M } from "./depth-scale";

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
 * Makes a tileset follow map.options.subsurfaceExaggeration: an affine stretch
 * away from NAP 0 (NAP_OFFSET_M), identical to the voxel layer's, so equal NAP
 * depths render at equal heights across all subsurface layers while the
 * terrain is untouched. Columns on terrain above NAP 0 rise proportionally
 * above the surface by design.
 *
 * Also renders the tileset unlit and without shadows: subsurface datasets are
 * categorical soil colours, and lighting would distort them (stretching also
 * skews normals). The lighting model has to live on the same CustomShader as
 * the stretch, since a tileset holds a single custom shader.
 *
 * Returns a dispose function that stops following the exaggeration stores.
 */
export function applySubsurfaceExaggeration(map: Map, tileset: Cesium.Cesium3DTileset): () => void {
	tileset.shadows = Cesium.ShadowMode.DISABLED;

	const shader = new Cesium.CustomShader({
		lightingModel: Cesium.LightingModel.UNLIT,
		uniforms: {
			u_exaggeration: { type: Cesium.UniformType.FLOAT, value: 1 },
			u_pivot: { type: Cesium.UniformType.FLOAT, value: NAP_OFFSET_M }
		},
		vertexShaderText: SUBSURFACE_EXAGGERATION_VS
	});
	tileset.customShader = shader;

	const apply = () => {
		const subExag = get(map.options.subsurfaceExaggeration) || 1;
		const vertExag = get(map.options.verticalExaggeration) || 1;
		shader.setUniform("u_exaggeration", subExag);
		// The scene VE stage has already scaled heights when this shader runs.
		shader.setUniform("u_pivot", NAP_OFFSET_M * vertExag);
		map.refresh();
	};

	const unsubscribers = [
		map.options.subsurfaceExaggeration.subscribe(apply),
		map.options.verticalExaggeration.subscribe(apply)
	];

	return () => unsubscribers.forEach((unsub) => unsub());
}
