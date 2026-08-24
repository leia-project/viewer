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
	let previousVisibility: Map<string, boolean> | undefined;

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
		}
	}

	// Open with only the zone layer on; the user turns data layers on from the panel.
	function enableConfiguredLayers(): void {
		if (!controller) return;

		const zoneLayerId = controller.settings.zoneLayerId;
		const layerIds = new Set<string>([zoneLayerId]);
		for (const cfg of controller.settings.layers) layerIds.add(cfg.id);

		// Remember what was on before we override the tool's layers.
		previousVisibility = new Map<string, boolean>();
		for (const layerId of layerIds) {
			const layer = map.getLayerById(layerId);
			if (!layer) {
				console.warn(`zonalStatistics: configured layer '${layerId}' not found while activating`);
				continue;
			}

			previousVisibility.set(layerId, get(layer.visible));
			layer.visible.set(layerId === zoneLayerId);
		}
	}

	// Restore each configured layer to the visibility it had before the tool was opened.
	function restoreConfiguredLayers(): void {
		if (!previousVisibility) return;

		for (const [layerId, wasVisible] of previousVisibility) {
			const layer = map.getLayerById(layerId);
			if (!layer) continue;
			layer.visible.set(wasVisible);
		}
		previousVisibility = undefined;
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
