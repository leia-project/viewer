import type { Unsubscriber } from "svelte/store";
import * as Cesium from "cesium";
import type { Map } from "../map";
import * as turf from "@turf/turf";
import { Undefined } from "carbon-icons-svelte";


interface OgcFeaturesTile {
	x: number;
	y: number;
	center: Cesium.Cartesian3;
	primitives: Array<Cesium.Primitive | Cesium.GroundPrimitive | Cesium.GroundPolylinePrimitive>;
	ids: Array<string>;
	size: number;
	destroyed: boolean;
}

interface Collection {
	id: string;
	title: string;
	description?: string;
	extent: {
		spatial: {
			bbox: Array<[number, number, number, number]>;
		}
	}
}

interface OgcFeaturesConstructorOptions {
	collectionId: string;
	heightStartLoading: number;
	tileWidth: number;
	cacheBuster: number;
	allowPicking: boolean;
}


/**
 * Represents a provider that draws Cesium primitives from geometrical features
 * retrieved from a OGC API - Features server.
 * 
 * This class is initialized with the URL of the Features service and optional parameters
 * for controlling the loading and display of the Features features.
 * 
 * @class OgcFeaturesProviderCesium
 * @param {string} url - The URL of the Features service.
 * @param {number} heightStartLoading - The height at which to start loading the tiles.
 * @param {number} [tileWidth=256] - The width of the tiles in pixels. Defaults to 256.
 * @param {number} [cacheBuster=4000] - Optional parameter to force the refresh of the tiles. Defaults to 4000.
 */

export class OgcFeaturesProviderCesium {

	public map: Map;
	private url: string;
	public options: Partial<OgcFeaturesConstructorOptions>;
	public parameters: Record<string, string> | undefined;

	private collectionId: string;
	private collection: Collection | undefined = undefined;
	private availableCollections: Array<Collection> = [];
	private outputFormat: string | undefined = "json";
	public maxFeatures: number = 1000;
	public boundingRect: Cesium.Rectangle = Cesium.Rectangle.MAX_VALUE;

	public dynamicLoading: boolean = false;
	private OgcFeaturesLoaderCesium!: OgcFeaturesLoaderCesium;
	public allowPicking: boolean;
	
	public setupPromise: Promise<void> | undefined;
	public showing: boolean = false;

	constructor(map: Map, url: string, options: Partial<OgcFeaturesConstructorOptions>, parameters?: Record<string, string>) {
		const {
			collectionId = "",
			allowPicking = true
        } = options;

		// todo: parse URL to recognize if it already contains the collection name (e.g. /collections/{collection}/items)
		this.map = map;
		this.url = url;
		this.options = options;
		this.parameters = parameters;

		this.collectionId = collectionId;
		this.allowPicking = allowPicking;

	}

	public async init(): Promise<void> {
		this.showing = true;
		this.OgcFeaturesLoaderCesium?.destroy();
		this.setupPromise = undefined;
		this.clear();
		await this.setup();
		if (this.showing) { // If hide() may have been called before setup was done
			this.show();
		}
	}
	
	public switchUrl(url: string, parameters?: Record<string, string>): void {
		if (url !== this.url || parameters !== this.parameters) {
			console.log('Switching parameters from:', this.parameters, 'to:', parameters);
			this.url = url;
			this.parameters = parameters;
			this.init();
		}

	}

	public show(): void {
		this.showing = true;
		this.OgcFeaturesLoaderCesium?.activate();
		this.map.refresh();
	}

	public hide(): void {
		this.showing = false;
		this.OgcFeaturesLoaderCesium?.deactivate();
		this.map.refresh();
	}

	public clear(): void {
		this.OgcFeaturesLoaderCesium?.clear();
	}

	public setOpacity(opacity: number): void {
		if (this.OgcFeaturesLoaderCesium) {
			for (let i = 0; i < this.OgcFeaturesLoaderCesium.primitiveCollection.length; i++) {
				const primitive = this.OgcFeaturesLoaderCesium.primitiveCollection.get(i);
				if (primitive instanceof Cesium.Primitive) {
					(primitive.appearance as Cesium.PerInstanceColorAppearance).translucent = opacity < 100;
					//primitive.appearance.material.uniforms.color.alpha = opacity;
					this.map.refresh();
				}
			}
		}
	}

