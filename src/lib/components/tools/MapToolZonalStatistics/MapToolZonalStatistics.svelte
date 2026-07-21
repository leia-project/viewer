<script lang="ts">
	import { getContext, onMount } from "svelte";
	import { TableAlias } from "carbon-icons-svelte";
	import { _ } from "svelte-i18n";

	import { MapToolMenuOption } from "../MapToolMenuOption";
	import { parseZonalStatisticsSettings } from "./zonal-config";
	import { ZonalStatisticsController } from "./zonal-statistics-controller";
	import ZonalStatisticsView from "./ZonalStatisticsView.svelte";

	export let id: string;
	export let label: string;
	export let icon: any = TableAlias;

	const { registerTool, selectedTool, map, getMapContainer } = getContext<any>("mapTools");

	const tool = new MapToolMenuOption(id, icon, label, false);
	registerTool(tool);

	let controller: ZonalStatisticsController | undefined;
	let view: ZonalStatisticsView | undefined;

	onMount(() => {
		if (!map) return;

		map.configLoaded.subscribe((loaded: boolean) => {
			if (!loaded || !map.ready || controller) return;

			const toolConfig = map.config.tools.find((t: any) => t.id === id);
			const settings = parseZonalStatisticsSettings(toolConfig?.settings);
			if (!settings) return;

			controller = new ZonalStatisticsController(map, settings);
			controller.initialize();
		});
	});

	// Activate selection + show the floating passport while the tool is open.
	$: setActive($selectedTool === tool);

	function setActive(active: boolean): void {
		if (!controller) return;
		controller.active.set(active);
		if (active) {
			showView();
		} else {
			destroyView();
			controller.clearSelection();
		}
	}

	function showView(): void {
		if (view || !controller) return;
		view = new ZonalStatisticsView({
			target: getMapContainer(),
			props: { controller }
		});
		view.$on("remove", () => {
			destroyView();
			controller?.clearSelection();
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
	<div class="container">
		<p class="body-compact-01">{$_("tools.zonalStatistics.noSelection")}</p>
	</div>
{/if}

<style>
	.container {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
	}
</style>
