<script lang="ts">
	import { get } from "svelte/store";
	import type { Map } from "$lib/map-cesium/map";
	import type { CameraLocation } from "$lib/map-core/camera-location";

	export let map: Map;

	let position: CameraLocation;
	let layers: Array<any>;

	map.ready.subscribe((r) => {
		if (r) {
			addLoadListener();
		}
	});

	function addLoadListener() {
		map.on("mouseMove", (m: any) => {
			try {
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
