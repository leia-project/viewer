import * as Cesium from "cesium";
import MVT from "ol/format/MVT.js";
import { toContext } from "ol/render.js";
import RenderFeature from "ol/render/Feature.js";

import type { StyleFunction } from "ol/style/Style.js";

/* Vector tiles (MVT) as a Cesium imagery layer. Cesium has no usable MVT support
   (MVTDataProvider is experimental and does not draw points on the terrain), so the tiles are
   decoded here, drawn onto a canvas with OpenLayers' render functions, and handed to Cesium as
   a regular image. This is what ol-cesium does (olcs/MVTImageryProvider), but without
   OpenLayers' map and without ol-cesium itself.

   - Tiles of 512 px: features are drawn in 256 units (so line widths match a 256 px tile),
     but on a 2x canvas, so sharper.
   - An image is fixed once drawn: a different style means a new provider. That is why the
     style is an argument, and the decoded tiles can be shared (`featureCache`), so a new
     provider (other style, highlight) does not download anything again.
   - Selection goes through Cesium itself: `pickFeatures` is called with the tile under the
     click, and finds the features at that spot in the decoded geometry. */

const TILE_UNITS = 256; // drawing units per tile
const PIXEL_RATIO = 2; // pixels per unit: 512 px per tile
const TILE_SIZE = TILE_UNITS * PIXEL_RATIO;
const MVT_EXTENT = 4096; // coordinates in an MVT tile run from 0 to 4096
const HIT_TOLERANCE_PX = 6; // this close to a line or point counts as a click on it
const MAX_LEVEL = 18;

/* A distinct property name for the tile layer name, so a property called "layer" is not
   overwritten by it (that is OpenLayers' default name). */
const LAYER_PROPERTY = "_layer";
const format = new MVT({ featureClass: RenderFeature, layerName: LAYER_PROPERTY });

/* What counts as "the same feature" when selecting: the feature id in the tile, otherwise
   its properties. */
export function featureKey(feature: {
	getId(): string | number | undefined;
	getProperties(): object;
}): string {
	const id = feature.getId();
	return id !== undefined ? String(id) : JSON.stringify(feature.getProperties());
}

/* A small LRU cache (the oldest entry is dropped), for the decoded tiles. */
export class LruCache<T> {
	private entries = new Map<string, T>();
	constructor(private readonly size: number) {}

	get(key: string): T | undefined {
		const value = this.entries.get(key);
		if (value !== undefined) {
			this.entries.delete(key);
			this.entries.set(key, value);
		}
		return value;
	}

	set(key: string, value: T): void {
		this.entries.delete(key);
		this.entries.set(key, value);
		if (this.entries.size > this.size) this.entries.delete(this.entries.keys().next().value!);
	}

	delete(key: string): void {
		this.entries.delete(key);
	}
}

export type FeatureCache = LruCache<Promise<RenderFeature[]>>;

export interface MvtImageryProviderOptions {
	/* URL template with {z}, {x} and {y}. */
	url: string;
	/* Headers for each tile request (e.g. an API key). A function, so such a key does not have
	   to be in the visible layer settings. */
	headers?: () => Record<string, string>;
	/* How a feature is drawn; `undefined` = not drawn (and therefore not selectable either). */
	style: StyleFunction;
	/* Decoded tiles, to share with other providers of the same source. */
	featureCache?: FeatureCache;
	/* [west, south, east, north] in degrees: no tiles are requested outside it. */
	extent?: [number, number, number, number];
	/* Deepest level at which tiles are requested; beyond it Cesium stretches the image. */
	maximumLevel?: number;
	/* Reports a tile that could not be loaded or drawn; the tile then stays empty. */
	onError?: (error: Error) => void;
	/* Can features be selected? Not for the highlight layer: it sits on top. */
	pickable?: boolean;
	/* How many levels deeper than the rest of the globe this layer picks its tiles (default 1).
	   Cesium picks the level of an imagery layer per terrain tile, based on the `tileWidth`
	   the provider reports; each step halves that reported width, so Cesium picks one level
	   deeper. Tiles are still drawn at 512 px. Terrain, other imagery layers and 3D tiles are
	   not affected. Each step costs about 4x as many tiles. */
	detail?: number;
}

