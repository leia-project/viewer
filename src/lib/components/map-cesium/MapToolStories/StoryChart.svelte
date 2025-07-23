<script lang="ts">
	import { echarts, echartsLoading } from './echarts';
	import { _ } from "svelte-i18n";
	
	export let data: Array<{ group: string; value: number }> | undefined;
	export let loading: boolean = false;

	let cleanData: Array<{ name: string; value: number }> = [];
	let color: Array<string>;

	if (data) {
		// Change name 'group' to 'name' for compatibility with echarts
		cleanData = data.map(item => ({ name: item.group, value: item.value }));
		color = ['#339966', '#99ffcc', '#ffff99', '#ffcc66', '#9c4110']; // A B C D E colors
	}
	else {
		cleanData = [
			{ name: "No Data", value: 0 }
		];
		color = ['#cccccc']; // Grey color for no data
	}

	let option = {
		color: color, 
		title: {
			text: 'Verdeling per klasse',
			left: 0
		},
		tooltip: {
			trigger: 'item',
			formatter: '{b}: {d}%'
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