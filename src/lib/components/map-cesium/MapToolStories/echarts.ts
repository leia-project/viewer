import * as charts from 'echarts';
import jsPDF from 'jspdf';


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


// TODO: Find way to move this image to storyview
export function echartsGetImage(option: any): string {
	const chart: charts.ECharts = charts.init();
	chart.setOption(option);
	const chartImage: string = chart.getDataURL({
		type: 'png',
		pixelRatio: 2,
		backgroundColor: '#fff',
	});

	return chartImage;
}