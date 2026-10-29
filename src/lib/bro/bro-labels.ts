import type { BroObjectType } from "./bro-api";
import type { CptEssentials, BhrgtEssentials, BhrgtLayer } from "./bro-schemas";

// Dutch field labels, hand-authored from the BRO gegevenscatalogus. BRO ships no
// machine-readable crosswalk between the English XML element names (which our
// producer keys mirror) and the Dutch catalogus names, so these are curated.
// Unlisted keys fall back to the raw field name.
const CPT_LABELS: Partial<Record<keyof CptEssentials, string>> = {
	broId: "BRO-ID",
	qualityRegime: "Kwaliteitsregime",
	cptStandard: "Sondeernorm",
	cptMethod: "Sondeermethode",
	qualityClass: "Kwaliteitsklasse",
	finalDepth: "Einddiepte",
	predrilledDepth: "Voorgeboorde diepte",
	groundwaterLevel: "Grondwaterstand",
	deliveredVerticalPositionOffset: "Hoogte referentiepunt",
	deliveredVerticalPositionDatum: "Verticaal referentievlak",
	deliveredVerticalPositionReferencePoint: "Lokaal verticaal referentiepunt",
	deliveredLocation: "Locatie",
	coordinateTransformation: "Coördinatentransformatie",
	researchReportDate: "Datum onderzoeksrapport",
	conePenetrationTestPhenomenonTime: "Tijdstip sondering",
	deliveryContext: "Kader aanlevering",
	surveyPurpose: "Kader inwinning",
	stopCriterion: "Stopcriterium",
	dissipationtestPerformed: "Dissipatietest uitgevoerd"
};

const BHRGT_LABELS: Partial<Record<keyof BhrgtEssentials, string>> = {
	broId: "BRO-ID",
	qualityRegime: "Kwaliteitsregime",
	boringProcedure: "Boorprocedure",
	boringTechnique: "Boortechniek",
	descriptionProcedure: "Beschrijfprocedure",
	describedMaterial: "Beschreven materiaal",
	descriptionQuality: "Beschrijfkwaliteit",
	finalBoreDepth: "Einddiepte boring",
	finalSampleDepth: "Einddiepte bemonstering",
	groundwaterLevel: "Grondwaterstand",
	boreRockReached: "Gesteente bereikt",
	deliveredVerticalPositionOffset: "Hoogte referentiepunt",
	deliveredVerticalPositionDatum: "Verticaal referentievlak",
	deliveredVerticalPositionReferencePoint: "Lokaal verticaal referentiepunt",
	deliveredLocation: "Locatie",
	coordinateTransformation: "Coördinatentransformatie",
	boringStartDate: "Startdatum boring",
	boringEndDate: "Einddatum boring",
	samplingMethod: "Bemonsteringsmethode",
	researchReportDate: "Datum onderzoeksrapport"
};

const BHRGT_LAYER_LABELS: Partial<Record<keyof BhrgtLayer, string>> = {
	upperBoundary: "Bovengrens",
	lowerBoundary: "Ondergrens",
	soilNameNEN5104: "Grondsoort (NEN 5104)",
	geotechnicalSoilName: "Geotechnische grondsoort",
	sandMedianClass: "Zandmediaanklasse",
	color: "Kleur"
};

export function fieldLabel(type: BroObjectType, key: string): string {
	const labels: Partial<Record<string, string>> = type === "cpt" ? CPT_LABELS : BHRGT_LABELS;
	return labels[key] ?? key;
}

export function layerFieldLabel(key: keyof BhrgtLayer): string {
	return BHRGT_LAYER_LABELS[key] ?? key;
}
