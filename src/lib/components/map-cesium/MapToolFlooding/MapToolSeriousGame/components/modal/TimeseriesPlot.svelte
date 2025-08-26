<script lang="ts">
	import * as Plot from "@observablehq/plot";

	export let victims: Array<{ time: number; value: number }>;
	export let evacuated: Array<{ time: number; value: number }>;

	
	let plot: any;

	const maxX = [...victims, ...evacuated].reduce((max, d) => Math.max(max, d.time), 0);

	function getColor(i: number): string {
		const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"];
		return colors[i % colors.length];
	}

	$: plotOptions = {
		//style: `background-color: ${backgroundColor}; color: ${textColor}; font-size: ${fontSize};`,
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
			label: "Number of people"
		},
		x: {
			grid: true,
			label: "Time (hours)",
			//tickFormat: xFormatter,
			domain: maxX ? [0, maxX] : undefined
		},
		marks: [
			[...victims, ...evacuated]
			.map(d => [d.time, d.value] as [number, number])
			.map((line, i) =>
				Plot.line(line, { stroke: getColor(i), strokeWidth: 3 })
				//Plot.line(line, { stroke: d => getColorForXValue(d[0]), strokeWidth: 2 })
			),

/* 			verticalRules.map(({x, stroke, strokeWidth}) => 
				Plot.ruleX([x], { stroke: "rgb(160, 160, 160)", strokeWidth: strokeWidth })
			),

			horizontalRules.map(({y, stroke, strokeWidth}) => 
				Plot.ruleY([y], { stroke, strokeWidth: strokeWidth, strokeDasharray: "6 5" })
			) */
        ]
	};

	function renderPlot(node: HTMLElement) {
		plot = Plot.plot(plotOptions);
		node.appendChild(plot);
	}


</script>


<div class="plot" use:renderPlot />
