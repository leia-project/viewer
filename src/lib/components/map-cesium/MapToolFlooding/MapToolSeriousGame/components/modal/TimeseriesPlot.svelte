<script lang="ts">
	import { _ } from "svelte-i18n";
	import * as Plot from "@observablehq/plot";

	export let victims: Array<{ time: number; value: number }>;
	export let evacuated: Array<{ time: number; value: number }>;
	export let evacuatedUnneeded: Array<{ time: number; value: number }>;

	let plot: any;

	const maxX = [...victims, ...evacuated].reduce((max, d) => Math.max(max, d.time), 0);
	const maxY = [...victims, ...evacuated].reduce((max, d) => Math.max(max, d.value), 0);

	$: plotOptions = {
		style: ``,
		monospace: true,
		width: 750,
		height: 300,
		marginTop: 25,
		marginBottom: 40,
		marginRight: 10,
		marginLeft: 45,
		color: {
			legend: false
		},
		y: {
			grid: true,
			label: $_("game.numberOfPeople"),
			domain: [0, maxY + maxY * 0.1]
		},
		x: {
			grid: true,
			label: `${$_("game.menu.timeSinceBreach")} (${$_("game.hours")})`,
			//tickFormat: xFormatter,
			domain: maxX ? [0, maxX] : undefined
		},
		marks: [
			Plot.line(
				victims.map(d => [d.time, d.value]),
				{ stroke: "red", strokeWidth: 3 }
			), 
			Plot.line(
				evacuated.map(d => [d.time, d.value]),
				{ stroke: "lightgreen", strokeWidth: 3 }
			),
			Plot.line(
				evacuatedUnneeded.map(d => [d.time, d.value]),
				{ stroke: "lightgray", strokeWidth: 3 }
			)

			/*
 			verticalRules.map(({x, stroke, strokeWidth}) => 
				Plot.ruleX([x], { stroke: "rgb(160, 160, 160)", strokeWidth: strokeWidth })
			),

			horizontalRules.map(({y, stroke, strokeWidth}) => 
				Plot.ruleY([y], { stroke, strokeWidth: strokeWidth, strokeDasharray: "6 5" })
			)
			*/
		]
	};

	function renderPlot(node: HTMLElement) {
		plot = Plot.plot(plotOptions);
		node.appendChild(plot);
	}


</script>


<div class="plot" use:renderPlot />

<div class="legend">
	<div class="legend-item">
		<div class="legend-color" style="background-color: red;"></div>
		<div class="legend-label">{$_("game.victims")}</div>
	</div>
	<div class="legend-item">
		<div class="legend-color" style="background-color: lightgreen;"></div>
		<div class="legend-label">{$_("game.finalReport.evacuatedRequired")}</div>
	</div>
	<div class="legend-item">
		<div class="legend-color" style="background-color: lightgray;"></div>
		<div class="legend-label">{$_("game.finalReport.unneededEvacuated")}</div>
	</div>
</div>


<style>

	.plot {
		margin-top: 1rem;
	}

	.legend {
		display: flex;
		justify-content: center;
		align-items: center;
		column-gap: 2rem;
		margin-top: 1rem;
		width: 750px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		column-gap: 0.5rem;
	}

	.legend-color {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
	}

	.legend-label {
		font-size: 0.9rem;
		color: var(--game-color-text);
	}

</style>