<script lang="ts">
	import type { RouteSegment } from "../../module/game-elements/roads/route-segments";

	export let segment: RouteSegment;

	const load = segment.load;

</script>


<div>
	<div>{segment.id}</div>
	<div>Capacity: {segment.capacity}</div>
	<div>Load: {$load}</div>
</div>
