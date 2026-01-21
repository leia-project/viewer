<script lang="ts">
	import { getContext, onMount } from "svelte";
	import { _ } from "svelte-i18n";
    import Car from "carbon-icons-svelte/lib/Car.svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import DrawIsochrones from "./DrawIsochrones.svelte";
	import ControlIsochroneStyles from "./ControlIsochroneStyles.svelte";
	import { IsochronesLayer } from "./isochrones-layer";
	import IsochronesLegend from "./IsochronesLegend.svelte";
	import ControlIsochroneValueRange from "./ControlIsochroneValueRange.svelte";


	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	export let label: string | undefined;

  	$: label = label ?? "Isochrones";


	const id: string = "isochrones";
	const icon: any = Car;
	const showOnBottom: boolean = false;

	const tool = new MapToolMenuOption(id, icon, label, showOnBottom);
	$: { tool.label.set(label); }
	registerTool(tool);

	let isochronesLayer: IsochronesLayer;
	// let startWeights: Array<number> = [0.5, 0.3, 0.2];

	onMount(() => {
		console.log("MapToolIsochrones mounted");
		if (map) {
			map.ready.subscribe((ready: boolean) => {
				if (ready) isochronesLayer = new IsochronesLayer(map);
			});
		}
	});
    


</script>

{#if $selectedTool === tool}
	{#if isochronesLayer}
		<DrawIsochrones {isochronesLayer} />

		<ControlIsochroneValueRange {isochronesLayer} />

		<ControlIsochroneStyles {isochronesLayer} />

		<IsochronesLegend />
	{/if}
{/if}


  
<style>


</style>
