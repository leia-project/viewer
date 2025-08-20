<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { RouteSegment } from "../../module/game-elements/roads/route-segments";

	export let segment: RouteSegment;

	const load = segment.load;

</script>


<div class="route-segment">
	<div class="route-segment-name">{segment.feature.properties.name}</div>
	<div class="route-segment-info">
		<span class="info-label">{$_("game.maxSpeed")}</span>
		<span class="route-segment-value">
			<span class="value">{segment.feature.properties.maximum_snelheid}</span>
			<span class="unit">km/h</span>
		</span>
	</div>
	<div class="route-segment-info">
		<span class="info-label">{$_("game.capacity")}/{$_("game.hour")}</span>
		<span class="route-segment-value">
			<span class="value">{Math.round(segment.capacityPerHour).toLocaleString('nl-NL')}</span>
			<span class="unit">{$_("game.cars")}</span>
		</span>
	</div>
	<div class="route-segment-info">
		<span class="info-label">{$_("game.capacity")}</span>
		<span class="route-segment-value">
			<span class="value">{Math.round(segment.capacity).toLocaleString('nl-NL')}</span>
			<span class="unit">{$_("game.cars")}</span>
		</span>
	</div>
	<div class="route-segment-info">
		<span class="info-label">{$_("game.load")}</span>
		<span class="route-segment-value">
			<span class="value">{Math.round($load).toLocaleString('nl-NL')}</span>
			<span class="unit">{$_("game.cars")}</span>
		</span>
	</div>
</div>


<style>

	.route-segment {
		display: flex;
		flex-direction: column;
		row-gap: 0.3rem;
	}

	.route-segment-name {
		color: var(--game-color-highlight);
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 0.2rem;
	}

	.route-segment-info {
		display: grid;
		grid-template-columns: 100px 1fr;
	}

	.info-label {
		color: var(--game-color-highlight);
	}

	.route-segment-value {
		display: grid;
		grid-template-columns: 60px auto;
		column-gap: 0.4rem;
	}

	.route-segment-value .value {
		justify-self: flex-end;
	}


</style>