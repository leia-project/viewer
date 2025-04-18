import { CameraLocation } from "$lib/components/map-core/camera-location";
import * as Cesium from "cesium";

export function getCameraPositionFromBoundingSphere(boundingSphere: Cesium.BoundingSphere, use3DMode: boolean = true): CameraLocation {
	const rotationAngle = Math.asin(boundingSphere.radius / Cesium.Cartesian3.magnitude(boundingSphere.center));
	const projectionHorizontalPlane = new Cesium.Cartesian3(boundingSphere.center.x, boundingSphere.center.y, 0);
	const rotationAxis = Cesium.Cartesian3.cross(boundingSphere.center, projectionHorizontalPlane, new Cesium.Cartesian3()); // Vector perpendicular to the bounding sphere vector in the horizontal plane

	const quaternion = Cesium.Quaternion.fromAxisAngle(rotationAxis, rotationAngle, new Cesium.Quaternion());
	const rotationMatrix = Cesium.Matrix3.fromQuaternion(quaternion, new Cesium.Matrix3());

	const rotatedPoint = Cesium.Matrix3.multiplyByVector(rotationMatrix, boundingSphere.center, new Cesium.Cartesian3());
	const cartographicRotated = Cesium.Cartographic.fromCartesian(rotatedPoint);

	if (use3DMode) {
		console.log('3d camera');

		return new CameraLocation(
			cartographicRotated.longitude * 180 / Math.PI,
			cartographicRotated.latitude * 180 / Math.PI,
			cartographicRotated.height + boundingSphere.radius,
			0,      // heading
			-45,    // pitch
			1     // duration
		);
	} else {
		console.log('2d camera');
		const boundingSphereCartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);

		return new CameraLocation(
			Cesium.Math.toDegrees(boundingSphereCartographic.longitude),
			Cesium.Math.toDegrees(boundingSphereCartographic.latitude),
			cartographicRotated.height + boundingSphere.radius,
			0,      // heading
			-90,    // pitch
			1     // duration
		);
	}
}
