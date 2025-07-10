<script lang="ts">
	import { echarts } from './echarts';
	import { _ } from "svelte-i18n";
	
	export let data: Array<{ group: string; value: number }>;

	//change name 'group' to 'name' for compatibility with echarts
	let cleanData = data.map(item => ({ name: item.group, value: item.value }));
	
	let option = {
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
			left: 0, // Increased from 0 to 20 for more space on the right
			padding: 10,
			top: 'center',
			formatter: '{name}' // Show group name
		},
		series: [
			{
				type: 'pie',
				radius: ['50%', '90%'], // Increased inner and outer radius
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

<div class={"container"} use:echarts={option} />

<style>
	.container {
		width: 100%;
		height: 300px;
	}
</style>