<script lang="ts">
	import type { Map } from "../module/map";
	import { get } from "svelte/store";
	import { Location } from "$lib/components/map-core/location";

	export let map: Map;

	//let lonLat: Location = new Location(0, 0);
	//$: lon = lonLat.x.toFixed(5);
	//$: lat = lonLat.y.toFixed(5);
	let position: any;
	let layers: Array<any>;

	map.ready.subscribe((r) => {
		if (r) {
			addLoadListener();
		}
	});

	function addLoadListener() {
		map.on("mouseMove", (m: any) => {
			try {
				const camPos = map.getPosition();
				const visibleLayers = get(map.layers).filter((l) => {
					return get(l.visible);
				});
				layers = visibleLayers.map((l) => {
					return { title: l.title, id: l.id };
				});
				position = map.getPosition();
			} catch (e) {}
		});
	}
</script>

<div class="wrapper">
	{#if layers}
        <div class="layers">
            {#each layers as layer}
            <div>
                {layer.title} - {layer.id}
            </div>
            {/each}
        </div>
	{/if}

    {#if position}
    <div class="position">
        {@html
            `{<br>
                &nbsp;&nbsp;&nbsp;&nbsp;"x": ${position.x.toFixed(5)},<br>
                &nbsp;&nbsp;&nbsp;&nbsp;"y": ${position.y.toFixed(5)},<br>
                &nbsp;&nbsp;&nbsp;&nbsp;"z": ${position.z.toFixed(5)},<br>
                &nbsp;&nbsp;&nbsp;&nbsp;"heading": ${position.heading.toFixed(5)},<br>
                &nbsp;&nbsp;&nbsp;&nbsp;"pitch": ${position.pitch.toFixed(5)},<br>
                &nbsp;&nbsp;&nbsp;&nbsp;"duration": ${position.duration.toFixed(2)}<br>
            }`
        }
	   
    </div>
    {/if}
</div>

<style>
	.wrapper {
		font-size: var(--tosti-font-size-small);
		vertical-align: middle;
		text-align: center;
		color: var(--cds-ui-01);
		background-color: var(--cds-ui-05);
		z-index: 10;
		padding: var(--cds-spacing-02);     
        text-align: left;   
	}

    .layers {
        display: flex;
        flex-direction: column;
    }

    .position {
        padding-top: var(--cds-spacing-05);
    }
</style>
