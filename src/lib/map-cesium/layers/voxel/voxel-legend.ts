// Legend for categorical voxel datasets, read from the tileset's 3D Metadata
// schema. A property points at an enum whose values carry the label and an
// RGB color in `extras.color`
// https://docs.ogc.org/cs/22-025r4/22-025r4.html#metadata-enum

export type VoxelColor = [r: number, g: number, b: number]; // 0-255

export type VoxelPropertyConfig = {
	name: string;
	label?: string;
};

type SchemaEnumValue = {
	value: number;
	name: string;
	description?: string;
	extras?: { color?: unknown };
};

type SchemaProperty = {
	noData?: unknown;
	/** Set when the property is `type: "ENUM"` */
	enumType?: string;
	/** CesiumJS cannot render ENUM voxel properties, so a SCALAR UINT8 property
	 * points at its enum here instead */
	extras?: { enumType?: unknown };
};

export type VoxelSchema = {
	enums?: Record<string, { values: Array<SchemaEnumValue> }>;
	classes: Record<string, { properties?: Record<string, SchemaProperty> }>;
};

/** The voxel class of the tileset with the schema it is defined in. */
export type VoxelMetadata = { schema: VoxelSchema; className: string };

export type ResolvedVoxelProperty = {
	name: string;
	label: string;
	categories: Array<{ value: number; label: string; color: VoxelColor }>;
	noData?: number;
};

/** Fetches the metadata schema of a voxel tileset, inline or from `schemaUri`. */
export async function fetchVoxelMetadata(tilesetUrl: string): Promise<VoxelMetadata | null> {
	try {
		const tileset = await fetchJson(tilesetUrl);
		const className = tileset?.root?.content?.extensions?.["3DTILES_content_voxels"]?.class;
		// The schema is inline or in its own file, at a URI relative to the tileset
		const tilesetLocation = new URL(tilesetUrl, location.href);
		const schema = tileset.schemaUri
			? await fetchJson(new URL(tileset.schemaUri, tilesetLocation))
			: tileset.schema;

		if (typeof className !== "string" || !isVoxelSchema(schema)) {
			console.warn(`fetchVoxelMetadata: no voxel schema in ${tilesetUrl}`);
			return null;
		}

		return { schema, className };
	} catch (error) {
		console.warn(`fetchVoxelMetadata: failed to fetch schema of ${tilesetUrl}:`, error);

		return null;
	}
}

export function resolveProperties(
	propConfigs: Array<VoxelPropertyConfig>,
	metadata: VoxelMetadata | null
): Array<ResolvedVoxelProperty> {
	return propConfigs.map((p) => {
		const label = p.label ?? p.name;
		const property = metadata?.schema.classes[metadata.className]?.properties?.[p.name];
		const enumId = property?.enumType ?? property?.extras?.enumType;
		const enumValues = typeof enumId === "string" ? metadata?.schema.enums?.[enumId]?.values : undefined;

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

async function fetchJson(url: string | URL): Promise<any> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	return response.json();
}

function isVoxelColor(x: unknown): x is VoxelColor {
	return Array.isArray(x) && x.length === 3 && x.every((n) => typeof n === "number");
}

function isSchemaEnumValue(x: unknown): x is SchemaEnumValue {
	if (!x || typeof x !== "object") {
		return false;
	}

	const v = x as Record<string, unknown>;

	return typeof v.value === "number" && typeof v.name === "string";
}

function isVoxelSchema(x: unknown): x is VoxelSchema {
	if (!x || typeof x !== "object") {
		return false;
	}

	const s = x as Record<string, unknown>;

	if (!s.classes || typeof s.classes !== "object") {
		return false;
	}

	if (s.enums === undefined) {
		return true;
	}

	return (
		typeof s.enums === "object" &&
		s.enums !== null &&
		Object.values(s.enums).every(
			(e) => Array.isArray((e as { values?: unknown })?.values) && e.values.every(isSchemaEnumValue)
		)
	);
}
