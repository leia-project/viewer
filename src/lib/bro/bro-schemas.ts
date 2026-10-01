import { producers as p } from "@bedrock-engineer/bro-xml-parser";
import type { ProducedFields, ParseMeta } from "@bedrock-engineer/bro-xml-parser";

// CPT (dscpt/1.1)
const CPT_SURVEY = "./dscpt:conePenetrometerSurvey";
const CPT_VPOS = "./dscpt:deliveredVerticalPosition";

export const CPT_ESSENTIALS = {
	broId: p.text("brocom:broId"),
	qualityRegime: p.text("brocom:qualityRegime"),
	cptStandard: p.code("./dscpt:cptStandard"),
	cptMethod: p.code(`${CPT_SURVEY}/cptcommon:cptMethod`),
	qualityClass: p.code(`${CPT_SURVEY}/cptcommon:qualityClass`),
	finalDepth: p.number(`${CPT_SURVEY}/cptcommon:trajectory/cptcommon:finalDepth`),
	predrilledDepth: p.number(`${CPT_SURVEY}/cptcommon:trajectory/cptcommon:predrilledDepth`),
	groundwaterLevel: p.number("./dscpt:additionalInvestigation/cptcommon:groundwaterLevel"),
	deliveredVerticalPositionOffset: p.number(`${CPT_VPOS}/cptcommon:offset`),
	deliveredVerticalPositionDatum: p.code(`${CPT_VPOS}/cptcommon:verticalDatum`),
	deliveredVerticalPositionReferencePoint: p.code(
		`${CPT_VPOS}/cptcommon:localVerticalReferencePoint`
	),
	deliveredLocation: p.gmlLocation("./dscpt:deliveredLocation/cptcommon:location"),
	coordinateTransformation: p.code("./dscpt:standardizedLocation/brocom:coordinateTransformation"),
	researchReportDate: p.date("./dscpt:researchReportDate"),
	conePenetrationTestPhenomenonTime: p.date(
		`${CPT_SURVEY}/cptcommon:conePenetrationTest/om:phenomenonTime/gml:TimeInstant/gml:timePosition`
	),
	deliveryContext: p.code("./dscpt:deliveryContext"),
	surveyPurpose: p.code("./dscpt:surveyPurpose"),
	stopCriterion: p.code(`${CPT_SURVEY}/cptcommon:stopCriterion`),
	dissipationtestPerformed: p.boolean(`${CPT_SURVEY}/cptcommon:dissipationTestPerformed`)
};

// BHR-GT (dsbhrgt/2.1)
const BHRGT_BORING = "./dsbhrgt:boring";
const BHRGT_SAMPLE_DESC = "./dsbhrgt:boreholeSampleDescription";
const BHRGT_LOG = `${BHRGT_SAMPLE_DESC}/bhrgtcom:descriptiveBoreholeLog`;
const BHRGT_VPOS = "./dsbhrgt:deliveredVerticalPosition";

const BHRGT_LAYER = p.object({
	fields: {
		upperBoundary: p.number("./bhrgtcom:upperBoundary"),
		lowerBoundary: p.number("./bhrgtcom:lowerBoundary"),
		soilNameNEN5104: p.code("./bhrgtcom:soil/bhrgtcom:soilNameNEN5104"),
		geotechnicalSoilName: p.code("./bhrgtcom:soil/bhrgtcom:geotechnicalSoilName"),
		sandMedianClass: p.code("./bhrgtcom:soil/bhrgtcom:sandMedianClass"),
		color: p.code("./bhrgtcom:soil/bhrgtcom:colour")
	}
});

export const BHRGT_ESSENTIALS = {
	broId: p.text("brocom:broId"),
	qualityRegime: p.text("brocom:qualityRegime"),
	boringProcedure: p.code(`${BHRGT_BORING}/bhrgtcom:boringProcedure`),
	boringTechnique: p.code(`${BHRGT_BORING}/bhrgtcom:boredInterval/bhrgtcom:boringTechnique`),
	descriptionProcedure: p.code(`${BHRGT_SAMPLE_DESC}/bhrgtcom:descriptionProcedure`),
	describedMaterial: p.code(`${BHRGT_LOG}/bhrgtcom:describedMaterial`),
	descriptionQuality: p.code(`${BHRGT_LOG}/bhrgtcom:descriptionQuality`),
	finalBoreDepth: p.number(`${BHRGT_BORING}/bhrgtcom:finalDepthBoring`),
	finalSampleDepth: p.number(`${BHRGT_BORING}/bhrgtcom:finalDepthSampling`),
	groundwaterLevel: p.number(`${BHRGT_BORING}/bhrgtcom:groundwaterLevel`),
	boreRockReached: p.boolean(`${BHRGT_BORING}/bhrgtcom:rockReached`),
	deliveredVerticalPositionOffset: p.number(`${BHRGT_VPOS}/bhrgtcom:offset`),
	deliveredVerticalPositionDatum: p.code(`${BHRGT_VPOS}/bhrgtcom:verticalDatum`),
	deliveredVerticalPositionReferencePoint: p.code(
		`${BHRGT_VPOS}/bhrgtcom:localVerticalReferencePoint`
	),
	deliveredLocation: p.gmlLocation("./dsbhrgt:deliveredLocation/bhrgtcom:location"),
	coordinateTransformation: p.code("./dsbhrgt:standardizedLocation/brocom:coordinateTransformation"),
	boringStartDate: p.date(`${BHRGT_BORING}/bhrgtcom:boringStartDate`),
	boringEndDate: p.date(`${BHRGT_BORING}/bhrgtcom:boringEndDate`),
	samplingMethod: p.code(`${BHRGT_BORING}/bhrgtcom:sampledInterval/bhrgtcom:samplingMethod`),
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
