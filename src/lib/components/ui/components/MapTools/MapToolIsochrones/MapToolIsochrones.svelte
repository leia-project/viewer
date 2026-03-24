<script lang="ts">
	import { _ } from "svelte-i18n";
	import { getContext, onMount } from "svelte";
    import Home from "carbon-icons-svelte/lib/Home.svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import DrawIsochrones from "./DrawIsochrones.svelte";
	import ControlIsochroneStyles from "./ControlIsochroneStyles.svelte";
	import { IsochronesLayer } from "./isochrones-layer";
	import IsochronesLegend from "./IsochronesLegend.svelte";
	import ControlIsochroneValueRange from "./ControlIsochroneValueRange.svelte";
	import IsochronesDisclaimer from "./IsochronesDisclaimer.svelte";
	import { Button } from "carbon-components-svelte";


	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	export let label: string | undefined;

	$: label = label ?? $_('tools.isochrones.label');


	const id: string = "isochrones";
	const icon: any = Home;
	const showOnBottom: boolean = false;

	const tool = new MapToolMenuOption(id, icon, label, showOnBottom);
	$: { tool.label.set(label); }
	registerTool(tool);

	let isochronesLayer: IsochronesLayer;
	// let startWeights: Array<number> = [0.5, 0.3, 0.2];

	onMount(() => {
		if (map) {
			map.configLoaded.subscribe((loaded: boolean) => {
				if (loaded && map.ready) {
					console.log("Map is ready and config is loaded, initializing isochrones layer");
					const isochronesTool = map.config.tools.find((t: any) => t.id === "isochrones");
					const apiUrl = isochronesTool.settings.apiUrl;
					const accountedPopulationGrowthLayerId: string = isochronesTool.settings.accountedPopulationGrowthLayerId;
					const dataAttribute: string = isochronesTool.settings.accountedPopulationGrowthAttribute;
					const dataLayer = map.getLayerById(accountedPopulationGrowthLayerId);
					// if (!(dataLayer && dataLayer.type === "GeoJsonLayer")) {
					// 	throw new Error("accountedPopulationGrowthLayerId must refer to a GeoJsonLayer");
					// }

					isochronesLayer = new IsochronesLayer(map, apiUrl, dataLayer, dataAttribute);
				}
			});
		}
	});

</script>


{#if $selectedTool === tool}
	{#if isochronesLayer}
		<div class="container">
			<DrawIsochrones {isochronesLayer} />

			<ControlIsochroneValueRange {isochronesLayer} />

			<ControlIsochroneStyles {isochronesLayer} />

			<div class="component">
				<IsochronesLegend {isochronesLayer}/>
			</div>
			
			<div class="component">
				<IsochronesDisclaimer />
			</div>

			<div class="component ">
				<Button
					kind="danger"
					on:click={() => {
						isochronesLayer.resetLayer();
					}}
				>
					{$_('tools.isochrones.reset')}
				</Button>
			</div>
		</div>
	{/if}
{/if}


  
<style>
.container {
	margin: 10px;
}

.component {
    margin-bottom: 10px;
}

</style>