	public async setup(): Promise<void> {
		if (!this.setupPromise) {
			this.setupPromise = (async () => {
				await this.getMetadata();
				this.dynamicLoading = await this.dynamicLoadingNeeded();
				console.log('Dynamic loading needed:', this.dynamicLoading);
				this.OgcFeaturesLoaderCesium = this.dynamicLoading ? new OgcFeaturesLoaderCesiumDynamic(this) : new OgcFeaturesLoaderCesiumStatic(this);
			})();
		}
		return this.setupPromise;
	}

	private async getMetadata(): Promise<void> {
		const url = `${this.url}/collections?f=json`;
		try {
			const req = await fetch(url);
			const json = await req.json();
			const collections = json.collections as Array<Collection>;

			this.availableCollections = collections.filter(col => col.id !== "");

			if (this.collectionId) {
				this.collection = this.availableCollections.find(col => col.id === this.collectionId);
			}

			if (!this.collection) {
				this.collection = this.availableCollections[0];
			}
			// set bounding box
			if (this.collection.extent.spatial.bbox) {
				this.boundingRect = Cesium.Rectangle.fromDegrees(...this.collection.extent.spatial.bbox[0]);
			}
		} catch (error) {
			console.error(error);
		}
	}

	private async dynamicLoadingNeeded(): Promise<boolean> {
		// the static loader is deprecated and should not be used TODO: refactor this
		return true;
		// const params = new URLSearchParams({
		// 	f: this.outputFormat || 'json',
		// 	limit: '1',
		// 	skipGeometry: 'true'
		// });
		// // Hier gebleven!
		// try {
		// 	const response = await fetch(`${this.url}/collections/${this.collection?.id}/items?${params.toString()}`);
		// 	if (!response.ok) {
		// 		throw new Error('Network response was not ok');
		// 	}
		// 	const json = await response.json();
		// 	console.log('Number of features:', json.numberMatched, 'MaxFeatures:', this.maxFeatures, 'Dynamic loading needed:', json.numberMatched > this.maxFeatures);
		// 	return json.numberMatched > this.maxFeatures;
		// } catch (error) {
		// 	console.error('Error fetching features:', error);
		// 	return false;
		// }
	}
	
	
	public async getFeature(bbox?: string, parameters?: Record<string, string>): Promise<Array<GeoJSONFeature> | undefined> {
		let params = new URLSearchParams({
			f: this.outputFormat || 'json',
			limit: this.maxFeatures.toString()
		});
		if (bbox) params.append('bbox', bbox);
		if (parameters) {
			Object.keys(parameters).forEach(key => {
				// overwrite existing params with new ones or append
				if (key in params.keys()) {
					params.set(key, parameters[key]);
				}
				else {
					params.append(key, parameters[key]);
				}
			});
		}
		const url = `${this.url}/collections/${this.collection?.id}/items?${params.toString()}`;
		console.log('Fetching features from:', url);


		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const features = await response.json();
			return features.features;
		} catch (error) {
			console.error('Error fetching features:', error);
		}
	}


	public async featuresInPolygon(polygon: Array<[lon: number, lat: number]>): Promise<Array<GeoJSONFeature> | undefined> {
		await this.setup();
		if (this.OgcFeaturesLoaderCesium instanceof OgcFeaturesLoaderCesiumStatic) {
			return this.OgcFeaturesLoaderCesium.getFeaturesInPolygon(polygon);
		}
		else {
			console.log("Dynamic loading not yet supported for featuresInPolygon");
		}
	}

	public async getPolygonIntersect(polygon: Array<[lon: number, lat: number]>): Promise<string | undefined> {
		try {
			const response = await fetch(`${this.url}`, { //?${params.toString()}
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					polgyon: polygon
				})
			});
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const features = await response.text();
			return features;
		} catch (error) {
			console.error('Error fetching features:', error);
		}
	}

}




