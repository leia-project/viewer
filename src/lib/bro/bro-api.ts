import QuickLRU from "quick-lru";
import { BROParser, XMLAdapter } from "@bedrock-engineer/bro-xml-parser";
import {
	CPT_ESSENTIALS,
	BHRGT_ESSENTIALS,
	type CptEssentials,
	type BhrgtEssentials
} from "./bro-schemas";

const BASE_URL = "https://publiek.broservices.nl/sr";

export const DEFAULT_CPT_GRAPH_TYPE = "cptCombinedDepth";
export const BROLOKET_URL = "https://www.broloket.nl/ondergrondgegevens";

export type BroObjectType = "cpt" | "bhrgt";

export type BroObject =
	| { type: "cpt"; broId: string; xml: string; parsed: CptEssentials }
	| { type: "bhrgt"; broId: string; xml: string; parsed: BhrgtEssentials };

export interface BroGraphType {
	graphType: string;
	name: string;
	description: string;
}

export function broTypeFromId(broId: string): BroObjectType | undefined {
	if (/^CPT\d{12}$/.test(broId)) {
		return "cpt";
	}
	if (/^BHR\d{12}$/.test(broId)) {
		return "bhrgt";
	}
	return undefined;
}

const objectCache = new QuickLRU<string, BroObject>({ maxSize: 20 });
const svgUrlCache = new QuickLRU<string, string>({
	maxSize: 30,
	onEviction: (_key, url) => URL.revokeObjectURL(url)
});

function objectUrl(type: BroObjectType, broId: string): string {
	return type === "cpt"
		? `${BASE_URL}/cpt/v1/objects/${broId}`
		: `${BASE_URL}/bhrgt/v2/objects/${broId}`;
}

export async function getBroObject(broId: string): Promise<BroObject> {
	const cached = objectCache.get(broId);
	if (cached) {
		return cached;
	}

	const type = broTypeFromId(broId);
	if (!type) {
		throw new Error(`Not a BRO CPT/BHR-GT id: ${broId}`);
	}

	const response = await fetch(objectUrl(type, broId));
	if (!response.ok) {
		throw new Error(`BRO request failed (${response.status})`);
	}
	const xml = await response.text();

	const parser = new BROParser(new XMLAdapter());

	const object: BroObject =
		type === "cpt"
			? { type, broId, xml, parsed: parser.parseCustom(xml, CPT_ESSENTIALS, "CPT") }
			: { type, broId, xml, parsed: parser.parseCustom(xml, BHRGT_ESSENTIALS, "BHR-GT") };

	objectCache.set(broId, object);

	return object;
}

export async function getGraphSvgUrl(broId: string, graphType?: string): Promise<string> {
	const cacheKey = `${broId}:${graphType ?? "default"}`;
	const cached = svgUrlCache.get(cacheKey);

	if (cached) {
		return cached;
	}

	const object = await getBroObject(broId);
	const url =
		object.type === "cpt"
			? `${BASE_URL}/cpt/v1/result/graph/dispatch?graphType=${encodeURIComponent(graphType ?? DEFAULT_CPT_GRAPH_TYPE)}`
			: `${BASE_URL}/bhrgt/v2/profile/graph/dispatch`;

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/xml" },
		body: object.xml
	});

	if (!response.ok) {
		throw new Error(`BRO graph request failed (${response.status})`);
	}

	// The service responds with the non-standard "application/svg+xml" should be "image/svg+xml"
	const svgBlob = new Blob([await response.arrayBuffer()], { type: "image/svg+xml" });
	const svgUrl = URL.createObjectURL(svgBlob);
	svgUrlCache.set(cacheKey, svgUrl);

	return svgUrl;
}

let graphTypesPromise: Promise<Array<BroGraphType>> | undefined;

export function getCptGraphTypes(): Promise<Array<BroGraphType>> {
	graphTypesPromise ??= fetchCptGraphTypes().catch((error) => {
		graphTypesPromise = undefined; // let a later call retry
		throw error;
	});
	return graphTypesPromise;
}

async function fetchCptGraphTypes(): Promise<Array<BroGraphType>> {
	const response = await fetch(`${BASE_URL}/cpt/v1/result/graph/types`);
	if (!response.ok) {
		throw new Error(`BRO graph types request failed (${response.status})`);
	}

	type JSONResponse = { supportedGraphs?: Array<{ graphs: Array<BroGraphType> }> };
	const json: JSONResponse = await response.json();

	return json.supportedGraphs?.flatMap((g) => g.graphs) ?? [];
}
