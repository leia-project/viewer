import * as charts from 'echarts';


export function echarts(node: any, option: any) {
	const chart: charts.ECharts = charts.init(node);
	chart.setOption(option);
	const chartImage: string = chart.getDataURL({
		type: 'png',
		pixelRatio: 2,
		backgroundColor: '#fff',
    });
}


export function echartsLoading(node: any, option: any) {
	const chart: charts.ECharts = charts.init(node);
	chart.showLoading();
	chart.setOption(option);
}