abstract class OgcFeaturesLoaderCesium {

	public OgcFeatures: OgcFeaturesProviderCesium;
	public primitiveCollection: Cesium.PrimitiveCollection = new Cesium.PrimitiveCollection();
	public loadedFeatures: Array<string> = [];
	private terrainUnsubscriber: Unsubscriber | undefined;
	private cachedTerrainProvider: Cesium.TerrainProvider | undefined;

	constructor(OgcFeatures: OgcFeaturesProviderCesium) {
		this.OgcFeatures = OgcFeatures;
	}

	public activate(): void {
		const mapPrimitives = this.OgcFeatures.map.viewer.scene.primitives;
		if (!mapPrimitives.contains(this.primitiveCollection)) {
			mapPrimitives.add(this.primitiveCollection);
		}
		this.primitiveCollection.show = true;
		this.terrainUnsubscriber?.();
		this.terrainUnsubscriber = this.OgcFeatures.map.options.terrainSwitchReady.subscribe((b) => {
			const provider = this.OgcFeatures.map.viewer.terrainProvider;
			if (b && this.cachedTerrainProvider !== provider) {
				this.onTerrainSwitch();
				this.cachedTerrainProvider = provider;
			}
		});

	}

	public deactivate(): void {
		this.primitiveCollection.show = false;
		this.terrainUnsubscriber?.();
	}

	public onTerrainSwitch(): void {
		this.primitiveCollection.removeAll();
	}

	public clear(): void {
		this.loadedFeatures = [];
		this.primitiveCollection.removeAll();
	}

	public destroy(): void {
		this.deactivate();
		this.loadedFeatures = [];
		this.primitiveCollection.removeAll();
	}
	

