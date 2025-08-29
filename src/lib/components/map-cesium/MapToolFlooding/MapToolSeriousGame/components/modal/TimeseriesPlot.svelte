<script lang="ts">
	import * as Plot from "@observablehq/plot";

	export let victims: Array<{ time: number; value: number }>;
	export let evacuated: Array<{ time: number; value: number }>;

	
	let plot: any;

	const maxX = [...victims, ...evacuated].reduce((max, d) => Math.max(max, d.time), 0);
	const maxY = [...victims, ...evacuated].reduce((max, d) => Math.max(max, d.value), 0);

	function getColor(i: number): string {
		const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"];
		return colors[i % colors.length];
	}

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
			label: "Number of people",
			domain: [0, maxY + maxY * 0.1]
		},
		x: {
			grid: true,
			label: "Time (hours)",
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
				{ stroke: "lightgrey", strokeWidth: 3 }
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