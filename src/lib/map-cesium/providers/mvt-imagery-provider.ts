import * as Cesium from "cesium";
import MVT from "ol/format/MVT.js";
import { toContext } from "ol/render.js";
import RenderFeature from "ol/render/Feature.js";
import Style, { type StyleFunction } from "ol/style/Style.js";

/* Vector tiles (MVT) as a Cesium imagery layer. Cesium has no usable MVT support
   (MVTDataProvider is experimental and does not drape points on the terrain), so the tiles are
   decoded with OpenLayers, drawn onto a canvas with OpenLayers' render functions, and handed to
   Cesium as a regular image.

   - An image is fixed once drawn: a different style means a new provider. Providers of the
     same layer share their decoded tiles (`cache`), so a new provider fetches nothing again.
   - Clicking goes through Cesium: it calls `pickFeatures` with the tile under the click, which
     looks the features up in the decoded geometry. */

const TILE_UNITS = 256; // drawing units per tile, so line widths match a 256 px tile
const PIXEL_RATIO = 2; // drawn at 512 px, so the tiles stay sharp
const MVT_EXTENT = 4096; // coordinates in an MVT tile run from 0 to 4096
const HIT_TOLERANCE = 3; // in drawing units: this close to a line or point counts as a hit
const CACHE_SIZE = 300; // decoded tiles kept per layer

/* The feature property that holds the name of the tile layer. This is OpenLayers' default, and
   where a Mapbox style (see mvt-gl-style) looks for it. */
const LAYER_PROPERTY = "mvt:layer";
const format = new MVT({ featureClass: RenderFeature, layerName: LAYER_PROPERTY });

/* Decoded tiles by "z/x/y". */
export type TileCache = Map<string, RenderFeature[]>;

/* What counts as "the same feature" for the highlight: its id, otherwise its properties. */
export function featureKey(feature: {
	getId(): string | number | undefined;
	getProperties(): object;
}): string {
	const id = feature.getId();
	return id !== undefined ? String(id) : JSON.stringify(feature.getProperties());
}

export interface MvtImageryProviderOptions {
	url: string; // URL template with {z}, {x} and {y}
	headers?: () => Record<string, string>; // for each tile request, e.g. an API key
	style: StyleFunction; // returns nothing for a feature that should not be drawn
	cache: TileCache;
	extent?: [number, number, number, number]; // [west, south, east, north] in degrees
	maximumLevel?: number; // deeper than this, Cesium stretches the tiles of this level
	minimumDataLevel?: number; // shallower than this the service has no data: nothing is requested
	pickable: boolean; // false for the highlight layer, which sits on top of the layer itself
	onError: (error: unknown) => void;
}

export class MvtImageryProvider {
	/* What Cesium expects from an imagery provider. The canvas is 512 px, but Cesium is told
	   256: it picks the tile level from this width, so it picks one level finer, which keeps
	   lines and labels sharp. */
	readonly tilingScheme = new Cesium.WebMercatorTilingScheme();
	readonly rectangle: Cesium.Rectangle;
	readonly tileWidth = TILE_UNITS;
	readonly tileHeight = TILE_UNITS;
	readonly minimumLevel = 0;
	readonly maximumLevel: number;
	readonly hasAlphaChannel = true;
	readonly errorEvent = new Cesium.Event();

	private emptyTile: HTMLCanvasElement | undefined;

	constructor(private readonly options: MvtImageryProviderOptions) {
		this.maximumLevel = options.maximumLevel ?? 18;
		this.rectangle = options.extent
			? Cesium.Rectangle.fromDegrees(...options.extent)
			: this.tilingScheme.rectangle;
	}

	getTileCredits(): Cesium.Credit[] {
		return [];
	}

