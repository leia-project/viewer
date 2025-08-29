<script lang="ts">
	import type { Writable } from "svelte/store";
	import { Road, ToolKit } from "carbon-icons-svelte";
	import type { Map } from "../../external-dependencies";
	import { RouteSegment } from "../../module/game-elements/roads/route-segments";
	import { Measure } from "../../module/game-elements/roads/measure";
	import RouteSegmentInfo from "./RouteSegmentInfo.svelte";
	import InfoBox from "./InfoBox.svelte";
	import type { NotificationLog } from "../../module/notification-log";
	import MeasureInfo from "./MeasureInfo.svelte";

	export let node: RouteSegment | Measure;
	export let store: Writable<RouteSegment | Measure | undefined>;
	export let selectStore: Writable<RouteSegment | Measure | undefined> | undefined = undefined;
	export let hoverStore: Writable<RouteSegment | Measure | undefined> | undefined = undefined;
	export let timeout: NodeJS.Timeout | undefined;
	export let map: Map;
	export let type: "hover" | "selected";
	export let notificationLog: NotificationLog;

	const isExtractionPoint = node instanceof RouteSegment && node.extractionPoint;

	const icon = node instanceof Measure ? ToolKit 
		: isExtractionPoint ? Road
		: Road;

</script>


<InfoBox
	item={node}
	{store}
	{timeout}
	{map}
	{type}
	{icon}
	{selectStore}
	{hoverStore}
>
	{#if node instanceof RouteSegment}
		<RouteSegmentInfo segment={node} />
	{:else if node instanceof Measure}
		<MeasureInfo measure={node} {notificationLog} {type} />
	{/if}
</InfoBox>


<style>

</style>