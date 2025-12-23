<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import { echarts, echartsLoading } from '../echarts';
	import * as charts from 'echarts';

	import { _ } from "svelte-i18n";

	// import { doc } from "./StoryChartDownloadButton.svelte";
	// $: { console.log("Imported doc:", doc.getCreationDate()) };

	// function addChartImageToPage(image: any, pageIndex: number) {
    //     doc.setPage(pageIndex);
    //     doc.addImage(image, 'PNG', 15, 40, 180, 100); // Adjust position and size as needed
    // }

	
	export let data: Array<{ group: string; value: number }> | undefined;
	export let loading: boolean = false;
	export let chartImages: Array<string>;

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
				data: cleanData
			}
		]
	};

	function echartsGetImage(option: EChartsOption): string {
		const chart: charts.ECharts = charts.init();
		chart.setOption(option);
		const chartImage: string = chart.getDataURL({
			type: 'png',
			pixelRatio: 2,
			backgroundColor: '#fff',
		});

		return chartImage;
	}

	// TODO: Causes error for some reason
	// if (chartImages) {
    // 	chartImages = [...chartImages, echartsGetImage(option)];
	// }
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