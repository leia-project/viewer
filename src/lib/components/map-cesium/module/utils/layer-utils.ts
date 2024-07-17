import { CameraLocation } from "$lib/components/map-core/camera-location";
import * as Cesium from "cesium";


export function getCameraPositionFromBoundingSphere(boundingSphere: Cesium.BoundingSphere): CameraLocation {
	// Get the bounding sphere center and rotate it to the south until the edge of the bounding sphere:
	const rotationAngle = Math.asin(boundingSphere.radius / Cesium.Cartesian3.magnitude(boundingSphere.center));
	const projectionHorizontalPlane = new Cesium.Cartesian3(boundingSphere.center.x, boundingSphere.center.y, 0);
	const rotationAxis = Cesium.Cartesian3.cross(boundingSphere.center, projectionHorizontalPlane, new Cesium.Cartesian3()); // Vector perpendicular to the bounding sphere vector in the horizontal plane

	const quaternion = Cesium.Quaternion.fromAxisAngle(rotationAxis, rotationAngle, new Cesium.Quaternion());
	const rotationMatrix = Cesium.Matrix3.fromQuaternion(quaternion, new Cesium.Matrix3());

	const rotatedPoint = Cesium.Matrix3.multiplyByVector(rotationMatrix, boundingSphere.center, new Cesium.Cartesian3());
	const cartographicRotated = Cesium.Cartographic.fromCartesian(rotatedPoint);
	
	return new CameraLocation(
		cartographicRotated.longitude * 180 / Math.PI,
		cartographicRotated.latitude * 180 / Math.PI,
		cartographicRotated.height + boundingSphere.radius,
		0,      // heading
		-45,    // pitch
		1.5     // duration
	);
}