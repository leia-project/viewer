import { describe } from "@bedrock-engineer/bro-xml-parser/reference-codes";
import type { Coded } from "@bedrock-engineer/bro-xml-parser";

const CODE_PREFIXED = new Set([
	"boringTechnique",
	"samplingMethod",
	"describedMaterial",
	"coordinateTransformation",
	"deliveredVerticalPositionReferencePoint",
	"descriptionQuality"
]);

// Some fields are shown as only the code label, without description because it's too verbose
const LABEL_ONLY = new Set(["qualityClass"]);

function humanizeCode(code: string) {
	const spaced = code
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2") // lowercase letter or digit is immediately followed by an uppercase letter
		.split(" ")
		.map((word) =>
			/^[A-Za-z]+$/.test(word) && word !== word.toUpperCase() ? word.toLowerCase() : word
		) // lowercase normal words, preserve strings like RTKGPS or ISO22476
		.join(" ");

	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isCoded(value: unknown): value is Coded {
	return typeof value === "object" && value !== null && "code" in value && "codeSpace" in value;
}

// Resolve a `Coded` value for display by showing its official BRO
// description from the BRO codespaces
export function decode(key: string, value: unknown): unknown {
	if (!isCoded(value)) {
		return value;
	}

	const label = humanizeCode(value.code);
	if (LABEL_ONLY.has(key)) {
		return label;
	}

	const description = describe(value);
	if (CODE_PREFIXED.has(key)) {
		return description ? `${label} — ${description}` : label;
	}

	return description ?? label;
}
