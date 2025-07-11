<script lang="ts">
	import { echarts } from './echarts';
	import { _ } from "svelte-i18n";
	
	export let data: Array<{ group: string; value: number }>;

	// Change name 'group' to 'name' for compatibility with echarts
	let cleanData = data.map(item => ({ name: item.group, value: item.value }));
	
	let option = {
		color: ['#339966', '#99ffcc', '#ffff99', '#ffcc66', '#9c4110'], 
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

<div class={"container"} use:echarts={option} />

<style>
	.container {
		width: 100%;
		height: 300px;
	}
</style>