import * as Cesium from "cesium";
import type { Map } from "../map";
import type { Unsubscriber } from "svelte/motion";
import * as turf from "@turf/turf";


interface WFSTile {
	x: number;
	y: number;
	center: Cesium.Cartesian3;
	primitives: Array<Cesium.Primitive | Cesium.GroundPrimitive | Cesium.GroundPolylinePrimitive>;
	ids: Array<string>;
	size: number;
	destroyed: boolean;
}

interface WFSConstructorOptions {
	featureType: string;
	version: string;
	heightStartLoading: number;
	tileWidth: number;
	cacheBuster: number;
	allowPicking: boolean;
}


/**
 * Represents a provider that draws Cesium primitives from geometrical features
 * retrieved from a Web Feature Service (WFS) server.
 * 
 * This class is initialized with the URL of the WFS service and optional parameters
 * for controlling the loading and display of the WFS features.
 * 
 * @class WFSProviderCesium
 * @param {string} url - The URL of the WFS service.
 * @param {number} heightStartLoading - The height at which to start loading the tiles.
 * @param {number} [tileWidth=256] - The width of the tiles in pixels. Defaults to 256.
 * @param {number} [cacheBuster=4000] - Optional parameter to force the refresh of the tiles. Defaults to 4000.
 */

export class WFSProviderCesium {

	private url: string;
	public options: Partial<WFSConstructorOptions>;

	private featureType: string;
	private availableTypes: Array<{ title: string, name: string}> = [];
	private version: string;
	private outputFormat: string | undefined = "application/json";
	public maxFeatures: number = 1000;
	public boundingRect: Cesium.Rectangle = Cesium.Rectangle.MAX_VALUE;

	public map!: Map;
	public dynamicLoading: boolean = false;
	private WFSLoaderCesium!: WFSLoaderCesium;
	public allowPicking: boolean;
	
	public setupPromise: Promise<void> | undefined;
	public showing: boolean = false;

	constructor(url: string, options: Partial<WFSConstructorOptions>) {
		const {
			featureType = "",
			version = "1.1.0",
			allowPicking = true
        } = options;

		this.url = url.split("?")[0];
		this.options = options;

		this.featureType = featureType;
		this.version = version;
		this.allowPicking = allowPicking;
	}

	public addToMap(map: Map, show: boolean = true): void {
		this.map = map;
		if (show) this.show();
	}

	public async show(): Promise<void> {
		this.showing = true;
        // check if already loaded and showing
		if (this.WFSLoaderCesium && this.map.viewer.scene.primitives.contains(this.WFSLoaderCesium.primitiveCollection) && this.WFSLoaderCesium.primitiveCollection.show) return;
		await this.setup();
		if (!this.showing) return; // If hide() was called before setup was done
		this.WFSLoaderCesium.activate();
		this.map.refresh();
	}

	public hide(): void {
		this.showing = false;
		this.WFSLoaderCesium?.deactivate();
		this.map?.refresh();
	}

