// Legend schema for categorical voxel datasets.
// Emitted by the 3dtiles-voxel generation lib alongside the tileset.
// Not part of the 3D Tiles standard.

export type VoxelColor = [number, number, number]; // r,g,b 0-255

export type VoxelPropertyConfig = {
	name: string;
	label?: string;
};

export type VoxelLegendEntry = { index: number; label: string; color: VoxelColor };
export type VoxelLegendForProperty = { nodata?: number; values: Array<VoxelLegendEntry> };
export type VoxelLegend = Record<string, VoxelLegendForProperty>;

export type ResolvedVoxelProperty = {
	name: string;
	label: string;
	categories: Array<{ value: number; label: string; color: VoxelColor }>;
	noData?: number;
};

export async function fetchLegend(legendDataUrl: string | undefined): Promise<VoxelLegend | null> {
	if (!legendDataUrl) {
		return null;
	}

	try {
		const res = await fetch(legendDataUrl);

		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}

		const data: unknown = await res.json();

		if (!isVoxelLegend(data)) {
			console.warn(`fetchLegend: malformed legend at ${legendDataUrl}`);
			return null;
		}

		return data;
	} catch (error) {
		console.warn(`fetchLegend: failed to fetch legend at ${legendDataUrl}:`, error);
		
		return null;
	}
}

export function resolveProperties(
	propConfigs: Array<VoxelPropertyConfig>,
	legend: VoxelLegend | null
): Array<ResolvedVoxelProperty> {
	return propConfigs.map((p) => {
		const legendForProp = legend?.[p.name];

		if (!legendForProp) {
			return { name: p.name, label: p.label ?? p.name, categories: [] };
		}

		return {
			name: p.name,
			label: p.label ?? p.name,
			categories: legendForProp.values.map((v) => ({
				value: v.index,
				label: v.label,
				color: v.color
			})),
			noData: legendForProp.nodata
		};
	});
}

// voxel type guards

function isVoxelColor(x: unknown): x is VoxelColor {
	return Array.isArray(x) && x.length === 3 && x.every((n) => typeof n === "number");
}

function isVoxelLegendEntry(x: unknown): x is VoxelLegendEntry {
	if (!x || typeof x !== "object") {
		return false;
	}

	const e = x as Record<string, unknown>;

	return typeof e.index === "number" && typeof e.label === "string" && isVoxelColor(e.color);
}

function isVoxelLegendForProperty(x: unknown): x is VoxelLegendForProperty {
	if (!x || typeof x !== "object") {
		return false;
	}

	const p = x as Record<string, unknown>;

	if (p.nodata !== undefined && typeof p.nodata !== "number") {
		return false;
	}
	return Array.isArray(p.values) && p.values.every(isVoxelLegendEntry);
}

function isVoxelLegend(x: unknown): x is VoxelLegend {
	if (!x || typeof x !== "object") {
		return false;
	}

	return Object.values(x).every(isVoxelLegendForProperty);
}