	public async createPrimitives(features: Array<GeoJSONFeature>, tileHeight: number, perInstanceTerrainSample: boolean = false): Promise<Array<Cesium.GroundPrimitive | Cesium.GroundPolylinePrimitive | Cesium.Primitive>> {
		const primitives: Array<Cesium.GroundPrimitive | Cesium.GroundPolylinePrimitive | Cesium.Primitive> = [];
		const polygonInstances: Array<Cesium.GeometryInstance> = [];
		const polylineInstances: Array<Cesium.GeometryInstance> = [];
		const processFeature = async (feature: GeoJSONFeature) => {
			if (this.loadedFeatures.includes(feature.id)) return
			this.loadedFeatures.push(feature.id);
			const colorAttribute = Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromRandom());
			let height = tileHeight;
			switch (feature.geometry.type) {
				case 'Point':
					const geometryInstance = new Cesium.GeometryInstance({
						geometry: new Cesium.CircleGeometry({
							center: Cesium.Cartesian3.fromDegrees(...feature.geometry.coordinates),
							radius: 100,
						}),
						attributes: {
							color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.ORANGE),
						},
					});
					break;
                case 'LineString':
                    /*
					if (perInstanceTerrainSample && this.OgcFeatures.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
                        let terrainHeight = await Cesium.sampleTerrainMostDetailed(this.OgcFeatures.map.viewer.terrainProvider, [Cesium.Cartographic.fromDegrees(feature.geometry.coordinates[0][0], feature.geometry.coordinates[0][1])]);
                        if (terrainHeight[0]) height = terrainHeight[0].height;
                    }
					*/
                    await addLineString(feature.geometry.coordinates, height, feature.properties, colorAttribute);
                    break;
				case 'MultiLineString':
					/*
					if (perInstanceTerrainSample && this.OgcFeatures.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
						let terrainHeight = await Cesium.sampleTerrainMostDetailed(this.OgcFeatures.map.viewer.terrainProvider, [Cesium.Cartographic.fromDegrees(feature.geometry.coordinates[0][0][0], feature.geometry.coordinates[0][0][1])]);
						if (terrainHeight[0]) height = terrainHeight[0].height;
					}
					*/
					for (let i=0; i < feature.geometry.coordinates.length; i++) {
						const uniqueProperties = { ...feature.properties, hidden: i };
						await addLineString(feature.geometry.coordinates[i], height, uniqueProperties, colorAttribute);
					}
					break;
				case 'Polygon':
					if (perInstanceTerrainSample && this.OgcFeatures.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
						let terrainHeight = await Cesium.sampleTerrainMostDetailed(this.OgcFeatures.map.viewer.terrainProvider, [Cesium.Cartographic.fromDegrees(feature.geometry.coordinates[0][0][0], feature.geometry.coordinates[0][0][1])]);
						if (terrainHeight[0]) height = terrainHeight[0].height;
					}
					await addPolygon(feature.geometry.coordinates, height, feature.properties, colorAttribute);
					break;
				case 'MultiPolygon':
					if (perInstanceTerrainSample && this.OgcFeatures.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
						let terrainHeight = await Cesium.sampleTerrainMostDetailed(this.OgcFeatures.map.viewer.terrainProvider, [Cesium.Cartographic.fromDegrees(feature.geometry.coordinates[0][0][0][0], feature.geometry.coordinates[0][0][0][1])]);
						if (terrainHeight[0]) height = terrainHeight[0].height;
					}
					for (let i=0; i < feature.geometry.coordinates.length; i++) {
						const uniqueProperties = { ...feature.properties, hidden: i };
						await addPolygon(feature.geometry.coordinates[i], height, uniqueProperties, colorAttribute);
					}
					break;
			}
		}
		const addPolygon = async (coordinates: Array<Array<[lon: number, lat: number]>>, height: number, properties: any, colorAttribute: Cesium.ColorGeometryInstanceAttribute) => {
			const positions = coordinates[0].map(coord => Cesium.Cartesian3.fromDegrees(coord[0], coord[1], height));
			const props = this.OgcFeatures.allowPicking ? properties : undefined;
			const polygonIstance = new Cesium.GeometryInstance({
				geometry: Cesium.PolygonGeometry.fromPositions({
					positions: positions,
					vertexFormat : Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
					perPositionHeight: true,
				}),
				attributes: {
					color: colorAttribute,
					depthFailColor: colorAttribute,
					show: new Cesium.ShowGeometryInstanceAttribute(true)
				},
				id: props
			});
			polygonInstances.push(polygonIstance);
			const polylineInstance = new Cesium.GeometryInstance({
				geometry: new Cesium.PolylineGeometry({
					positions: positions,
					width: 2.0
				})
			});
			polylineInstances.push(polylineInstance);
		}

        const addLineString = async (coordinates: Array<[lon: number, lat: number]>, height: number, properties: any, colorAttribute: Cesium.ColorGeometryInstanceAttribute) => {
            const positions = coordinates.map(coord => Cesium.Cartesian3.fromDegrees(coord[0], coord[1], height));
            const props = this.OgcFeatures.allowPicking ? properties : undefined;
            const polylineInstance = new Cesium.GeometryInstance({
                geometry: new Cesium.PolylineGeometry({
                    positions: positions,
                    width: 2.0
                }),
                id: props
            });
            polylineInstances.push(polylineInstance);
        }

		await Promise.all(features.map(processFeature));
		polygonInstances.filter(instance => instance !== undefined);
		if (polylineInstances.length > 0) {
			const polylineAppearance = new Cesium.PolylineMaterialAppearance({
				material: Cesium.Material.fromType('Color', {
					color: Cesium.Color.BLACK
				})
			});
			// console.log("pushing polylines", polylineInstances),
			primitives.push(
				new Cesium.Primitive({
					geometryInstances: polylineInstances,
					appearance: polylineAppearance,
					depthFailAppearance: polylineAppearance,
					releaseGeometryInstances: true
				})
			)
		}
		if (polygonInstances.length > 0) {
			const polygonAppearance = new Cesium.PerInstanceColorAppearance({
				translucent: false
			});
			// console.log("pushing polygons", polygonInstances),
			primitives.push(
				new Cesium.Primitive({
					geometryInstances: polygonInstances,
					appearance: polygonAppearance,
					depthFailAppearance: polygonAppearance,
					releaseGeometryInstances: true,
					allowPicking: this.OgcFeatures.allowPicking
				})
			)
		}
		return primitives;
	}

	// Has Cesium bug: https://github.com/CesiumGS/cesium/issues/11291
	/*
	private createGroundPrimitives(features: Array<GeoJSONFeature>): Array<Cesium.GroundPrimitive | Cesium.GroundPolylinePrimitive | Cesium.Primitive> {
		const primitives: Array<Cesium.GroundPrimitive | Cesium.GroundPolylinePrimitive | Cesium.Primitive> = [];
		const polygonInstances: Array<Cesium.GeometryInstance> = [];
		const polylineInstances: Array<Cesium.GeometryInstance> = [];
		features.forEach(feature => {
			let geometryInstance;
			switch (feature.geometry.type) {
				case 'Point':
					geometryInstance = new Cesium.GeometryInstance({
						geometry: new Cesium.CircleGeometry({
							center: Cesium.Cartesian3.fromDegrees(...feature.geometry.coordinates),
							radius: 100,
						}),
						attributes: {
							color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.ORANGE),
						},
					});
					break;
				case 'Polygon':
					const positions = feature.geometry.coordinates[0].map(coord => Cesium.Cartesian3.fromDegrees(coord[0], coord[1]));
					const properties = feature.properties;
					const col = Cesium.Color.fromRandom();
					const polygonIstance = new Cesium.GeometryInstance({
						geometry: Cesium.PolygonGeometry.fromPositions({
							positions: positions,
							vertexFormat : Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
							//arcType: Cesium.ArcType.RHUMB,
							//ellipsoid: Cesium.Ellipsoid.WGS84
						}),
						attributes: {
							color: Cesium.ColorGeometryInstanceAttribute.fromColor(col),
							show: new Cesium.ShowGeometryInstanceAttribute(true)
						},
						id: properties
					});
					polygonInstances.push(polygonIstance);
					const polylineInstance = new Cesium.GeometryInstance({
						geometry: new Cesium.GroundPolylineGeometry({
							positions: positions,
							width: 2.0
						}),
						attributes: {
							color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.BLUE)
						}
					});
					polylineInstances.push(polylineInstance);
					break;
			}
		})
		polygonInstances.filter(instance => instance !== undefined);
		if (polygonInstances.length > 0) {
			primitives.push(
				new Cesium.GroundPrimitive({
					geometryInstances: polygonInstances,
					appearance: new Cesium.PerInstanceColorAppearance({
						translucent: false
					}),
					releaseGeometryInstances: false
				})
			)
		}
		if (polylineInstances.length > 0) {
			primitives.push(
				new Cesium.GroundPolylinePrimitive({
					geometryInstances: polylineInstances,
					appearance: new Cesium.PolylineMaterialAppearance({
						material: Cesium.Material.fromType('Color', {
							color: Cesium.Color.BLACK
						})
					})
				})
			)
		}
		return primitives;
	}
	*/

}


