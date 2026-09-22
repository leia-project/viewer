import { producers as p } from "@bedrock-engineer/bro-xml-parser";
import type { ProducedFields, ParseMeta } from "@bedrock-engineer/bro-xml-parser";

// CPT (dscpt/1.1)
const CPT_SURVEY = "./dscpt:conePenetrometerSurvey";
const CPT_VPOS = "./dscpt:deliveredVerticalPosition";

export const CPT_ESSENTIALS = {
	broId: p.text("brocom:broId"),
	qualityRegime: p.text("brocom:qualityRegime"),
	cptStandard: p.text("./dscpt:cptStandard"),
	cptMethod: p.text(`${CPT_SURVEY}/cptcommon:cptMethod`),
	qualityClass: p.qualityClass(`${CPT_SURVEY}/cptcommon:qualityClass`),
	finalDepth: p.number(`${CPT_SURVEY}/cptcommon:trajectory/cptcommon:finalDepth`),
	predrilledDepth: p.number(`${CPT_SURVEY}/cptcommon:trajectory/cptcommon:predrilledDepth`),
	groundwaterLevel: p.number("./dscpt:additionalInvestigation/cptcommon:groundwaterLevel"),
	deliveredVerticalPositionOffset: p.number(`${CPT_VPOS}/cptcommon:offset`),
	deliveredVerticalPositionDatum: p.text(`${CPT_VPOS}/cptcommon:verticalDatum`),
	deliveredVerticalPositionReferencePoint: p.text(
		`${CPT_VPOS}/cptcommon:localVerticalReferencePoint`
	),
	deliveredLocation: p.gmlLocation("./dscpt:deliveredLocation/cptcommon:location"),
	researchReportDate: p.date("./dscpt:researchReportDate"),
	conePenetrationTestPhenomenonTime: p.date(
		`${CPT_SURVEY}/cptcommon:conePenetrationTest/om:phenomenonTime/gml:TimeInstant/gml:timePosition`
	),
	deliveryContext: p.text("./dscpt:deliveryContext"),
	surveyPurpose: p.text("./dscpt:surveyPurpose"),
	stopCriterion: p.text(`${CPT_SURVEY}/cptcommon:stopCriterion`),
	dissipationtestPerformed: p.boolean(`${CPT_SURVEY}/cptcommon:dissipationTestPerformed`)
};

// --- BHR-GT (dsbhrgt/2.1) ---
const BHRGT_BORING = "./dsbhrgt:boring";
const BHRGT_SAMPLE_DESC = "./dsbhrgt:boreholeSampleDescription";
const BHRGT_LOG = `${BHRGT_SAMPLE_DESC}/bhrgtcom:descriptiveBoreholeLog`;
const BHRGT_VPOS = "./dsbhrgt:deliveredVerticalPosition";

// Flattened layer: soil layers expose NEN 5104 / geotechnical soil fields
// directly
const BHRGT_LAYER = p.object({
	fields: {
		upperBoundary: p.number("./bhrgtcom:upperBoundary"),
		lowerBoundary: p.number("./bhrgtcom:lowerBoundary"),
		soilNameNEN5104: p.text("./bhrgtcom:soil/bhrgtcom:soilNameNEN5104"),
		geotechnicalSoilName: p.text("./bhrgtcom:soil/bhrgtcom:geotechnicalSoilName"),
		sandMedianClass: p.text("./bhrgtcom:soil/bhrgtcom:sandMedianClass"),
		color: p.text("./bhrgtcom:soil/bhrgtcom:colour")
	}
});

export const BHRGT_ESSENTIALS = {
	broId: p.text("brocom:broId"),
	qualityRegime: p.text("brocom:qualityRegime"),
	boringProcedure: p.text(`${BHRGT_BORING}/bhrgtcom:boringProcedure`),
	boringTechnique: p.text(`${BHRGT_BORING}/bhrgtcom:boredInterval/bhrgtcom:boringTechnique`),
	descriptionProcedure: p.text(`${BHRGT_SAMPLE_DESC}/bhrgtcom:descriptionProcedure`),
	describedMaterial: p.text(`${BHRGT_LOG}/bhrgtcom:describedMaterial`),
	descriptionQuality: p.text(`${BHRGT_LOG}/bhrgtcom:descriptionQuality`),
	finalBoreDepth: p.number(`${BHRGT_BORING}/bhrgtcom:finalDepthBoring`),
	finalSampleDepth: p.number(`${BHRGT_BORING}/bhrgtcom:finalDepthSampling`),
	groundwaterLevel: p.number(`${BHRGT_BORING}/bhrgtcom:groundwaterLevel`),
	boreRockReached: p.boolean(`${BHRGT_BORING}/bhrgtcom:rockReached`),
	deliveredVerticalPositionOffset: p.number(`${BHRGT_VPOS}/bhrgtcom:offset`),
	deliveredVerticalPositionDatum: p.text(`${BHRGT_VPOS}/bhrgtcom:verticalDatum`),
	deliveredVerticalPositionReferencePoint: p.text(
		`${BHRGT_VPOS}/bhrgtcom:localVerticalReferencePoint`
	),
	deliveredLocation: p.gmlLocation("./dsbhrgt:deliveredLocation/bhrgtcom:location"),
	boringStartDate: p.date(`${BHRGT_BORING}/bhrgtcom:boringStartDate`),
	boringEndDate: p.date(`${BHRGT_BORING}/bhrgtcom:boringEndDate`),
	samplingMethod: p.text(`${BHRGT_BORING}/bhrgtcom:sampledInterval/bhrgtcom:samplingMethod`),
	researchReportDate: p.date("./dsbhrgt:reportHistory/dsbhrgt:reportStartDate"),
	layers: p.array({ at: BHRGT_LOG, each: ".//bhrgtcom:layer", item: BHRGT_LAYER })
};

export type CptEssentials = ProducedFields<typeof CPT_ESSENTIALS> & { meta: ParseMeta };
export type BhrgtEssentials = ProducedFields<typeof BHRGT_ESSENTIALS> & { meta: ParseMeta };
export type BhrgtLayer = BhrgtEssentials["layers"][number];

/** Column order for the BHR-GT layer table */
export const BHRGT_LAYER_COLUMNS: ReadonlyArray<keyof BhrgtLayer> = [
	"upperBoundary",
	"lowerBoundary",
	"soilNameNEN5104",
	"geotechnicalSoilName",
	"sandMedianClass",
	"color"
];
