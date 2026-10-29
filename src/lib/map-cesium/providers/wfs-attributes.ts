// Vraagt een WFS welke velden een feature type heeft (DescribeFeatureType), zodat
// de chat-agent filters kan schrijven op velden die echt bestaan in plaats van op
// wat plausibel klinkt. Zusje van wfs-capabilities.ts, dat dezelfde truc doet voor
// GetCapabilities.

// De namespace van XML Schema. Servers kiezen zelf welk prefix ze eraan hangen
// (<element>, <xsd:element>, <xs:element> - allemaal hetzelfde), dus zoeken we op
// de namespace en niet op de tagnaam zoals hij toevallig geschreven staat.
const XSD_NS = "http://www.w3.org/2001/XMLSchema";

/** "bestuurlijkegebieden:Gemeentegebied" -> "Gemeentegebied". */
function localName(qualifiedName: string): string {
	return qualifiedName.split(":").pop() ?? qualifiedName;
}

/**
 * Is dit veld de geometriekolom? Herkenbaar aan een type uit de GML-namespace
 * (gml:GeometryPropertyType). We resolven het prefix in plaats van op de letters
 * "gml:" te matchen: het prefix is vrij te kiezen door de server, de namespace niet.
 */
function isGeometryElement(element: Element): boolean {
	const type = element.getAttribute("type") ?? "";
	if (!type.includes(":")) return false;
	const namespace = element.lookupNamespaceURI(type.split(":")[0]) ?? "";
	return namespace.startsWith("http://www.opengis.net/gml");
}

/**
 * Zoekt de <sequence> die bij één feature type hoort.
 *
 * Nodig omdat een DescribeFeatureType het schema van de hele dienst kan
 * teruggeven - bij PDOK's bestuurlijke gebieden zijn dat Gemeentegebied,
 * Provinciegebied en Landgebied door elkaar. De koppeling loopt via de top-level
 * declaratie: <element name="Gemeentegebied" type="...:GemeentegebiedType"/> wijst
 * naar de <complexType name="GemeentegebiedType"> waar de velden in staan.
 */
function findFeatureTypeSequence(xmlDoc: Document, typeName: string): Element | null {
	const wanted = localName(typeName);

	const declaration = Array.from(xmlDoc.getElementsByTagNameNS(XSD_NS, "element")).find(
		(element) =>
			element.getAttribute("name") === wanted && element.parentElement?.localName === "schema"
	);
	const complexTypeName = localName(declaration?.getAttribute("type") ?? "");

	const complexTypes = Array.from(xmlDoc.getElementsByTagNameNS(XSD_NS, "complexType"));
	const complexType =
		complexTypes.find((ct) => ct.getAttribute("name") === complexTypeName) ??
		// Diensten die typeName wél honoreren sturen maar één type terug, soms
		// zonder bruikbare top-level declaratie. Dan is de keuze niet ambigu.
		(complexTypes.length === 1 ? complexTypes[0] : undefined);

	return complexType?.getElementsByTagNameNS(XSD_NS, "sequence")[0] ?? null;
}

/** Leest de veldnamen van één feature type uit een geparsed DescribeFeatureType-document. */
export function parseWfsAttributeNames(xmlDoc: Document, typeName: string): Array<string> {
	const sequence = findFeatureTypeSequence(xmlDoc, typeName);
	if (!sequence) return [];

	return Array.from(sequence.children)
		.filter((element) => element.namespaceURI === XSD_NS && element.localName === "element")
		.filter((element) => !isGeometryElement(element))
		.map((element) => element.getAttribute("name") ?? "")
		.filter((name) => name !== "");
}

export async function fetchWfsAttributeNames(
	url: string,
	typeName: string,
	version?: string
): Promise<Array<string>> {
	const base = url.split("?")[0];
	const params = new URLSearchParams({
		service: "WFS",
		request: "DescribeFeatureType",
		version: version || "1.1.0",
		typeName: typeName,
		typeNames: typeName
	});

	try {
		const response = await fetch(`${base}?${params}`);
		if (!response.ok) return [];
		const xmlDoc = new DOMParser().parseFromString(await response.text(), "application/xml");
		return parseWfsAttributeNames(xmlDoc, typeName);
	} catch {
		return [];
	}
}

const attributeNameCache = new Map<string, Promise<Array<string>>>();

export function getWfsAttributeNames(
	url: string,
	typeName: string,
	version?: string
): Promise<Array<string>> {
	const key = `${url.split("?")[0]}|${typeName}|${version ?? ""}`;

	let pending = attributeNameCache.get(key);
	if (!pending) {
		pending = fetchWfsAttributeNames(url, typeName, version);
		attributeNameCache.set(key, pending);
		pending.then((names) => {
			if (names.length === 0) attributeNameCache.delete(key);
		});
	}

	return pending;
}
