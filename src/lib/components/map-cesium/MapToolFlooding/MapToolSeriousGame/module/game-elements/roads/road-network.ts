import { get, writable, type Writable } from "svelte/store";
import * as Cesium from "cesium";
import type { Map } from "$lib/components/map-cesium/module/map";
import { ExtractionPoint, BottleNeck, RoadNetworkLayer, RoadNetworkLayerP, type IRoadSegmentFeature, RouteSegment } from "./bottle-neck";
import { Evacuation } from "../evacuation";
import { RoutingAPI, type RouteFeature } from "../api/routing-api";
import NodeHoverBox from "../../../components/infobox/NodeHoverBox.svelte";


const extractionPointsConfig = [
	{
		id: "extraction1",
		position: { lat: 51.32847, lon: 3.79669 }
	},
	{
		id: "extraction2",
		position: { lat: 51.67628, lon: 3.72604 }
	},
	{
		id: "extraction3",
		position: { lat: 51.64000, lon: 3.93750 }
	}
];

const bottlenecksConfig = [
	{
		id: "bottleneck1",
		position: { lat: 51.60048, lon: 3.68215 },
		capacity: 10000
	},
	{
		id: "bottleneck2",
		position: { lat: 51.48279, lon: 3.87022 },
		capacity: 5000
	}
];


export class RoadNetwork {

	public map: Map;
	private routingAPI: RoutingAPI;
	private extractionPoints: Array<ExtractionPoint> = [];
	private exctractionPointLayer: RoadNetworkLayer<ExtractionPoint>;
	public selectedExtractionPoint: Writable<ExtractionPoint  | undefined> = writable(undefined);
	private bottlenecks: Array<BottleNeck> = [];
	private bottleneckLayer: RoadNetworkLayerP<BottleNeck>;

	private outline: Array<[lon: number, lat: number]>;
	private roadSegmentsLayer: RoadNetworkLayer<RouteSegment>;
	private floodedSegments: Array<any> = [];

	private elapsedTime: Writable<number> = writable(0);
	public evacuations: Writable<Array<Evacuation>> = writable([]);

	private hoveredNode: Writable<ExtractionPoint | BottleNeck | undefined> = writable(undefined);
	private nodeHoverBox: NodeHoverBox | undefined;
	public sensorHoverBoxTimeOut: NodeJS.Timeout | undefined;

	constructor(map: Map, elapsedTime: Writable<number>, evacuations: Writable<Array<Evacuation>>, outline: Array<[lon: number, lat: number]>) {
		this.map = map;
		this.elapsedTime = elapsedTime;
		this.evacuations = evacuations;
		this.routingAPI = new RoutingAPI();
		this.exctractionPointLayer = new RoadNetworkLayer<ExtractionPoint>(map);
		this.bottleneckLayer = new RoadNetworkLayerP<BottleNeck>(map);
		this.outline = outline;
		this.roadSegmentsLayer = new RoadNetworkLayer<RouteSegment>(map);
		this.init();

		this.hoveredNode.subscribe((node) => {
			if (node instanceof BottleNeck) {
				this.nodeHoverBox?.$destroy();
				this.nodeHoverBox = new NodeHoverBox({
					target: map.getContainer(),
					props: {
						node: node,
						roadNetwork: this
					}
				});
			} else {
				this.sensorHoverBoxTimeOut = setTimeout(() => this.nodeHoverBox?.$destroy(), 400);
			}
		});
	}

	private init(): void {
		this.loadExtractionPoints();
		//this.loadBottlenecks();
		//this.loadRoadNetwork();
		this.elapsedTime.subscribe((currentTime: number) => {
			this.routingAPI.updateFloodedSegments(currentTime);
			// set capacities for the next step connected to the current step
		});
		this.evacuations.subscribe(() => {
			this.updateBottleneckCapacities();
		});
	}

	private loadExtractionPoints(): void {
		const extractionPoints = extractionPointsConfig;
		extractionPoints.forEach((point) => {
			const extractionPoint = new ExtractionPoint(point.id, point.position.lon, point.position.lat, this.selectedExtractionPoint);
			this.extractionPoints.push(extractionPoint);
			this.exctractionPointLayer.add(extractionPoint);
		});
	}