	public setOpacity(opacity: number): void {
		if (this.WFSLoaderCesium) {
			for (let i = 0; i < this.WFSLoaderCesium.primitiveCollection.length; i++) {
				const primitive = this.WFSLoaderCesium.primitiveCollection.get(i);
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
				await this.getCapabilities();
				this.dynamicLoading = await this.dynamicLoadingNeeded();
				this.WFSLoaderCesium = this.dynamicLoading ? new WFSLoaderCesiumDynamic(this) : new WFSLoaderCesiumStatic(this);
			})();
		}
		return this.setupPromise;
	}

	private async getCapabilities(): Promise<void> {
		const url = `${this.url}?service=WFS&request=GetCapabilities`;
		try {
			const req = await fetch(url);
			const xml = await req.text();
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xml, "application/xml");
			
			const featureTypeList = xmlDoc.querySelectorAll("FeatureTypeList FeatureType");
			this.availableTypes = Array.from(featureTypeList).map(ft => {
				const name = ft.querySelector("Name")?.textContent ?? "";
				const title = ft.querySelector("Title")?.textContent ?? "No title";
				return { name, title };
			}).filter(ft => ft.name !== "");
			if (!this.featureType || !this.availableTypes.some(type => type.name === this.featureType)) {
				this.featureType = this.availableTypes[0].name;
			}

			// set bounding box
			const lowerCorner = xmlDoc.getElementsByTagName("ows:LowerCorner")[0].textContent?.split(' ').map(Number);
			const upperCorner = xmlDoc.getElementsByTagName("ows:UpperCorner")[0].textContent?.split(' ').map(Number);
			if (lowerCorner && upperCorner) {
				this.boundingRect = Cesium.Rectangle.fromDegrees(lowerCorner[0], lowerCorner[1], upperCorner[0], upperCorner[1]);
			}
		} catch (error) {
			console.error(error);
		}
	}

	private async dynamicLoadingNeeded(): Promise<boolean> {
		const params = new URLSearchParams({
			service: 'WFS',
			version: '2.0.0',
			request: 'GetFeature',
			typeName: this.featureType,
		});
		
		try {
			const response = await fetch(`${this.url}?${params.toString()}`);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const xmlText = await response.text();
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
		
			const featureCollection = xmlDoc.getElementsByTagName('wfs:FeatureCollection')[0];
			const numberMatched = featureCollection.getAttribute('numberMatched');
			const numberReturned = featureCollection.getAttribute('numberReturned');
			this.maxFeatures = Number(numberMatched);	
			return numberMatched !== numberReturned;
		} catch (error) {
			console.error('Error fetching features:', error);
			return false;
		}
	}
	
	
	public async getFeature(bbox?: string): Promise<Array<GeoJSONFeature> | undefined> {
		const params = new URLSearchParams({
			service: 'WFS',
			version: this.version,
			request: 'GetFeature',
			typeName: this.featureType,
			srsName: `EPSG:4326`
		});
		if (this.outputFormat) params.append('outputFormat', this.outputFormat);
		if (bbox) params.append('bbox', bbox);
		const url = `${this.url}?${params.toString()}`;

		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const contentType = response.headers.get('Content-Type');
			if (contentType && contentType.includes('application/json')) {
				const features = await response.json();
				return features.features;
			} else {
				const textResponse = await response.text();
				const features = this.parseGML(textResponse);
				return features;
			}
		} catch (error) {
			if (this.outputFormat) {
				this.outputFormat = undefined; // Fallback to default outputFormat if json not supported
				return await this.getFeature(bbox);
			} else {
				console.error('Error fetching features:', error);
			}
		}
	}

	private parseGML(text: string): Array<GeoJSONFeature> {
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(text, "application/xml");

		let featureMembers = Array.from(xmlDoc.querySelectorAll("featureMember"));
		if (featureMembers.length === 0) {
			const featureMembersContainer = xmlDoc.querySelector("featureMembers");
			if (featureMembersContainer) {
				featureMembers = Array.from(featureMembersContainer.children);
			}
		}
		const parsedFeatures: Array<GeoJSONFeature> = [];
		Array.from(featureMembers).forEach(feature => {
			const id = feature.getAttribute("gml:id") || "";
			const properties = this.parseProperties(feature);
			const geometry = this.getGMLgeom(feature);
			if (geometry) parsedFeatures.push({ type: "Feature", id, geometry, properties });
		});
		return parsedFeatures;
	}

	private parseProperties(feature: Element): Record<string, string> {
		const properties: Record<string, string> = {};
		Array.from(feature.children).forEach(child => {
			const tagName = child.tagName.split(":")[1];
			if (!tagName.startsWith("gml") && !tagName.includes("geom")) {
				properties[tagName] = child.textContent || "";
			}
		});
		return properties;
	}

	private getGMLgeom(feature: Element): GeoJSONPoint | GeoJSONPolygon | GeoJSONLineString | GeoJSONMultiPolygon | undefined{
		const pointElement = feature.querySelector('Point');
		if (pointElement) {
			const pos = pointElement.querySelector('pos') || pointElement.querySelector('coordinates');
			if (pos) {
				const parts = pos.textContent!.trim().split(' ').map(Number);
				if (parts.length === 2 && parts.every(part => typeof part === 'number')) {
					return { type: "Point", coordinates: [parts[0], parts[1]] };
				}
			}
		}
		const polygonElements = Array.from(feature.querySelectorAll('Polygon'));
		if (polygonElements.length > 0) {
			const polygons = polygonElements.map(polygon => {
				const posList = polygon.querySelector('posList') || polygon.querySelector('coordinates');
				if (posList) {
					const coordinates = this.parseCoordinates(posList.textContent);
					return [coordinates];
				}
				return [];
			});
			if (polygons.length === 1) {
				return { type: "Polygon", coordinates: polygons[0] };
			} else {
				return { type: "MultiPolygon", coordinates: polygons };
			}
		}
		const lineStringElement = feature.querySelector('LineString');
		if (lineStringElement) {
			const posList = lineStringElement.querySelector('posList') || lineStringElement.querySelector('coordinates');
			if (posList) {
				const coordinates = this.parseCoordinates(posList.textContent);
				return { type: "LineString", coordinates: coordinates };
			}
		}
		return undefined;
	}
	
	private parseCoordinates(posList: string | null): Array<[lon: number, lat: number]> {
		if (!posList) return [];
		return posList.trim().split(' ').map(Number).reduce((acc, val, index, array) => {
			if (index % 2 === 0) acc.push([array[index], array[index + 1]] as [lon: number, lat: number]);
			return acc;
		}, [] as Array<[lon: number, lat: number]>);
	}

	public async featuresAtPoint(lon: number, lat: number): Promise<GeoJSONFeature | undefined> {
		const srsName = 'EPSG:4326';
		const point = `<gml:Point srsName="${srsName}"><gml:coordinates>${lon},${lat}</gml:coordinates></gml:Point>`;
		const filter = `<Filter><Intersects><PropertyName>geom</PropertyName>${point}</Intersects></Filter>`;
		
		const params = new URLSearchParams({
			service: 'WFS',
			version: '1.1.0',
			request: 'GetFeature',
			typeName: this.featureType,
			srsName: `EPSG:4326`,
			maxFeatures: "1",
			outputFormat: 'application/json',
			Filter: filter
		});

		try {
			const response = await fetch(`${this.url}?${params.toString()}`);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const feature = await response.json();
			return feature;
		} catch (error) {
			console.error('Error fetching feature:', error);
		}
	}

	public async featuresInPolygon(polygon: Array<[lon: number, lat: number]>): Promise<Array<GeoJSONFeature> | undefined> {
		await this.setup();
		if (this.WFSLoaderCesium instanceof WFSLoaderCesiumStatic) {
			return this.WFSLoaderCesium.getFeaturesInPolygon(polygon);
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

	public async polygonIntersect2(polygon: Array<[lon: number, lat: number]>): Promise<string | undefined> {
		const srsName = 'EPSG:4326';
		const coords = polygon.map(coord => coord.join(',')).join(' ');
		const point = `<gml:Polygon xmlns:gml="http://www.opengis.net/gml" srsName="${srsName}"><gml:exterior><gml:LinearRing><gml:posList>${coords}</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon>`;
		const filter = `<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"><ogc:Intersects><ogc:PropertyName>geom</ogc:PropertyName>${point}</ogc:Intersects></ogc:Filter>`;
		
		const params = new URLSearchParams({
			service: 'WFS',
			version: '2.0.0',
			request: 'GetFeature',
			typeName: this.featureType,
			srsName: `EPSG:4326`,
			Filter: filter
		});

		try {
			const response = await fetch(`${this.url}`, { //?${params.toString()}
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					polgyon: this.getPolygonFilter(polygon, this.featureType)
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

	private getPolygonFilter(coordinates: Array<[lon: number, lat: number]>, layerName: string): string {
		const gmlCoordinates = coordinates.map(coord => coord.join(',')).join(' ');
		return `
			<wfs:GetFeature service="WFS" version="1.1.0"
				xmlns:wfs="http://www.opengis.net/wfs"
				xmlns:ogc="http://www.opengis.net/ogc"
				xmlns:gml="http://www.opengis.net/gml"
				xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
				xsi:schemaLocation="http://www.opengis.net/wfs
				http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">
				<wfs:Query typeName="${layerName}">
					<ogc:Filter>
						<ogc:Intersects>
							<ogc:PropertyName>geometry</ogc:PropertyName>
							<gml:Polygon srsName="EPSG:4326">
								<gml:outerBoundaryIs>
									<gml:LinearRing>
										<gml:coordinates>
											${gmlCoordinates}
										</gml:coordinates>
									</gml:LinearRing>
								</gml:outerBoundaryIs>
							</gml:Polygon>
						</ogc:Intersects>
					</ogc:Filter>
				</wfs:Query>
			</wfs:GetFeature>
		`
	}

}




abstract class WFSLoaderCesium {

	public WFS: WFSProviderCesium;
	public primitiveCollection: Cesium.PrimitiveCollection = new Cesium.PrimitiveCollection();
	public loadedFeatures: Array<string> = [];
	private terrainUnsubscriber: Unsubscriber | undefined;
	private cachedTerrainProvider: Cesium.TerrainProvider | undefined;

	constructor(WFS: WFSProviderCesium) {
		this.WFS = WFS;
	}

	public activate(): void {
		const mapPrimitives = this.WFS.map.viewer.scene.primitives;
		if (!mapPrimitives.contains(this.primitiveCollection)) {
			mapPrimitives.add(this.primitiveCollection);
		}
		this.primitiveCollection.show = true;
		this.terrainUnsubscriber = this.WFS.map.options.terrainSwitchReady.subscribe((b) => {
			const provider = this.WFS.map.viewer.terrainProvider;
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

	public async createPrimitives(features: Array<GeoJSONFeature>, tileHeight: number, perInstanceTerrainSample: boolean = false): Promise<Array<Cesium.GroundPrimitive | Cesium.GroundPolylinePrimitive | Cesium.Primitive>> {
		const primitives: Array<Cesium.GroundPrimitive | Cesium.GroundPolylinePrimitive | Cesium.Primitive> = [];
		const polygonInstances: Array<Cesium.GeometryInstance> = [];
		const polylineInstances: Array<Cesium.GeometryInstance> = [];
		const processFeature = async (feature: GeoJSONFeature) => {
			if (this.loadedFeatures.includes(feature.id)) return
			this.loadedFeatures.push(feature.id);
			const colorAttribute = Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromRandom());
			let height = tileHeight;
            console.log(feature.geometry.type)
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
                    if (perInstanceTerrainSample && this.WFS.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
                        let terrainHeight = await Cesium.sampleTerrainMostDetailed(this.WFS.map.viewer.terrainProvider, [Cesium.Cartographic.fromDegrees(feature.geometry.coordinates[0][0], feature.geometry.coordinates[0][1])]);
                        if (terrainHeight[0]) height = terrainHeight[0].height;
                    }
                    await addLineString(feature.geometry.coordinates, height, feature.properties, colorAttribute);
                    break;
				case 'Polygon':
					if (perInstanceTerrainSample && this.WFS.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
						let terrainHeight = await Cesium.sampleTerrainMostDetailed(this.WFS.map.viewer.terrainProvider, [Cesium.Cartographic.fromDegrees(feature.geometry.coordinates[0][0][0], feature.geometry.coordinates[0][0][1])]);
						if (terrainHeight[0]) height = terrainHeight[0].height;
					}
					await addPolygon(feature.geometry.coordinates, height, feature.properties, colorAttribute);
					break;
				case 'MultiPolygon':
					if (perInstanceTerrainSample && this.WFS.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
						let terrainHeight = await Cesium.sampleTerrainMostDetailed(this.WFS.map.viewer.terrainProvider, [Cesium.Cartographic.fromDegrees(feature.geometry.coordinates[0][0][0][0], feature.geometry.coordinates[0][0][0][1])]);
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
			const props = this.WFS.allowPicking ? properties : undefined;
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
            const props = this.WFS.allowPicking ? properties : undefined;
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
			primitives.push(
				new Cesium.Primitive({
					geometryInstances: polygonInstances,
					appearance: polygonAppearance,
					depthFailAppearance: polygonAppearance,
					releaseGeometryInstances: true,
					allowPicking: this.WFS.allowPicking
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


export class WFSLoaderCesiumStatic extends WFSLoaderCesium {

	private features: Array<GeoJSONFeature> | undefined;
	private primitives: Array<Cesium.Primitive | Cesium.GroundPrimitive | Cesium.GroundPolylinePrimitive> | undefined;

	constructor(WFS: WFSProviderCesium) {
		super(WFS);
	}

	public async activate(): Promise<void> {
		await this.loadFeatures();
		super.activate();
	}

	public async loadFeatures(): Promise<void> {
		if (!this.features) {
			const features = await this.WFS.getFeature();
			this.features = features || [];
		}
	}

	public onTerrainSwitch(): void {
        console.log("onTerrainSwitch");
		super.onTerrainSwitch();
		this.loadedFeatures = [];
		if (this.features) this.createPrimitives(this.features, 0, true).then(primitives => {
			this.primitives = primitives;
            console.log(this.primitives)
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



export class WFSLoaderCesiumDynamic extends WFSLoaderCesium {

	private heightStartLoading: number;
	private viewDistance: number;
	private tileSizeRad: number;
	private cacheBuster: number;

	private blocking: boolean = false;
	private loadHandle = () => this.onCameraChanged();
	private loadedTiles: Array<WFSTile> = [];

	constructor(WFS: WFSProviderCesium) {
		super(WFS);
		const {
            heightStartLoading = 1100,
            tileWidth = 512,
            cacheBuster = 5000,
        } = WFS.options;
		this.heightStartLoading = heightStartLoading;
		this.viewDistance = heightStartLoading * 2;
		this.tileSizeRad = tileWidth / 6378137.0; // to radians
		this.cacheBuster = cacheBuster;
	}

	public activate(): void {
		super.activate();
		this.WFS.map.viewer.scene.camera.changed.addEventListener(this.loadHandle);
	}

	public deactivate(): void {
		super.deactivate();
		this.WFS.map.viewer.scene.camera.changed.removeEventListener(this.loadHandle);
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
		const cameraHeight = this.WFS.map.viewer.camera.positionCartographic.height;
		if (cameraHeight > this.heightStartLoading) {
			//this.primitiveCollection.show = false;
			return;
		}
		this.primitiveCollection.show = true;
		const targetArea = this.getTargetRectangle();
		const tileIndicesInView = this.getTileIndices(targetArea, this.WFS.map.viewer.camera.positionCartographic);
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
		const cameraPosition = this.WFS.map.viewer.camera.position;
		const viewRectangle = this.WFS.map.viewer.camera.computeViewRectangle();
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
				if (Cesium.Rectangle.intersection(this.WFS.boundingRect, rectangle)){
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

	private async loadTile(tile: WFSTile): Promise<void> {
		const degrees = Cesium.Math.toDegrees(this.tileSizeRad);
		const lon = [tile.x * degrees, (tile.x + 1) * degrees];
		const lat = [tile.y * degrees, (tile.y + 1) * degrees];
		const center = Cesium.Rectangle.center(Cesium.Rectangle.fromDegrees(lon[0], lat[0], lon[1], lat[1]));
		let tileHeight = 0.1;
		if (this.WFS.map.viewer.terrainProvider instanceof Cesium.CesiumTerrainProvider) {
			const terrainHeight = await Cesium.sampleTerrainMostDetailed(this.WFS.map.viewer.terrainProvider, [center]);
			tileHeight = terrainHeight[0].height + 1;
		}
		await this.fetchFeaturesForTile(tile, [...lon, ...lat], tileHeight);
	}

	private async fetchFeaturesForTile(tile: WFSTile, coords: Array<number>, tileHeight: number): Promise<void> {
		if (tile.destroyed) return;
		const bbox = `${coords[0]},${coords[2]},${coords[1]},${coords[3]}`;
		const features = await this.WFS.getFeature(bbox);
		if (!features) return;
		if (features.length >= this.WFS.maxFeatures) {
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
			let tileToBust: WFSTile | undefined;
			let maxDistance = 0;
			this.loadedTiles.forEach((tile, i) => {
				const distance = Cesium.Cartesian3.distance(tile.center, this.WFS.map.viewer.camera.position);
				if (distance > maxDistance) {
					maxDistance = distance;
					tileToBust = tile;
				}
			});
			if (!tileToBust || Cesium.Cartesian3.distance(tileToBust.center, this.WFS.map.viewer.camera.position) < this.heightStartLoading) break;
			this.destroyTile(tileToBust);
			numberOfFeatures -= tileToBust.size;
		}
	}

	private destroyTile(tile: WFSTile): void {
		tile.destroyed = true;
		tile.primitives.forEach(primitive => this.primitiveCollection.remove(primitive));
		this.loadedTiles = this.loadedTiles.filter(t => t !== tile);
		this.loadedFeatures = this.loadedFeatures.filter(id => !tile.ids.includes(id));
	}

}





export interface GeoJSONFeature {
	type: "Feature";
	id: string;
	geometry: GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon | GeoJSONMultiPolygon;
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

interface GeoJSONPoint {
	type: "Point";
	coordinates: [lon: number, lat: number];
}