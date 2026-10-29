// Eén plek die een WFS GetCapabilities-document uitleest. Twee gebruikers met
// verschillende timing: de provider controleert ná het toevoegen of het gekozen
// feature type bestaat, het bibliotheekformulier haalt de lijst juist dávoor op
// om de gebruiker een keuzelijst te kunnen tonen in plaats van een blind veld.

export interface WfsFeatureType {
	name: string;
	title: string;
}

/** Leest de <FeatureTypeList> uit een al geparsed capabilities-document. */
export function parseWfsFeatureTypes(xmlDoc: Document): Array<WfsFeatureType> {
	const featureTypeList = xmlDoc.querySelectorAll("FeatureTypeList FeatureType");
	return Array.from(featureTypeList)
		.map((ft) => ({
			name: ft.querySelector("Name")?.textContent ?? "",
			title: ft.querySelector("Title")?.textContent ?? "No title"
		}))
		.filter((ft) => ft.name !== "");
}

/**
 * Haalt de beschikbare feature types op bij een WFS. Levert een lege lijst bij
 * elke vorm van falen - de aanroeper valt dan terug op handmatige invoer, wat
 * beter is dan een dienst die de catalogus niet netjes publiceert onbruikbaar
 * te maken.
 */
export async function fetchWfsFeatureTypes(url: string): Promise<Array<WfsFeatureType>> {
	// De gebruiker plakt vaak een complete GetCapabilities-URL. Alles vanaf het
	// vraagteken knippen we eraf, anders staat `service=` er straks twee keer in.
	const base = url.split("?")[0];
	try {
		const response = await fetch(`${base}?service=WFS&request=GetCapabilities`);
		if (!response.ok) return [];
		const xmlDoc = new DOMParser().parseFromString(await response.text(), "application/xml");
		return parseWfsFeatureTypes(xmlDoc);
	} catch {
		return [];
	}
}
