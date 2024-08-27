<script lang="ts">
	import type { Map } from "../module/map";
	import { Location } from "$lib/components/map-core/location";

	export let map: Map;

	let loc: Location = new Location(0, 0, 0);
	$: lon = loc.x.toFixed(5);
	$: lat = loc.y.toFixed(5);
	$: z = loc.z.toFixed(5);

	map.ready.subscribe((r) => {
		if (r) {
			addLoadListener();
		}
	});

	function addLoadListener() {
		map.on("mouseMove", (m: any) => {
			try {
				const location = map.screenToLonLat(m);
				loc = location;
			} catch (e) {}
		});
	}
</script>

<div class="wrapper">
	x: {lon}, y: {lat}, z: {z}
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
	}
</style>
