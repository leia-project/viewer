<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { _ } from "svelte-i18n";
	import { GameConsole } from "carbon-icons-svelte";
	import type { Game } from "../../module/game";
	import TimeseriesPlot from "./TimeseriesPlot.svelte";
	import GameButton from "../general/GameButton.svelte";

	export let game: Game;

	const dispatch = createEventDispatcher();

	const segments = game.evacuationController.roadNetwork.roadNetworkLayer.mostLoadedSegments(10);

</script>


<div id="final-report-container">
	<div class="final-report-title">{$_("game.finalReport.title")}</div>

	<div class="score-breakdown">
		<div class="breakdown-item">
			<div>{$_("game.evacuated")}:</div>
			<div>{(game.report.evacuatedNeeded + game.report.evacuatedUnneeded).toLocaleString("nl-NL")}</div>
		</div>
		<div class="breakdown-item">
			<div>{$_("game.victims")}:</div>
			<div>{game.report.victims.toLocaleString("nl-NL")}</div>
		</div>
		<div class="breakdown-item">
			<div>{$_("game.finalReport.percentageEvacuated")}</div>
			<div>{(game.report.evacuatedRequired - game.report.victims) / game.report.evacuatedRequired * 100 || 0}%</div>
		</div>
		<div class="breakdown-item">
			<div>{$_("game.finalReport.unneededEvacuated")}:</div>
			<div>{game.report.evacuatedUnneeded.toLocaleString("nl-NL")}</div>
		</div>
	</div>
	<div class="final-score">
		<span>{$_("game.finalReport.finalScore")}</span>
		<div class="stars">
			{#each Array(5) as _, i}
				<span class="star {i * 2 < game.report.score ? 'filled' : ''}">★</span>
			{/each}
		</div>
		<span>({game.report.score}/10)</span>
	</div>

	<div class="final-details">
		{#if game.timeseriesVictims.length > 0 || game.timeseriesEvacuated.length > 0}
			<TimeseriesPlot
				victims={game.timeseriesVictims}
				evacuated={game.timeseriesEvacuated}
			/>
		{/if}
	</div>

	<!--
	<div class="measures">
		Measures taken: ...
		Costs: ...
	</div>
	-->

	<div class="final-report-section-title">{$_("game.bottlenecks")}</div>
	<div class="bottlenecks">
		<!-- list of worst load/capacity road segments -->
		<!-- dropdown with road segments with loads -->
		 {#each segments as segment}
			<div class="breakdown-item">
				<span>{segment.feature.properties.name || segment.feature.properties.fid}</span>
				<span>{Math.round(segment.peakLoad)}</span>
			</div>
		{/each}
	</div>

	<div class="return-button">
		<GameButton
			buttonText={$_("game.finalReport.returnToGame")}
			icon={GameConsole}
			borderHighlight={true}
			hasTooltip={false}
			on:click={() => dispatch("close")}
		/>
	</div>
</div>


<style>

	#final-report-container {
		padding: 1rem;
		font-size: 1.1rem;
	}

	.final-report-title {
		font-size: 1.5rem;
		font-weight: bold;
		margin-bottom: 1rem;
	}

	.score-breakdown, .bottlenecks {
		max-width: 400px;
		border-top: 1px solid var(--game-color-highlight);
		padding-top: 0.5rem;
	}

	.breakdown-item {
		display: flex;
		justify-content: space-between;
	}
	
	.final-score {
		display: flex;
		align-items: center;
		column-gap: 1rem;
		font-weight: 600;
		margin-top: 0.5rem;
	}

	.star {
		font-size: 1.5rem;
		color: gray;
	}
	.star.filled {
		color: gold;
	}

	.final-report-section-title {
		font-size: 1.2rem;
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.return-button {
		text-align: right;
	}

</style>