	private loadBottlenecks(): void {
		const bottlenecks = bottlenecksConfig;
		bottlenecks.forEach((bottleneck) => {
			const newBottleneck = new BottleNeck(bottleneck.id, bottleneck.position.lon, bottleneck.position.lat, bottleneck.capacity);
			this.bottlenecks.push(newBottleneck);
			this.bottleneckLayer.add(newBottleneck);
		});
	}

	private async loadRoadNetwork(): Promise<void> {
		const res = await fetch("/data/zeeland/car/edges.geojson");
		const geojson = await res.json();
		geojson.features.forEach((feature: IRoadSegmentFeature) => {
			//@ts-ignore
			if (feature.geometry.type === "MultiLineString") {
				feature.geometry.type = "LineString";
				//@ts-ignore
				feature.geometry.coordinates = feature.geometry.coordinates.flat();
			}
			const routeSegment = new RouteSegment(feature);
			this.roadSegmentsLayer.add(routeSegment);
		});
	}

	public async createEvacuationRoute(origin: [lon: number, lat: number]): Promise<{ route: Array<RouteFeature>, extractionPoint: ExtractionPoint, bottlenecks: Array<BottleNeck> } | undefined> {
		const selectedExtractionPoint = get(this.selectedExtractionPoint);
		if (!selectedExtractionPoint) {
			return;
		}
		const extractionLocation: [lon: number, lat: number] = [
			selectedExtractionPoint.lon,
			selectedExtractionPoint.lat
		];
		const route = await this.routingAPI.getRoute(origin, extractionLocation);

		// update capacities

		// remove nodes that are full



		// check for bottlenecks, and update the capacity of overlapping bottlenecks
		const hasCapacity = this.routeHasSufficientCapacity(route.features, 100);
		if (hasCapacity.some((item) => !item.hasCapacity)) {
			return undefined;
		}

		return {
			route: route.features,
			extractionPoint: selectedExtractionPoint,
			bottlenecks: hasCapacity.filter((item) => item.hasCapacity).map((item) => item.bottleneck)
		};
	}

	private displayFloodedSegments(): void {
		
	}

	private getBottlenecksOnRoute(route: Array<RouteFeature>): Array<BottleNeck> {
		const distanceThreshold = 1000;
		return this.bottlenecks.filter((bottleneck) => {
			return route.some((routeFeature) => {
				return Cesium.Cartesian3.distance(
					Cesium.Cartesian3.fromDegrees(bottleneck.lon, bottleneck.lat),
					Cesium.Cartesian3.fromDegrees(routeFeature.geometry.coordinates[0][0], routeFeature.geometry.coordinates[0][1])
				) < distanceThreshold;
			});
		});
	}

	private routeHasSufficientCapacity(route: Array<RouteFeature>, evacuees: number): Array<{ bottleneck: BottleNeck, hasCapacity: boolean }> {
		const bottlenecksOnRoute = this.getBottlenecksOnRoute(route);
		const res: Array<{ bottleneck: BottleNeck, hasCapacity: boolean }> = [];
		for (const bottleneck of bottlenecksOnRoute) {
			const hasCapacity = bottleneck.capacity >= evacuees;
			res.push({ bottleneck, hasCapacity });
		}
		return res;
	}

	public updateBottleneckCapacities(): void {
		this.bottlenecks.forEach((bottleneck) => {
			bottleneck.currentLoad = 0; // Reset current load
		});

		get(this.evacuations)
			.filter((evacuation) => evacuation.time === get(this.elapsedTime))
			.forEach((evacuation) => {
				evacuation.includedBottlenecks.forEach((bottleneck) => {
					const currentBottleneck = this.bottlenecks.find((bn) => bn.id === bottleneck.id);
					if (currentBottleneck) {
						const newLoad = currentBottleneck.currentLoad + evacuation.hexagon.population; // Increment the load for each evacuation
						currentBottleneck.updateLoad(newLoad);
					}
				});
		});
	}


	public onLeftClick(picked: any): void {
		// if extraction point is clicked, set it as the selected extraction point
		if (picked?.id instanceof Cesium.Entity) {
			const extractionPoint = this.extractionPoints.find((ep) => ep.entity === picked.id);
			if (extractionPoint) {
				this.selectedExtractionPoint.set(extractionPoint);
			}
		}
	}
}
