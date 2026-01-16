import * as charts from 'echarts';
import { exportDataPages } from './StoryChart/StoryChartExportDataPages';


export function echarts(node: any, params: { option: charts.EChartsOption; index: number; dataDefined: boolean }) {
	const chart: charts.ECharts = charts.init(node);
	chart.setOption(params.option);
	if (params.dataDefined) {
		exportDataPages.update(dataPages => {
			let page = dataPages.pages.find(p => p.index === params.index);
			if (!page) {
				page = { index: params.index, image: echartsGetImage(chart) };
				dataPages.pages.push(page);
			}
			else {
				page.image = echartsGetImage(chart);
			}
			return dataPages;
		});
	}
};


export function echartsLoading(node: any, option: any) {
	const chart: charts.ECharts = charts.init(node);
	chart.showLoading();
	chart.setOption(option);
};


function echartsGetImage(chart: charts.ECharts): string {
	// const chart: charts.ECharts = charts.init();
	const chartImage: string = chart.getDataURL({
		type: 'png',
		pixelRatio: 2,
		backgroundColor: '#fff',
	});

	return chartImage;
};
