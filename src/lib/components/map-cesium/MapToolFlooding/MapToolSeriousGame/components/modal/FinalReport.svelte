<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { _ } from "svelte-i18n";
	import { GameConsole } from "carbon-icons-svelte";
	import type { Game } from "../../module/game";
	import TimeseriesPlot from "./TimeseriesPlot.svelte";
	import GameButton from "../general/GameButton.svelte";
	import { get } from "svelte/store";

	export let game: Game;

	const dispatch = createEventDispatcher();

	const { needed, unneeded } = game.timeseriesEvacuatedSplit;

	const segments = game.evacuationController.roadNetwork.roadNetworkLayer.mostLoadedSegments(10);
	const measures = game.evacuationController.roadNetwork.measures;

</script>


<div id="final-report-container">
	<div class="final-report-title">{$_("game.finalReport.title")}</div>

	<div class="two-column">
		<div class="final-report-section">
			<div class="final-report-section-title">{$_("game.finalReport.summary")}</div>
			<div class="breakdown-item">
				<div>{$_("game.evacuated")}</div>
				<div>{(game.report.evacuatedNeeded + game.report.evacuatedUnneeded).toLocaleString("nl-NL")}</div>
			</div>
			<div class="breakdown-item">
				<div>{$_("game.victims")}</div>
				<div>{game.report.victims.toLocaleString("nl-NL")}</div>
			</div>
			<div class="breakdown-item">
				<div>{$_("game.finalReport.percentageEvacuated")}</div>
				<div>{Math.round((game.report.evacuatedRequired - game.report.victims) / game.report.evacuatedRequired * 100) || 0}%</div>
			</div>
			<div class="breakdown-item">
				<div>{$_("game.finalReport.unneededEvacuated")}</div>
				<div>{game.report.evacuatedUnneeded.toLocaleString("nl-NL")}</div>
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
		</div>

		<div class="final-report-section">
			<div class="final-report-section-title">{$_("game.bottlenecks")}</div>
			<div class="breakdown-item header">
				<span>{$_("game.road")}</span>
				<span>{$_("game.finalReport.maxCarLoad")}</span>
			</div>
			{#each segments as segment}
				<div class="breakdown-item">
					<span>{segment.feature.properties.name || segment.feature.properties.fid}</span>
					<span>{Math.round(segment.peakLoad)}</span>
				</div>
			{/each}
		</div>

			
		<div class="final-report-section">
			<div class="final-report-section-title">{$_("game.finalReport.measuresTaken")}</div>
			{#if measures.filter(m => get(m.applied)).length === 0}
				<div>{$_("game.finalReport.noMeasuresApplied")}</div>
			{/if}
			{#each measures as measure}
				{#if get(measure.applied)}
					<div class="breakdown-item">
						<span>{measure.config.name}</span>
					</div>
				{/if}
			{/each}
		</div>

	</div>

	<div class="timeseries">
		<div class="final-report-section-title">{$_("game.finalReport.progressOverTime")}</div>
		{#if game.timeseriesVictims.length > 1 || needed.length > 1 || unneeded.length > 1}
			<TimeseriesPlot
				victims={game.timeseriesVictims}
				evacuated={needed}
				evacuatedUnneeded={unneeded}
			/>
		{/if}
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

	.two-column {
		display: flex;
		column-gap: 5rem;
	}

	.final-report-section {
		max-width: 400px;
		border-top: 1px solid var(--game-color-highlight);
	}
	
	.final-report-section-title {
		font-size: 1.2rem;
		font-weight: 600;
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.breakdown-item {
		display: flex;
		justify-content: space-between;
		column-gap: 4rem;
	}
	.breakdown-item.header {
		font-weight: 500;
		color: var(--game-color-highlight);
		border-bottom: 1px solid var(--game-color-highlight);
		padding-bottom: 0.25rem;
		margin-bottom: 0.25rem;
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

	.return-button {
		text-align: right;
	}

</style>