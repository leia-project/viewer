<script lang="ts">
	//Note: all still unused, Continue integrating ECharts into Svelte!
	import * as echarts from 'echarts/core';

    // var chartDom = document.getElementById('main')!;
	interface IChartData {
		value: number;
		name: string;
	}

	let chartDataArray: Array<IChartData> = [];
	let charts = [];


	onMount(() => {
		charts = chartDataArray.map((data, index) => {
		const chart = echarts.init(document.getElementById(`donutChart${index}`));
		chart.setOption(option);
		return chart;
		});
	});

    let option = {
		tooltip: {
			trigger: 'item'
		},
		legend: {
			top: '5%',
			left: 'center'
		},
		series: [
			{
			name: 'Access From',
			type: 'pie',
			radius: ['40%', '70%'],
			avoidLabelOverlap: false,
			label: {
				show: false,
				position: 'center'
			},
			emphasis: {
				label: {
				show: true,
				fontSize: 40,
				fontWeight: 'bold'
				}
			},
			labelLine: {
				show: false
			},
			data: [
				{ value: 1048, name: 'Search Engine' },
				{ value: 735, name: 'Direct' },
				{ value: 580, name: 'Email' },
				{ value: 484, name: 'Union Ads' },
				{ value: 300, name: 'Video Ads' }
			]
			}
		]
	};

    option && myChart.setOption(option);
    
</script>


<div>
    Chart goes here
</div>


<style>

</style>