export class OgcFeaturesLoaderCesiumStatic extends OgcFeaturesLoaderCesium {

	private features: Array<GeoJSONFeature> | undefined;
	private primitives: Array<Cesium.Primitive | Cesium.GroundPrimitive | Cesium.GroundPolylinePrimitive> | undefined;

	constructor(OgcFeatures: OgcFeaturesProviderCesium) {
		super(OgcFeatures);
	}
	
	public async activate(): Promise<void> {
		await this.loadFeatures();
		super.activate();
	}

	public async loadFeatures(): Promise<void> {
		if (!this.features) {
			console.log("Loading features from loadFeatures() (no params are passed here)");
			const features = await this.OgcFeatures.getFeature();
			this.features = features || [];
		}
	}

	public onTerrainSwitch(): void {
		super.onTerrainSwitch();
		this.loadedFeatures = [];
		if (this.features) this.createPrimitives(this.features, 0, true).then(primitives => {
			this.primitives = primitives;
			this.primitives.forEach(primitive => this.primitiveCollection.add(primitive));
		});
	}

	public async getFeaturesInPolygon(polygon: Array<[lon: number, lat: number]>): Promise<Array<GeoJSONFeature>> {
		await this.loadFeatures();
		if (!this.features) return [];
		const excavationPolygon = turf.polygon([polygon]);
		return this.features.filter(feature => {
			const geometry = feature.geometry;
			if (geometry.type === "Point") {
				const point = turf.point(geometry.coordinates);
				return turf.booleanPointInPolygon(point, excavationPolygon);
			} else if (geometry.type === "Polygon") {
				const turfCoords = geometry.coordinates[0].map(coord => [coord[0], coord[1]]);
				const featurePolygon = turf.polygon([turfCoords]);
				const contains = turf.booleanContains(featurePolygon, excavationPolygon);
				const overlaps = turf.booleanOverlap(featurePolygon, excavationPolygon);
				return contains || overlaps;
			} else if (geometry.type === "MultiPolygon") {
				const turfCoords = geometry.coordinates.map(coords => coords[0].map(coord => [coord[0], coord[1]]));
				const featurePolygon = turf.multiPolygon([turfCoords]);
				const contains = turf.booleanContains(featurePolygon, excavationPolygon);
				const overlaps = turf.booleanOverlap(featurePolygon, excavationPolygon);
				return contains || overlaps;
			}
			return false;
		});
	}
}



