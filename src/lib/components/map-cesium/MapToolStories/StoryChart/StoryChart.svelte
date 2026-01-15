<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import { echarts, echartsLoading } from '../echarts';
	import { _ } from "svelte-i18n";

	
	export let data: Array<{ group: string; value: number }> | undefined;
	export let loading: boolean = false;
	export let index: number;

	let cleanData: Array<{ name: string; value: number }> = [];
	let color: Array<string>;
	let toolTipText: string;
	let dataDefined: boolean;


	const hasNonZeroData = data && data.length > 0 && data.some(item => item.value > 0);

	// Data exists and has non-zero values
	if (data && hasNonZeroData) {
		dataDefined = true;
		// Change name 'group' to 'name' for compatibility with echarts
		cleanData = data.map(item => ({ name: item.group, value: item.value }));
		color = ['#339966', '#99ffcc', '#ffff99', '#ffcc66', '#9c4110']; // A B C D E colors
		toolTipText = '{b}: {d}%'; // Show group name and percentage
	}
	// Data exists but not in project area (all values are 0 or array is empty)
	else if (data && !hasNonZeroData) {
		cleanData = [
			{ name: $_("tools.stories.storyChartNoData"), value: 1 }
		];
		color = ['#cccccc']; // Grey color for no data
		toolTipText = $_("tools.stories.storyChartNoDataInPolygon");
	}
	// No project area defined
	else {
		dataDefined = false;
		cleanData = [
			{ name: $_("tools.stories.storyChartNoData"), value: 1 }
		];
		color = ['#cccccc']; // Grey color for no data
		toolTipText = $_("tools.stories.requestDrawPolygon");
	}

	let option: EChartsOption = {
		color: color, 
		title: {
			text: $_("tools.stories.storyChartTitle"),
			left: 0
		},
		tooltip: {
			trigger: 'item',
			formatter: toolTipText
		},
		legend: {
			orient: 'vertical',
			left: 0,
			padding: 10,
			top: 'center',
			formatter: '{name}' // Show group name
		},
		series: [
			{
				type: 'pie',
				radius: ['50%', '90%'],
				avoidLabelOverlap: false,
				label: {
					show: false,
					position: 'center'
				},
				emphasis: {
					label: {
						show: true,
						fontSize: 20,
						fontWeight: 'bold'
					}
				},
				labelLine: {
					show: false
				},
				data: cleanData,
				animationDuration: 0,
			}
		]
	};
</script>

{#if loading}
	<div class={"container"} use:echartsLoading={option} />
{:else}
	<div class={"container"} use:echarts={{ option: option, index: index, dataDefined: dataDefined }} />
{/if}

<style>
	.container {
		width: 100%;
		height: 200px;
	}
</style>