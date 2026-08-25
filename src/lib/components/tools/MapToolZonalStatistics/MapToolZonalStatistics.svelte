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

	onMount(() => {
		if (!map) return;

		configLoadedUnsub = map.configLoaded.subscribe((loaded: boolean) => {
			if (!loaded || !map.ready || controller) return;

			const toolConfig = map.config.tools.find((t: any) => t.id === id);
			const settings = parseZonalStatisticsSettings(toolConfig?.settings);
			if (!settings) return;

			controller = new ZonalStatisticsController(map, settings);
			controller.initialize().then(() => {
				// Activate now if the tool was already selected before the controller was ready.
				if ($selectedTool === tool) setActive(true);
			});
		});
	});

	onDestroy(() => {
		configLoadedUnsub?.();
		destroyView();
		controller?.destroy();
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

		// The zone layer carries the geometry every data layer is painted onto, so it stays on while
		// the tool is open. The data layers are attribute joins and are never switched on.
		const zoneLayer = map.getLayerById(controller.settings.zoneLayerId);
		if (!zoneLayer) {
			console.warn(
				`zonalStatistics: zone layer '${controller.settings.zoneLayerId}' not found while activating`
			);
		} else {
			zoneLayerWasVisible = get(zoneLayer.visible);
			zoneLayer.visible.set(true);
		}

		const first = controller.settings.layers[0]?.id;
		if (!first) return;
		controller.selectLayer(first);
		controller.addTableLayer(first);
	}

	// Restore the zone layer to the visibility it had before the tool was opened.
	function restoreConfiguredLayers(): void {
		if (!controller) return;
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
