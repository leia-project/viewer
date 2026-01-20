<script lang="ts">
	import { getContext } from "svelte";
	import { _ } from "svelte-i18n";
    import Car from "carbon-icons-svelte/lib/Car.svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import DrawIsochrones from "./DrawIsochrones.svelte";
	import ControlIsochroneStyles from "./ControlIsochroneStyles.svelte";
	import { IsochronesLayer } from "./isochrones-layer";


	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	export let label: string | undefined;

  	$: label = label ?? "Isochrones";


	const id: string = "isochrones";
	const icon: any = Car;
	const showOnBottom: boolean = false;

	const tool = new MapToolMenuOption(id, icon, label, showOnBottom);
	$: { tool.label.set(label); }
	registerTool(tool);

	
	const isochronesLayer = new IsochronesLayer(map);

    


</script>

{#if $selectedTool === tool}
	<DrawIsochrones {isochronesLayer} />

	<ControlIsochroneStyles {isochronesLayer} />
{/if}


  
<style>


</style>
