const colors = [
	"#e6194b",
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
	"#000000"
];

let colorIndex = 0;

export function getLayerColor() {
	const color = colors[colorIndex];
	colorIndex = (colorIndex + 1) % colors.length;
	return color;
}

export function getColorRange(color: string, amount: number): string[] {
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
