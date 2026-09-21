<script lang="ts">
	import { getContext, onDestroy, onMount } from "svelte";
	import { get } from "svelte/store";
	import { TableAlias } from "carbon-icons-svelte";

	import { MapToolMenuOption } from "../MapToolMenuOption";
	import { parseZonalStatisticsSettings } from "./zonal-config";
	import { ZonalStatisticsController } from "./zonal-statistics-controller";
	import ZonalStatisticsPanel from "./ZonalStatisticsPanel.svelte";
	import ZonalStatisticsView from "./ZonalStatisticsView.svelte";

	export let id: string;
	export let label: string;
	export let icon: any = TableAlias;

	const {
		registerTool,
		selectedTool,
		map,
		getMapContainer,
		disableInteractionFromOtherTools,
		enableInteractionsFromOtherTools
	} = getContext<any>("mapTools");

	const tool = new MapToolMenuOption(id, icon, label, false);
	registerTool(tool);

	let controller: ZonalStatisticsController | undefined;
	let view: ZonalStatisticsView | undefined;
	let configLoadedUnsub: (() => void) | undefined;
	let zoneLayerWasVisible: boolean | undefined;
	// Store the visibility state of all visible layers before opening the tool, so they can be restored
	let visibleLayersBeforeTool: Map<string, boolean> = new Map();

	onMount(() => {
		if (!map) return;

		configLoadedUnsub = map.configLoaded.subscribe((loaded: boolean) => {
			if (!loaded || !map.ready || controller) return;

			const toolConfig = map.config.tools.find((t: any) => t.id === id);
			const settings = parseZonalStatisticsSettings(toolConfig?.settings);
			if (!settings) return;

			controller = new ZonalStatisticsController(map, settings);
			controller.initialize();
			// Activate now if the tool was already selected before the controller was ready.
			if ($selectedTool === tool) setActive(true);
		});
	});

	onDestroy(() => {
		configLoadedUnsub?.();
		destroyView();
		controller?.destroy();
		visibleLayersBeforeTool.clear();
	});

	// Activate selection + show the floating table while the tool is open.
	$: setActive($selectedTool === tool);

	function setActive(active: boolean): void {
		if (!controller) return;
		controller.active.set(active);
		if (active) {
			disableInteractionFromOtherTools(id);
			enableConfiguredLayers();
			showView();
		} else {
			enableInteractionsFromOtherTools();
			restoreConfiguredLayers();
			destroyView();
			controller.clearSelection();
			controller.clearTableLayers();
		}
	}

	// Open with the zone geometry drawn and the first configured layer as the table's first row.
	function enableConfiguredLayers(): void {
		if (!controller) return;

		// Store and hide all currently visible layers that are configured in this tool's settings
		// (except zone layer and background layers) so the focus is on the zonal statistics
		const allLayers = get(map.layers);
		const zoneLayerId = controller.settings.zoneLayerId;
		const configuredLayerIds = controller.settings.layers.map((l: any) => l.id);
		visibleLayersBeforeTool.clear();
		for (const layer of allLayers) {
			if (!configuredLayerIds.includes(layer.config.id)) continue; // Only hide layers configured in this tool
			if (layer.config.id === zoneLayerId) continue; // Don't hide/track the zone layer
			if (layer.config.isBackground === true) continue; // Don't hide background layers
			const isVisible = get(layer.visible);
			if (isVisible) {
				visibleLayersBeforeTool.set(layer.config.id, true);
				layer.visible.set(false);
			}
		}

		// The zone layer carries the geometry every data layer is painted onto, so it stays on while
		// the tool is open. The data layers are attribute joins and are never switched on.
		const zoneLayer = map.getLayerById(zoneLayerId);
		if (!zoneLayer) {
			console.warn(`zonalStatistics: zone layer '${zoneLayerId}' not found while activating`);
		} else {
			zoneLayerWasVisible = get(zoneLayer.visible);
			zoneLayer.visible.set(true);
		}

		// The tool's dataset is only downloaded and drawn once the user actually opens it.
		void controller.prepare();

		const first = controller.settings.layers[0]?.id;
		if (!first) return;
		controller.selectLayer(first);
		controller.addTableLayer(first);
	}

	// Restore layers to their visibility state before the tool was opened.
	function restoreConfiguredLayers(): void {
		if (!controller) return;

		// Restore all layers that were visible before the tool was activated
		for (const [layerId] of visibleLayersBeforeTool) {
			const layer = map.getLayerById(layerId);
			if (layer) {
				layer.visible.set(true);
			}
		}
		visibleLayersBeforeTool.clear();

		// Restore the zone layer to its original visibility
		if (zoneLayerWasVisible !== undefined) {
			map.getLayerById(controller.settings.zoneLayerId)?.visible.set(zoneLayerWasVisible);
			zoneLayerWasVisible = undefined;
		}
		controller.selectedLayerId.set(undefined);
	}

	function showView(): void {
		if (view || !controller) return;
		view = new ZonalStatisticsView({
			target: getMapContainer(),
			props: { controller, title: label }
		});
		view.$on("remove", () => {
			destroyView();
			controller?.clearSelection();
			selectedTool.set(undefined);
		});
	}

	function destroyView(): void {
		if (view) {
			view.$destroy();
			view = undefined;
		}
	}
</script>

{#if $selectedTool === tool && controller}
	<ZonalStatisticsPanel {controller} />
{/if}