export class MvtImageryProvider {
	/* What Cesium expects from an imagery provider. */
	readonly tilingScheme = new Cesium.WebMercatorTilingScheme();
	readonly rectangle: Cesium.Rectangle;
	/* What Cesium takes the tile width to be (see `detail`); the canvas is always TILE_SIZE. */
	readonly tileWidth: number;
	readonly tileHeight: number;
	readonly minimumLevel = 0;
	readonly maximumLevel: number;
	readonly hasAlphaChannel = true;
	readonly errorEvent = new Cesium.Event();
	readonly credit = undefined;
	readonly proxy = undefined;
	readonly tileDiscardPolicy = undefined;

	private readonly options: MvtImageryProviderOptions;
	private readonly featureCache: FeatureCache;
	private emptyTile: HTMLCanvasElement | undefined;

	constructor(options: MvtImageryProviderOptions) {
		this.options = options;
		this.featureCache = options.featureCache ?? new LruCache(300);
		this.maximumLevel = options.maximumLevel ?? MAX_LEVEL;
		const detail = Math.max(0, Math.min(3, Math.round(options.detail ?? 1)));
		this.tileWidth = this.tileHeight = TILE_SIZE / 2 ** detail;
		this.rectangle = options.extent
			? Cesium.Rectangle.fromDegrees(...options.extent)
			: this.tilingScheme.rectangle;
	}

	getTileCredits(): Cesium.Credit[] {
		return [];
	}

	requestImage(x: number, y: number, level: number): Promise<HTMLCanvasElement> {
		return this.tileFeatures(level, x, y).then(
			(features) => this.rasterize(features),
			(error) => {
				this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
				return this.empty();
			}
		);
	}

	/* Cesium calls this with the tile (x, y, level) under the click and the position in it. */
	pickFeatures(
		x: number,
		y: number,
		level: number,
		longitude: number,
		latitude: number
	): Promise<Cesium.ImageryLayerFeatureInfo[]> | undefined {
		if (this.options.pickable === false) return undefined;
		return this.tileFeatures(level, x, y).then(
			(features) => {
				const [px, py] = this.tileCoordinates(x, y, level, longitude, latitude);
				return pickAt(features, px, py, HIT_TOLERANCE_PX / PIXEL_RATIO, this.options.style).map(
					toFeatureInfo
				);
			},
			() => []
		);
	}

	/* The decoded features of a tile, from the cache or the server. A failed tile does not stay
	   in the cache: it is retried the next time. */
	private tileFeatures(z: number, x: number, y: number): Promise<RenderFeature[]> {
		const key = `${z}/${x}/${y}`;
		let promise = this.featureCache.get(key);
		if (!promise) {
			promise = this.load(z, x, y);
			this.featureCache.set(key, promise);
			promise.catch(() => this.featureCache.delete(key));
		}
		return promise;
	}

	private async load(z: number, x: number, y: number): Promise<RenderFeature[]> {
		const url = this.options.url
			.replace("{z}", String(z))
			.replace("{x}", String(x))
			.replace("{y}", String(y));
		const response = await fetch(url, { headers: this.options.headers?.() });
		/* A tile without features is not an error: 204, or 404 with some services. */
		if (response.status === 204 || response.status === 404) return [];
		if (!response.ok) throw new Error(`Fetching tile ${z}/${x}/${y} failed: ${response.status}`);
		return decode(await response.arrayBuffer());
	}

	private rasterize(features: RenderFeature[]): HTMLCanvasElement {
		const canvas = document.createElement("canvas");
		const context = toContext(canvas.getContext("2d")!, {
			size: [TILE_UNITS, TILE_UNITS],
			pixelRatio: PIXEL_RATIO
		});
		for (const feature of features) {
			const styles = this.options.style(feature, 1);
			if (!styles) continue;
			for (const style of Array.isArray(styles) ? styles : [styles]) {
				context.setStyle(style);
				context.drawGeometry(feature);
			}
		}
		return canvas;
	}

	private empty(): HTMLCanvasElement {
		if (!this.emptyTile) {
			this.emptyTile = document.createElement("canvas");
			this.emptyTile.width = TILE_SIZE;
			this.emptyTile.height = TILE_SIZE;
		}
		return this.emptyTile;
	}

	/* The position (longitude and latitude, in radians) as drawing units within the tile. */
	private tileCoordinates(
		x: number,
		y: number,
		level: number,
		longitude: number,
		latitude: number
	): [number, number] {
		const tile = this.tilingScheme.tileXYToNativeRectangle(x, y, level);
		const point = this.tilingScheme.projection.project(
			new Cesium.Cartographic(longitude, latitude)
		);
		return [
			((point.x - tile.west) / (tile.east - tile.west)) * TILE_UNITS,
			((tile.north - point.y) / (tile.north - tile.south)) * TILE_UNITS
		];
	}
}

