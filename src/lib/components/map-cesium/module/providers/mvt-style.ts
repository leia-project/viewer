/* Hoe een kleuring op eigenschap (de assistent kiest een eigenschap, de viewer kiest de
   kleuren) wordt omgezet naar een Cesium3DTileStyle voor vector tiles.

   Puur en zonder Cesium-import, zodat het los te testen is: de Cesium-expressietaal
   is een eigen taal met eigen regels (namen met ':' kunnen niet als ${naam}, tekst
   moet tussen aanhalingstekens), en een fout daarin ziet je pas als de kaart leeg blijft. */

export interface DataDrivenStyle {
	property: string;
	kind: "categorical" | "graduated";
	categories?: { value: string; color: string }[]; // categorical: één kleur per waarde
	breaks?: number[]; // graduated: ondergrens van elke klasse na de eerste, oplopend
	colors?: string[]; // graduated: één kleur per klasse, dus breaks.length + 1
	fallbackColor: string; // voor objecten zonder (bruikbare) waarde
}

export type StyleConditions = [string, string][];

/* Cesium's expressietaal heeft geen betrouwbare escape voor aanhalingstekens: `\'` en
   `\"` binnen een tekst geven een fout, `\\` komt niet overeen. Wat wél werkt is het
   aanhalingsteken kiezen: dubbele als de tekst een ' bevat, enkele anders. Een tekst met
   beide soorten kan dus niet, en een tekst die op een backslash eindigt ook niet (die
   zou het sluitende teken ontsnappen). Dan weigeren we met een duidelijke melding in
   plaats van een stijl te maken die stilletjes niets kleurt. */
function literal(text: string, what: string): string {
	if ((text.includes("'") && text.includes('"')) || text.endsWith("\\")) {
		throw new Error(`${what} "${text}" kan niet in een Cesium-stijl worden gebruikt (aanhalingstekens of een backslash aan het eind).`);
	}
	const quote = text.includes("'") ? '"' : "'";
	return quote + text + quote;
}

/* ${feature['naam']} werkt voor elke eigenschapsnaam, ook die met dubbele punten of spaties.
   Cesium zoekt het eind van ${ ... } met de eerste }, dus daarin kan geen } voorkomen. */
function property(name: string): string {
	if (name.includes("}")) {
		throw new Error(`De eigenschap "${name}" kan niet in een Cesium-stijl worden gebruikt (bevat een }).`);
	}
	return "${feature[" + literal(name, "De eigenschap") + "]}";
}

function color(css: string): string {
	return `color('${css}')`;
}

/* De voorwaarden voor Cesium3DTileStyle({ color: { conditions } }). De eerste die klopt wint. */
export function styleConditions(style: DataDrivenStyle): StyleConditions {
	const value = property(style.property);
	const fallback: [string, string] = ["true", color(style.fallbackColor)];

	if (style.kind === "categorical") {
		/* String(...) vergelijkt als tekst, zoals de waarden worden opgegeven; een ontbrekende
		   eigenschap wordt 'undefined' en valt daardoor op de terugvalkleur. */
		return [
			...(style.categories ?? []).map(
				({ value: label, color: css }): [string, string] => [`String(${value}) === ${literal(label, "De waarde")}`, color(css)]
			),
			fallback
		];
	}

	const breaks = style.breaks ?? [];
	const colors = style.colors ?? [];
	return [
		/* Geen (bruikbaar) getal: terugvalkleur. Number(undefined) is NaN, maar Number(null) is 0. */
		[`${value} === undefined || ${value} === null || isNaN(Number(${value}))`, color(style.fallbackColor)],
		/* Van hoog naar laag, zodat de eerste klasse die past de hoogste is. */
		...breaks
			.map((limit, i): [string, string] => [`Number(${value}) >= ${limit}`, color(colors[i + 1])])
			.reverse(),
		["true", color(colors[0])]
	];
}


/* Wat Cesium zonder stijl tekent is nauwelijks te zien: elk punt is één pixel groot (vastgesteld
   met een headless browser: 632 restaurants werden 27 pixels), en vlakken zijn wit. Elke laag
   krijgt daarom altijd een basisstijl, ook zonder kleuring op eigenschap. */
export const DEFAULT_POINT_SIZE = 9;
export const DEFAULT_LINE_WIDTH = 2;

/* Dezelfde vier kleuren als de React-app voor een nieuwe laag (frontend/app/utils/layerUtils.ts). */
const LAYER_COLORS = ["#ffbf00", "#e83f6f", "#2274a5", "#32936f"];

/* De volgende kleur uit het palet voor een nieuwe laag, zodat lagen die kort na elkaar worden
   toegevoegd een verschillende kleur krijgen (een hash van een id gaf bij vier kleuren al snel
   dezelfde kleur voor twee lagen). */
let nextColor = 0;
export function nextLayerColor(): string {
	return LAYER_COLORS[nextColor++ % LAYER_COLORS.length];
}

/* De definitie voor `new Cesium3DTileStyle(...)`: de kleuring op eigenschap als die er is,
   anders één kleur; plus de grootte van punten en de breedte van lijnen, die Cesium anders op
   1 laat staan. `color`, `pointSize` en `lineWidth` worden per soort object toegepast; de
   andere negeert Cesium. */
export function tileStyleDefinition(style: DataDrivenStyle | undefined, baseColor: string) {
	return {
		color: style ? { conditions: styleConditions(style) } : color(baseColor),
		pointSize: String(DEFAULT_POINT_SIZE),
		pointOutlineColor: "color('#ffffff')",
		pointOutlineWidth: "1.5",
		lineWidth: String(DEFAULT_LINE_WIDTH)
	};
}
