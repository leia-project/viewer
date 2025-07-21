import * as charts from 'echarts';

export function echarts(node: any, option: any) {
	const chart = charts.init(node);
	chart.setOption(option);
}

export function echartsLoading(node: any, option: any) {
	const chart = charts.init(node);
	chart.showLoading();
	chart.setOption(option);
}