export class OgcFeaturesLoaderCesiumDynamic extends OgcFeaturesLoaderCesium {

	private heightStartLoading: number;
	private viewDistance: number;
	private tileSizeRad: number;
	private cacheBuster: number;

	private blocking: boolean = false;
	private loadHandle = () => this.onCameraChanged();
	private loadedTiles: Array<OgcFeaturesTile> = [];

	constructor(OgcFeatures: OgcFeaturesProviderCesium) {
		super(OgcFeatures);
		const {
            heightStartLoading = 1100,
            tileWidth = 512,
            cacheBuster = 5000,
        } = OgcFeatures.options;
		this.heightStartLoading = heightStartLoading;
		this.viewDistance = heightStartLoading * 2;
		this.tileSizeRad = tileWidth / 6378137.0; // to radians
		this.cacheBuster = cacheBuster;
	}

	public activate(): void {
		super.activate();
		this.OgcFeatures.map.viewer.scene.camera.changed.addEventListener(this.loadHandle);
	}

	public deactivate(): void {
		super.deactivate();
		this.OgcFeatures.map.viewer.scene.camera.changed.removeEventListener(this.loadHandle);
	}

	public onTerrainSwitch(): void {
		super.onTerrainSwitch();
		this.loadedTiles = [];
		this.loadedFeatures = [];
		this.blocking = false;
		this.onCameraChanged();
	}

	private async onCameraChanged(): Promise<void> {
		if (this.blocking || !this.primitiveCollection.show) return;
		this.blocking = true;
		setTimeout(() => this.blocking = false, 3500);
		await this.bustCache();
		const cameraHeight = this.OgcFeatures.map.viewer.camera.positionCartographic.height;
		if (cameraHeight > this.heightStartLoading) {
			//this.primitiveCollection.show = false;
			console.log("camera too high")
			return;
		}
		this.primitiveCollection.show = true;
		const targetArea = this.getTargetRectangle();
		const tileIndicesInView = this.getTileIndices(targetArea, this.OgcFeatures.map.viewer.camera.positionCartographic);
		const needLoading = tileIndicesInView.filter(tile => !this.loadedTiles.some(loadedTile => loadedTile.x === tile[0] && loadedTile.y === tile[1]));
		needLoading.forEach(tile => {
			const newTile = {
				x: tile[0],
				y: tile[1],
				center: Cesium.Cartesian3.fromRadians(tile[0] * this.tileSizeRad + this.tileSizeRad/2, tile[1] * this.tileSizeRad + this.tileSizeRad/2),
				primitives: [],
				ids: [],
				size: 0,
				destroyed: false
			}
			this.loadedTiles.push(newTile);
			this.loadTile(newTile)
		});
	}

