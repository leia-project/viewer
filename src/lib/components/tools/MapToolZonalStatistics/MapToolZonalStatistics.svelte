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
	let visibleLayersBeforeTool: Set<string> = new Set();

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
			hideMapLayers();
			showView();
		} else {
			enableInteractionsFromOtherTools();
			restoreMapLayers();
			destroyView();
			controller.clearSelection();
			controller.clearTableLayers();
		}
	}

	// Hide every other layer so only the zones are drawn, and open with the first configured layer as the table's first row.
	function hideMapLayers(): void {
		if (!controller) return;

		const zoneLayerId = controller.settings.zoneLayerId;
		visibleLayersBeforeTool.clear();
		for (const layer of get<any[]>(map.layers)) {
			if (layer.config.id === zoneLayerId || layer.config.isBackground === true) continue;
			if (!get(layer.visible)) continue;
			visibleLayersBeforeTool.add(layer.config.id);
			layer.visible.set(false);
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
	function restoreMapLayers(): void {
		if (!controller) return;

		for (const layerId of visibleLayersBeforeTool) {
			map.getLayerById(layerId)?.visible.set(true);
		}
		visibleLayersBeforeTool.clear();

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
