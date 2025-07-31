<script lang="ts">
	import { echarts, echartsLoading } from './echarts';
	import { _ } from "svelte-i18n";
	
	export let data: Array<{ group: string; value: number }> | undefined;
	export let loading: boolean = false;

	let cleanData: Array<{ name: string; value: number }> = [];
	let color: Array<string>;
	let toolTipText: string;

	if (data) {
		// Change name 'group' to 'name' for compatibility with echarts
		cleanData = data.map(item => ({ name: item.group, value: item.value }));
		color = ['#339966', '#99ffcc', '#ffff99', '#ffcc66', '#9c4110']; // A B C D E colors
		toolTipText = '{b}: {d}%'; // Show group name and percentage
	}
	else {
		cleanData = [
			{ name: $_("tools.stories.storyChartNoData"), value: 0 }
		];
		color = ['#cccccc']; // Grey color for no data
		toolTipText = $_("tools.stories.requestDrawPolygon");
	}

	let option = {
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
				data: cleanData
			}
		]
	};
</script>

{#if loading}
	<div class={"container"} use:echartsLoading={option} />
{:else}
	<div class={"container"} use:echarts={option} />
{/if}

<style>
	.container {
		width: 100%;
		height: 300px;
	}
</style>