	private getTargetRectangle(thresholdDistance: number = this.viewDistance): Cesium.Rectangle {
		const cameraPosition = this.OgcFeatures.map.viewer.camera.position;
		const viewRectangle = this.OgcFeatures.map.viewer.camera.computeViewRectangle();
		if (!viewRectangle) {
			return Cesium.Rectangle.fromDegrees(0, 0, 0, 0);
		}

		const adjustCorner = (cornerCartographic: Cesium.Cartographic): Cesium.Cartographic => {
			const cornerCartesian = Cesium.Cartographic.toCartesian(cornerCartographic);
			const distance = Cesium.Cartesian3.distance(cornerCartesian, cameraPosition);
			if (distance > thresholdDistance) {
				const direction = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(cornerCartesian, cameraPosition, new Cesium.Cartesian3()), new Cesium.Cartesian3());
				const closerCartesian = Cesium.Cartesian3.add(cameraPosition, Cesium.Cartesian3.multiplyByScalar(direction, thresholdDistance, new Cesium.Cartesian3()), new Cesium.Cartesian3());
				return Cesium.Cartographic.fromCartesian(closerCartesian);
			}
			return cornerCartographic;
		}

		const nw = adjustCorner(new Cesium.Cartographic(viewRectangle.west, viewRectangle.north));
		const ne = adjustCorner(new Cesium.Cartographic(viewRectangle.east, viewRectangle.north));
		const se = adjustCorner(new Cesium.Cartographic(viewRectangle.east, viewRectangle.south));
		const sw = adjustCorner(new Cesium.Cartographic(viewRectangle.west, viewRectangle.south));

