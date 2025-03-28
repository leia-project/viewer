const colors = [
	"#3cb44b",
	"#4363d8",
	"#f58231",
	"#911eb4",
	"#46f0f0",
	"#f032e6",
	"#bcf60c",
	"#fabebe",
	"#008080",
	"#e6beff",
	"#9a6324",
	"#fffac8",
	"#800000",
	"#aaffc3",
	"#808000",
	"#ffd8b1",
	"#000075",
	"#808080",
	"#ffffff",
	"#ffe119",
	"#e6194b",
	"#000000"
];

let colorIndex = 0;

export function getLayerColor() {
	const color = colors[colorIndex];
	colorIndex = (colorIndex + 1) % colors.length;
	return color;
}


function hexToHSL(hex: string): [number, number, number] {
	let r = parseInt(hex.slice(1, 3), 16) / 255;
	let g = parseInt(hex.slice(3, 5), 16) / 255;
	let b = parseInt(hex.slice(5, 7), 16) / 255;

	let max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	let h = 0,
		s = 0,
		l = (max + min) / 2;

	if (max !== min) {
		let d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h *= 60;
	}
	return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
	function f(n: number): number {
		let k = (n + h / 30) % 12;
		let a = s * Math.min(l, 1 - l);
		return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
	}
	let r = Math.round(f(0) * 255);
	let g = Math.round(f(8) * 255);
	let b = Math.round(f(4) * 255);
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}


export function getColorRange(color: string, amount: number): string[] {
	let [h, s, baseL] = hexToHSL(color);
	let range: string[] = [];

	const minL = Math.max(0.2, baseL * 0.6); // Lower bound of lightness (at least 20% or 60% of base)
	const maxL = Math.min(0.9, baseL * 1.4); // Upper bound of lightness (at most 90% or 140% of base)

	for (let i = 0; i < amount; i++) {
		let lightness = minL + (maxL - minL) * (i / (amount - 1));
		range.push(hslToHex(h, s, lightness));
	}

	return range;
}


export function getMinMaxColors(color: string, minValue: number, maxValue: number): { minColor: string, maxColor: string } {
	let [h, s, baseL] = hexToHSL(color);
	
	const minL = Math.max(0, baseL * minValue); // Lower bound of lightness based on the minValue
	const maxL = Math.min(1, baseL * maxValue); // Upper bound of lightness based on the maxValue

	let minColor = hslToHex(h, s, minL);
	let maxColor = hslToHex(h, s, maxL);

	return { minColor, maxColor };
}

export function interpolateColors(color1: string, color2: string, factor: number): string {
	function hexToRgb(hex: string): [number, number, number] {
		let r = parseInt(hex.slice(1, 3), 16);
		let g = parseInt(hex.slice(3, 5), 16);
		let b = parseInt(hex.slice(5, 7), 16);
		return [r, g, b];
	}

	function rgbToHex(r: number, g: number, b: number): string {
		return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
	}

	let [r1, g1, b1] = hexToRgb(color1);
	let [r2, g2, b2] = hexToRgb(color2);

	let r = Math.round(r1 + (r2 - r1) * factor);
	let g = Math.round(g1 + (g2 - g1) * factor);
	let b = Math.round(b1 + (b2 - b1) * factor);

	return rgbToHex(r, g, b);
}
