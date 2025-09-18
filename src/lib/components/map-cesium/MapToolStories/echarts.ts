import * as charts from 'echarts';
import jsPDF from 'jspdf';

export function echarts(node: any, option: any) {
	const chart = charts.init(node);
	chart.setOption(option);
	const chartImage = chart.getDataURL({
		type: 'png',
		pixelRatio: 2,
		backgroundColor: '#fff',
    });

	//TODO: Find way to move this image to storyview
	// const doc = new jsPDF();
	// doc.addImage(chartImage, 'PNG', 10, 10, 180, 160);
    // doc.save('test.pdf');
}

export function echartsLoading(node: any, option: any) {
	const chart = charts.init(node);
	chart.showLoading();
	chart.setOption(option);
}