		return Cesium.Rectangle.fromCartographicArray([nw, ne, se, sw]);
	}

	private getTileIndices(rectangle: Cesium.Rectangle, cameraPosition: Cesium.Cartographic): Array<[x: number, y: number]> {
		const tileIndices: Array<[number, number]> = [];
		const startX = Math.floor(rectangle.west / this.tileSizeRad);
		const startY = Math.floor(rectangle.south / this.tileSizeRad);
		const endX = Math.ceil(rectangle.east / this.tileSizeRad);
		const endY = Math.ceil(rectangle.north / this.tileSizeRad);
		for (let x = startX; x < endX; x++) {
			for (let y = startY; y < endY; y++) {
				const rectangle = Cesium.Rectangle.fromRadians(x * this.tileSizeRad, y * this.tileSizeRad, (x + 1) * this.tileSizeRad, (y + 1) * this.tileSizeRad);
				if (Cesium.Rectangle.intersection(this.OgcFeatures.boundingRect, rectangle)){
					tileIndices.push([x, y]);
				}
			}
		}
		const cameraIndex = [Math.floor(cameraPosition.longitude / this.tileSizeRad), Math.floor(cameraPosition.latitude / this.tileSizeRad)];
		tileIndices.sort((a, b) => {
			const distA = Math.sqrt(Math.pow(a[0] - cameraIndex[0], 2) + Math.pow(a[1] - cameraIndex[1], 2));
			const distB = Math.sqrt(Math.pow(b[0] - cameraIndex[0], 2) + Math.pow(b[1] - cameraIndex[1], 2));
			return distA - distB;
		});
		return tileIndices;
	}

	private async loadTile(tile: OgcFeaturesTile): Promise<void> {
		const degrees = Cesium.Math.toDegrees(this.tileSizeRad);
		const lon = [tile.x * degrees, (tile.x + 1) * degrees];
		const lat = [tile.y * degrees, (tile.y + 1) * degrees];
		const center = Cesium.Rectangle.center(Cesium.Rectangle.fromDegrees(lon[0], lat[0], lon[1], lat[1]));
		let tileHeight = 0.1;
		if (this.OgcFeatures.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
			const terrainHeight = await Cesium.sampleTerrainMostDetailed(this.OgcFeatures.map.viewer.terrainProvider, [center]);
			tileHeight = terrainHeight[0].height + 1;
		}
		await this.fetchFeaturesForTile(tile, [...lon, ...lat], tileHeight);
	}

	private async fetchFeaturesForTile(tile: OgcFeaturesTile, coords: Array<number>, tileHeight: number): Promise<void> {
		if (tile.destroyed) return;
		const bbox = `${coords[0]},${coords[2]},${coords[1]},${coords[3]}`;
		const features = await this.OgcFeatures.getFeature(bbox, this.OgcFeatures.parameters);
		if (!features) return;
		if (features.length >= this.OgcFeatures.maxFeatures) {
			const subTiles = [
				[coords[0], coords[1], coords[2] - (coords[2] - coords[0]) / 2, coords[3] - (coords[3] - coords[1]) / 2],
				[coords[0] + (coords[2] - coords[0]) / 2, coords[1], coords[2], coords[3] - (coords[3] - coords[1]) / 2],
				[coords[0], coords[1] + (coords[3] - coords[1]) / 2, coords[2] - (coords[2] - coords[0]) / 2, coords[3]],
				[coords[0] + (coords[2] - coords[0]) / 2, coords[1] + (coords[3] - coords[1]) / 2, coords[2], coords[3]]
			]
			subTiles.forEach(coordinates => this.fetchFeaturesForTile(tile, coordinates, tileHeight));
			return;
		}
		tile.ids = features.map(feature => feature.id);
		tile.size += features.length;
		const primitives = await this.createPrimitives(features, tileHeight);
		if (primitives.length > 0 && !tile.destroyed) {
			primitives.forEach(primitive => {
				this.primitiveCollection.add(primitive);
				tile.primitives.push(primitive);
			});
		}
	}
	
	private bustCacheOldest(): void {
		const totalFeaturesLoaded = this.loadedFeatures.length;
		if (totalFeaturesLoaded > this.cacheBuster) {
			const tile = this.loadedTiles.shift();
			if (tile) this.destroyTile(tile);
			this.bustCacheOldest();
		}
		return;
	}

	private async bustCache(): Promise<void> {
		let numberOfFeatures = this.loadedFeatures.length;
		while (numberOfFeatures > this.cacheBuster) {
			let tileToBust: OgcFeaturesTile | undefined;
			let maxDistance = 0;
			this.loadedTiles.forEach((tile, i) => {
				const distance = Cesium.Cartesian3.distance(tile.center, this.OgcFeatures.map.viewer.camera.position);
				if (distance > maxDistance) {
					maxDistance = distance;
					tileToBust = tile;
				}
			});
			if (!tileToBust || Cesium.Cartesian3.distance(tileToBust.center, this.OgcFeatures.map.viewer.camera.position) < this.heightStartLoading) break;
			this.destroyTile(tileToBust);
			numberOfFeatures -= tileToBust.size;
		}
	}

	private destroyTile(tile: OgcFeaturesTile): void {
		tile.destroyed = true;
		tile.primitives.forEach(primitive => this.primitiveCollection.remove(primitive));
		this.loadedTiles = this.loadedTiles.filter(t => t !== tile);
		this.loadedFeatures = this.loadedFeatures.filter(id => !tile.ids.includes(id));
	}

}





export interface GeoJSONFeature {
	type: "Feature";
	id: string;
	geometry: GeoJSONPoint | GeoJSONLineString | GeoJSONMultiLineString | GeoJSONPolygon | GeoJSONMultiPolygon;
	properties: any;
}

interface GeoJSONPolygon {
	type: "Polygon";
	coordinates: Array<Array<[lon: number, lat: number]>>;
}

interface GeoJSONMultiPolygon {
	type: "MultiPolygon";
	coordinates: Array<Array<Array<[lon: number, lat: number]>>>;
}

interface GeoJSONLineString {
	type: "LineString";
	coordinates: Array<[lon: number, lat: number]>;
}

interface GeoJSONMultiLineString {
	type: "MultiLineString";
	coordinates: Array<Array<[lon: number, lat: number]>>;
}

interface GeoJSONPoint {
	type: "Point";
	coordinates: [lon: number, lat: number];
}