	/* `request` comes from Cesium, which uses it to limit the number of requests per server
	   (shared with e.g. terrain from the same server) and to cancel requests for tiles that are
	   no longer needed. Returning undefined means "too many requests, ask again later". */
	requestImage(
		x: number,
		y: number,
		level: number,
		request?: Cesium.Request
	): Promise<HTMLCanvasElement> | undefined {
		if (level < (this.options.minimumDataLevel ?? 0)) return Promise.resolve(this.empty());
		return this.tileFeatures(level, x, y, request)?.then(
			(features) => this.draw(features, level),
			(error) => {
				/* Rejecting a cancelled request makes Cesium ask again when it needs the tile. */
				if (request?.state === Cesium.RequestState.CANCELLED) throw error;
				this.options.onError(error);
				return this.empty();
			}
		);
	}

	/* Cesium calls this on a click, with the tile under it and the position (in radians). */
	pickFeatures(
		x: number,
		y: number,
		level: number,
		longitude: number,
		latitude: number
	): Promise<Cesium.ImageryLayerFeatureInfo[]> | undefined {
		if (!this.options.pickable || level < (this.options.minimumDataLevel ?? 0)) return undefined;
		const [px, py] = this.tileCoordinates(x, y, level, longitude, latitude);
		return this.tileFeatures(level, x, y)?.then(
			(features) =>
				pickAt(features, px, py, (feature) => this.options.style(feature, resolution(level))).map(
					toFeatureInfo
				),
			() => []
		);
	}

	/* The decoded features of a tile, from the cache or the server. */
	private tileFeatures(
		z: number,
		x: number,
		y: number,
		request?: Cesium.Request
	): Promise<RenderFeature[]> | undefined {
		const key = `${z}/${x}/${y}`;
		const cached = this.options.cache.get(key);
		if (cached) return Promise.resolve(cached);

		const url = this.options.url
			.replace("{z}", String(z))
			.replace("{x}", String(x))
			.replace("{y}", String(y));
		const response = new Cesium.Resource({
			url,
			headers: this.options.headers?.(),
			request
		}).fetchArrayBuffer();
		if (!response) return undefined;

		return response
			.then(
				/* An empty tile may come back as 204 (no buffer) or 404. */
				(buffer) => (buffer ? decode(buffer) : []),
				(error) => {
					if (error?.statusCode === 404) return [];
					throw error;
				}
			)
			.then((features) => {
				const cache = this.options.cache;
				cache.set(key, features);
				if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
				return features;
			});
	}

	private draw(features: RenderFeature[], level: number): HTMLCanvasElement {
		const canvas = document.createElement("canvas");
		const context = toContext(canvas.getContext("2d")!, {
			size: [TILE_UNITS, TILE_UNITS],
			pixelRatio: PIXEL_RATIO
		});

		/* First style all features, then draw in zIndex order: a Mapbox style uses it for its
		   layer order (all fills, then all outlines, then labels). */
		const draws: { style: Style; geometry: RenderFeature }[] = [];
		for (const feature of features) {
			const styles = this.options.style(feature, resolution(level));
			if (!styles) continue;
			for (const style of Array.isArray(styles) ? styles : [styles]) {
				/* A style may draw at a geometry of its own, e.g. a label at a point of a polygon. */
				const geometry = style.getGeometryFunction()(feature) as RenderFeature | undefined;
				if (geometry) draws.push({ style: copy(style), geometry });
			}
		}
		draws.sort((a, b) => (a.style.getZIndex() ?? 0) - (b.style.getZIndex() ?? 0));

		for (const { style, geometry } of draws) {
			context.setStyle(style);
			context.drawGeometry(geometry);
		}
		return canvas;
	}

	private empty(): HTMLCanvasElement {
		if (!this.emptyTile) {
			this.emptyTile = document.createElement("canvas");
			this.emptyTile.width = this.emptyTile.height = TILE_UNITS * PIXEL_RATIO;
		}
		return this.emptyTile;
	}

