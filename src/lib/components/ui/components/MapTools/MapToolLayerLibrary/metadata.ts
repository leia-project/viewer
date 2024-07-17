import { get, writable, type Writable } from "svelte/store";



export class Metadata {

	private url!: string;
	public entries: Writable<Array<{key: string, value: string}>>;

	constructor() {
		this.entries = writable([]);
	}


	public reset() {
		this.entries.set([]);
	}

	public async parseMetadataUrl(metadataUrl: string): Promise<void> {
		this.reset();
		if (!metadataUrl || metadataUrl === this.url) return;
		this.url = metadataUrl;

		try {
			const response = await fetch(metadataUrl);
			const contentType = response.headers.get('Content-Type');
			if (!contentType) return;

			if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
				this.parseXML(response);
			} else if (contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
				this.parseJSON(metadataUrl);
			}
		} catch (error) {
			console.error(error);
		}
	}

	private async parseXML(response: Response): Promise<void> {
		const metadataXML = await response.text();
		const parser = new DOMParser();
		const metadataDOM = parser.parseFromString(metadataXML, 'text/xml');

		// Check if metadata is ISO 19115
		if (this.getNodeValue(metadataDOM, "gmd:metadataStandardName") === "ISO 19115") this.parse19115(metadataDOM);

	}

	private getNodeValue(doc: Document, tag: string): string | undefined {
		const element = doc.getElementsByTagName(tag)[0];
		if (!element) return undefined;
		//return element.textContent?.trim() ?? undefined;
		return element.textContent?.trim().replace(/\s{3,}/g, '<span style="display:block;margin-top:8px"></span>') ?? undefined;
	}


	private parseNode(doc: Document, tag: string): string | undefined {
		const element = doc.getElementsByTagName(tag)[0];
		const selectedNodes = Array.from(element.children);
		const listItem: Array<{label:string, content:string}> = [];

		selectedNodes.forEach(node => {
			const label = this.getLabel(node);
			const content = node.innerText?.trim();
			if (content) {
				listItem.push({ label: label, content: content });
			}
		});

		const resultString = "";
		listItem.forEach(item => {
			resultString + `<li><strong>${item.label.substring(4)}</strong>: ${item.content}</li>`;
		});
		return resultString;
	}

	private getLabel(node: Element) {
		let parent = node.parentNode;
		while (parent) {
			if (parent.nodeName.startsWith("gmd:")) {
				return parent.nodeName;
			}
			parent = parent.parentNode;
		}
		return node.tagName;
	}
	  

	private parse19115(metadataDOM: Document) {
		const entries: Array<{key: string, value: string}> = get(this.entries);
		entries.push({key: "Metadata URL (XML)", value: this.url});
		entries.push({key: "Metadata profile", value: "ISO 19115"});

		const tags = [
			"gmd:metadataStandardName", "gmd:metadataStandardVersion", "gmd:title", "gmd:abstract", "gmd:purpose", "gmd:status", 
			"gmd:contact", 
			"gmd:referenceSystemInfo",
			"gmd:spatialRepresentationType", "gmd:spatialResolution", "gmd:language", "gmd:characterSet", "gmd:topicCategory", "gmd:extent", "gmd:temporalElement", "gmd:supplementalInformation", "gmd:resourceMaintenance", "gmd:descriptiveKeywords", "gmd:resourceConstraints", "gmd:distributionInfo", "gmd:dataQualityInfo"];

		tags.forEach((tag) => {
			const value = this.getNodeValue(metadataDOM, tag);
			if (value) entries.push({key: tag.substring(4), value: value});
		});
		this.entries.set(entries);
	}

	private async parseJSON(metadataUrl: string) {
		
	}

	private parseRDF(metadataUrl: string) {

	}
}