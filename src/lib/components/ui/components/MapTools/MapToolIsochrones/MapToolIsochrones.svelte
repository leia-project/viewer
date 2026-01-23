<script lang="ts">
	import { _ } from "svelte-i18n";
	import { getContext, onMount } from "svelte";
    import Car from "carbon-icons-svelte/lib/Car.svelte";
	import { MapToolMenuOption } from "$lib/components/ui/components/MapToolMenu/MapToolMenuOption";
	import DrawIsochrones from "./DrawIsochrones.svelte";
	import ControlIsochroneStyles from "./ControlIsochroneStyles.svelte";
	import { IsochronesLayer } from "./isochrones-layer";
	import IsochronesLegend from "./IsochronesLegend.svelte";
	import ControlIsochroneValueRange from "./ControlIsochroneValueRange.svelte";
	import { Button } from "carbon-components-svelte";


	const { registerTool, selectedTool, map } = getContext<any>("mapTools");

	export let label: string | undefined;

	$: label = label ?? $_('tools.isochrones.label');


	const id: string = "isochrones";
	const icon: any = Car;
	const showOnBottom: boolean = false;

	const tool = new MapToolMenuOption(id, icon, label, showOnBottom);
	$: { tool.label.set(label); }
	registerTool(tool);

	let isochronesLayer: IsochronesLayer;
	// let startWeights: Array<number> = [0.5, 0.3, 0.2];

	onMount(() => {
		if (map) {
			map.ready.subscribe((ready: boolean) => {
				if (ready) isochronesLayer = new IsochronesLayer(map);
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
	/* border: 1px solid var(--cds-ui-03); */
}

.component {
    margin-bottom: 10px;
}

</style>