function decode(buffer: ArrayBuffer): RenderFeature[] {
	if (buffer.byteLength === 0) return [];
	const features = format.readFeatures(buffer) as RenderFeature[];
	/* Coordinates arrive in tile units (0..4096); drawing is done in 256. */
	const scale = TILE_UNITS / MVT_EXTENT;
	for (const feature of features) {
		const coordinates = feature.getFlatCoordinates();
		for (let i = 0; i < coordinates.length; i++) coordinates[i] *= scale;
	}
	return features;
}

/* --- Which features are at a position? ------------------------------------------------
   To Cesium a tile is just an image, so the features under the cursor have to come from the
   decoded geometry. Points and lines go before polygons, otherwise the polygon under a road
   always wins and thin lines cannot be selected. */

const RANK = { point: 0, line: 1, polygon: 2 } as const;

function rankOf(type: string): number {
	return type.endsWith("Point")
		? RANK.point
		: type.endsWith("LineString")
			? RANK.line
			: RANK.polygon;
}

/* The parts (lines, rings) of a geometry as [start, end) in the flat coordinate list. */
function parts(coordinates: ArrayLike<number>, ends: number[] | null): [number, number][] {
	const result: [number, number][] = [];
	let start = 0;
	for (const end of ends?.length ? ends : [coordinates.length]) {
		result.push([start, end]);
		start = end;
	}
	return result;
}

function distanceToSegment(
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number
): number {
	const dx = bx - ax;
	const dy = by - ay;
	const lengthSquared = dx * dx + dy * dy;
	const t =
		lengthSquared === 0
			? 0
			: Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/* How far a position is from a feature: 0 inside a polygon, otherwise the distance to the
   nearest point, line segment or polygon edge. */
export function distanceTo(feature: RenderFeature, px: number, py: number): number {
	const type = feature.getType();
	const c = feature.getFlatCoordinates();

	if (type.endsWith("Point")) {
		let min = Infinity;
		for (let i = 0; i + 1 < c.length; i += 2)
			min = Math.min(min, Math.hypot(px - c[i], py - c[i + 1]));
		return min;
	}

	let min = Infinity;
	let inside = false;
	for (const [start, end] of parts(c, feature.getEnds() as number[] | null)) {
		for (let i = start; i + 3 < end; i += 2) {
			min = Math.min(min, distanceToSegment(px, py, c[i], c[i + 1], c[i + 2], c[i + 3]));
		}
		if (type === "Polygon") {
			/* Even-odd over all rings: holes and separate parts of a multipolygon are handled automatically. */
			for (let i = start, j = end - 2; i < end; j = i, i += 2) {
				if (
					c[i + 1] > py !== c[j + 1] > py &&
					px < ((c[j] - c[i]) * (py - c[i + 1])) / (c[j + 1] - c[i + 1]) + c[i]
				) {
					inside = !inside;
				}
			}
		}
	}
	return inside ? 0 : min;
}

/* The features within `tolerance` units of a position that are also drawn (`style` returns
   something), best first: points, then lines (nearest first), then polygons (topmost first). */
export function pickAt(
	features: RenderFeature[],
	px: number,
	py: number,
	tolerance: number,
	style: StyleFunction
): RenderFeature[] {
	const hits: { feature: RenderFeature; rank: number; distance: number; order: number }[] = [];
	features.forEach((feature, order) => {
		const distance = distanceTo(feature, px, py);
		if (distance <= tolerance && style(feature, 1)) {
			hits.push({ feature, rank: rankOf(feature.getType()), distance, order });
		}
	});
	/* For polygons the last one drawn wins, because it is on top. */
	hits.sort(
		(a, b) =>
			a.rank - b.rank || (a.rank === RANK.polygon ? b.order - a.order : a.distance - b.distance)
	);
	return hits.map((hit) => hit.feature);
}

/* A found feature as Cesium and the viewer's feature info expect it. `data.key` is what
   MvtLayer.select needs for the highlight. */
function toFeatureInfo(feature: RenderFeature): Cesium.ImageryLayerFeatureInfo {
	const { [LAYER_PROPERTY]: _tileLayer, ...properties } = feature.getProperties();
	const id = feature.getId();
	const info = new Cesium.ImageryLayerFeatureInfo();
	/* `properties` is missing from Cesium's typings, but the viewer's feature info reads it. */
	(info as unknown as { properties: object }).properties = {
		...(id !== undefined ? { id } : {}),
		...properties
	};
	info.name = String(properties["name"] ?? id ?? "");
	info.data = { key: featureKey(feature) };
	return info;
}