	/* A position (in radians) as drawing units within a tile. */
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

/* The map resolution of a tile level, as style functions expect it. That of a 512 px tile, so
   the zoom a Mapbox style derives from it equals the tile level. */
function resolution(level: number): number {
	return 78271.51696402048 / 2 ** level;
}

/* A copy of a style. Style functions may reuse their Style objects for the next feature
   (ol-mapbox-style does: it sets new colours on the same Fill and Stroke), while the drawing
   only starts after all features have been styled. The image (icon, circle) is not copied:
   those are not changed afterwards. */
function copy(style: Style): Style {
	return new Style({
		fill: style.getFill()?.clone(),
		stroke: style.getStroke()?.clone(),
		text: style.getText()?.clone(),
		image: style.getImage() ?? undefined,
		zIndex: style.getZIndex()
	});
}

function decode(buffer: ArrayBuffer): RenderFeature[] {
	if (buffer.byteLength === 0) return [];
	const features = format.readFeatures(buffer) as RenderFeature[];
	/* From tile coordinates (0-4096) to drawing units (0-256). */
	for (const feature of features) {
		const coordinates = feature.getFlatCoordinates();
		for (let i = 0; i < coordinates.length; i++) coordinates[i] *= TILE_UNITS / MVT_EXTENT;
	}
	return features;
}

/* --- Which features are at a position? ---------------------------------------------------- */

/* The drawn features (`isDrawn`) near a position, best match first: points, then lines (the
   nearest first), then polygons (the topmost first). Otherwise the polygon under a road would
   always win, and thin lines could not be clicked at all. */
function pickAt(
	features: RenderFeature[],
	px: number,
	py: number,
	isDrawn: (feature: RenderFeature) => unknown
): RenderFeature[] {
	const rank = (feature: RenderFeature) => {
		const type = feature.getType();
		return type.endsWith("Point") ? 0 : type.endsWith("LineString") ? 1 : 2;
	};
	return features
		.map((feature, order) => ({
			feature,
			order,
			rank: rank(feature),
			distance: distanceTo(feature, px, py)
		}))
		.filter((hit) => hit.distance <= HIT_TOLERANCE && isDrawn(hit.feature))
		.sort((a, b) => a.rank - b.rank || (a.rank === 2 ? b.order - a.order : a.distance - b.distance))
		.map((hit) => hit.feature);
}

/* The distance from a position to a feature: 0 inside a polygon, otherwise the distance to the
   nearest point, line segment or polygon edge. */
function distanceTo(feature: RenderFeature, px: number, py: number): number {
	const c = feature.getFlatCoordinates();
	if (feature.getType().endsWith("Point")) {
		let min = Infinity;
		for (let i = 0; i < c.length; i += 2) min = Math.min(min, Math.hypot(px - c[i], py - c[i + 1]));
		return min;
	}

	let min = Infinity;
	let inside = false;
	let start = 0;
	/* `ends`: where each line or ring ends in the flat coordinate list. */
	const ends = feature.getEnds() as number[] | null;
	for (const end of ends?.length ? ends : [c.length]) {
		for (let i = start; i + 3 < end; i += 2) {
			min = Math.min(min, distanceToSegment(px, py, c[i], c[i + 1], c[i + 2], c[i + 3]));
		}
		if (feature.getType() === "Polygon") {
			/* Even-odd rule over all rings, which takes care of holes. */
			for (let i = start, j = end - 2; i < end; j = i, i += 2) {
				const crosses = c[i + 1] > py !== c[j + 1] > py;
				if (crosses && px < ((c[j] - c[i]) * (py - c[i + 1])) / (c[j + 1] - c[i + 1]) + c[i]) {
					inside = !inside;
				}
			}
		}
		start = end;
	}
	return inside ? 0 : min;
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

/* A feature as Cesium and the viewer's feature info expect it. `data.key` is what
   MvtLayer.select needs for the highlight. */
function toFeatureInfo(feature: RenderFeature): Cesium.ImageryLayerFeatureInfo {
	/* Leave out what OpenLayers and ol-mapbox-style add to the properties. */
	const {
		[LAYER_PROPERTY]: _layer,
		"mapbox-layer": _styleLayer,
		...properties
	} = feature.getProperties();
	const id = feature.getId();
	const info = new Cesium.ImageryLayerFeatureInfo();
	/* `properties` is missing from Cesium's typings, but the viewer's feature info reads it. */
	(info as unknown as { properties: object }).properties = {
		...(id !== undefined && { id }),
		...properties
	};
	info.name = String(properties["name"] ?? id ?? "");
	info.data = { key: featureKey(feature) };
	return info;
}
