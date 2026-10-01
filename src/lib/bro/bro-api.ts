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
	if (broId.startsWith("CPT")) {
		return "cpt";
	}
	if (broId.startsWith("BHR")) {
		return "bhrgt";
	}
	return undefined;
}

const parser = new BROParser(new XMLAdapter());

const objectCache = new QuickLRU<string, BroObject>({ maxSize: 20 });
const svgUrlCache = new QuickLRU<string, string>({
	maxSize: 20,
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
		throw new Error(`Not a BRO CPT or BHR-GT id: ${broId}`);
	}

	const response = await fetch(objectUrl(type, broId));
	if (!response.ok) {
		throw new Error(`BRO request failed (${response.status})`);
	}
	const xml = await response.text();

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

	// The service returns the non-standard "application/svg+xml", so re-type the
	// blob as "image/svg+xml" which <img> requires to render it
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
