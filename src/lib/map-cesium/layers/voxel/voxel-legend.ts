// Legend for categorical voxel datasets, read from the tileset's 3D Metadata
// schema. A property points at an enum whose values carry the label and an
// RGB color in `extras.color`
// https://docs.ogc.org/cs/22-025r4/22-025r4.html#metadata-enum

import * as Cesium from "cesium";

export type VoxelColor = [r: number, g: number, b: number]; // 0-255

export type VoxelPropertyConfig = {
	name: string;
	label?: string;
};

export type ResolvedVoxelProperty = {
	name: string;
	label: string;
	categories: Array<{ value: number; label: string; color: VoxelColor }>;
	noData?: number;
};

export function voxelSchema(provider: Cesium.Cesium3DTilesVoxelProvider): Cesium.MetadataSchema | undefined {
	const schema = (provider as unknown as { _implicitTileset?: { metadataSchema?: unknown } })._implicitTileset
		?.metadataSchema;

	if (schema instanceof Cesium.MetadataSchema) {
		return schema;
	}

	console.warn("voxelSchema: Cesium does not expose the voxel metadata schema, the legend stays empty");

	return undefined;
}

export function resolveProperties(
	propConfigs: Array<VoxelPropertyConfig>,
	schema: Cesium.MetadataSchema | undefined,
	className: string
): Array<ResolvedVoxelProperty> {
	const properties = schema?.classes[className]?.properties;

	return propConfigs.map((p) => {
		const label = p.label ?? p.name;
		const property = properties?.[p.name];
		// CesiumJS cannot render ENUM voxel properties (yet), so a SCALAR UINT8 property
		// points at its enum in extras instead
		const enumId = property?.extras?.enumType;
		const enumValues = typeof enumId === "string" ? schema?.enums[enumId]?.values : undefined;

		if (!property || !enumValues) {
			return { name: p.name, label, categories: [] };
		}

		return {
			name: p.name,
			label,
			categories: enumValues.flatMap((v) => {
				const color = v.extras?.color;

				return isVoxelColor(color) ? [{ value: v.value, label: v.description ?? v.name, color }] : [];
			}),
			noData: typeof property.noData === "number" ? property.noData : undefined
		};
	});
}

function isVoxelColor(x: unknown): x is VoxelColor {
	return Array.isArray(x) && x.length === 3 && x.every((n) => typeof n === "number");
}
