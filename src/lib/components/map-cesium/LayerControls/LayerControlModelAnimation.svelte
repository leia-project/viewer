<script lang="ts">
	import { _ } from "svelte-i18n";
	import { getContext } from 'svelte';
	import { Button } from 'carbon-components-svelte';
	import ZoomIn from "carbon-icons-svelte/lib/ZoomIn.svelte";
	import AssetView from "carbon-icons-svelte/lib/AssetView.svelte";
	import Network_4 from "carbon-icons-svelte/lib/Network_4.svelte";
	import PauseFilled from "carbon-icons-svelte/lib/PauseFilled.svelte";
	import PlayFilledAlt from "carbon-icons-svelte/lib/PlayFilledAlt.svelte";

	import type { ModelAnimation } from '../module/layers/model-animation';

	const { map } = getContext<any>("mapTools");

	export let layer: ModelAnimation;


	$: animating = map.options.animate;
	$: showAnimationWidget = map.options.showAnimationWidget;

	$: showWayPoints = layer.showWayPoints;
	$: tracking = layer.tracking;


	function toggleAnimate(): void {
		map.options.animate.set(!$animating);
		if ($animating && !showAnimationWidget) map.options.showAnimationWidget.set(true);
	}


</script>

<div class="model-animation-controls">
	<Button
		kind="secondary"
		size="small"
		iconDescription={$animating ?  $_('animation.pause') : $_('animation.play')}
		icon={$animating ? PauseFilled : PlayFilledAlt}
		on:click={toggleAnimate}
	/>
	<Button
		icon={Network_4}
		iconDescription={$showWayPoints ? $_('animation.hideWayPoints') : $_('animation.showWayPoints')}
		size="small"
		on:click={() => layer.showWayPoints.set(!$showWayPoints)}
	/>
	<Button
		iconDescription={$tracking ? $_('animation.stopTracking') : $_('animation.trackModel')}
		icon={AssetView}
		size="small"
		kind={$tracking ? "danger" : "primary"}
		on:click={() => layer.tracking.set(!$tracking)}
	/>
	<Button
		iconDescription={$_('animation.zoomToModel')}
		icon={ZoomIn}
		size="small"
		tooltipAlignment="end"
		on:click={() => layer.zoomToModel()}
	/>
	
</div>
	

<style>

	.model-animation-controls {
		display: flex;
		justify-content: flex-end;
	}

</style>