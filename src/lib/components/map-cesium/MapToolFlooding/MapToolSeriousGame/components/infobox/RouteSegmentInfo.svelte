<script lang="ts">
	import type { RouteSegment } from "../../module/game-elements/roads/route-segments";

	export let segment: RouteSegment;

	const elapsedTime = segment.elapsedTime;
	$: currentLoad = segment.loadPerTimeStep.get($elapsedTime);

</script>


<div>
	<div>{segment.id}</div>
	<div>Capacity: {segment.capacity}</div>
	<div>Load: {currentLoad}</div>
	<div>List with evacuations</div>
</div>
