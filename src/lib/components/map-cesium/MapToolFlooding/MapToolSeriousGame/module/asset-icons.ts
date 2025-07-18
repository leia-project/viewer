import { icon as brug } from '../icons/SVG_vaste-brug_Blauw';
import { icon as brug_beweegbaar } from '../icons/SVG_beweegbare-brug_Blauw';
import { icon as tunnel } from '../icons/SVG_tunnel_Blauw';
import { icon as viaduct } from '../icons/SVG_viaduct_Blauw';
import { icon as aquaduct } from '../icons/SVG_aquaduct_Blauw';
import { icon as ecoduct } from '../icons/SVG_ecoduct_Blauw';
import { icon as stormvloedkering } from '../icons/SVG_stormvloedkeringen_Blauw';
import { icon as kanaal } from '../icons/SVG_rivieren-en-kanalen_Blauw';
import { icon as stuw } from '../icons/SVG_stuwen_Blauw';
import { icon as sluis } from '../icons/SVG_sluiscomplexen_Blauw';
import { icon as kade } from '../icons/SVG_kade_Blauw';
import { icon as dijk } from '../icons/SVG_dijk_Blauw';
import { icon as snelweg } from '../icons/SVG_snelweg_Blauw';

export const iconMap: { [key: string]: string } = {
	brug,
	brug_beweegbaar,
	tunnel,
	viaduct,
	aquaduct,
	ecoduct,
	stormvloedkering,
	kanaal,
	stuw,
	sluis,
	kade,
	dijk,
	snelweg
};

export const typeTitles: { [key: string]: string } = {
	brug: 'Bruggen',
	brug_beweegbaar: 'Beweegbare bruggen',
	tunnel: 'Tunnels',
	viaduct: 'Viaducten',
	aquaduct: 'Aquaducten',
	ecoduct: 'Ecoducten',
	stormvloedkering: 'Stormvloedkeringen',
	kanaal: 'Kanalen',
	stuw: 'Stuwen',
	sluis: 'Sluiscomplexen',
	kade: 'Kades',
	dijk: 'Dijken',
	snelweg: 'Snelwegen'
};
 
/*
 * Process the SVG content to add a background circle with padding.
 */
export function processSVG(svgContent: string, size: string = "15mm", padding: number = 16, outline: number = 5): string | undefined {
	const parser = new DOMParser();
	const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
	const svgElement = svgDoc.documentElement;

	const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number);
	if (!viewBox) return;
	const [minX, minY, width, height] = viewBox;
	const newMinX = minX - padding;
	const newMinY = minY - padding;
	const newWidth = width + 2 * padding;
	const newHeight = height + 2 * padding;

	const circle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
	
	const centerX = newMinX + newWidth / 2;
	const centerY = newMinY + newHeight / 2;
	const radius = Math.max(newWidth, newHeight) / 2 - outline / 2;
	circle.setAttribute('cx', centerX.toString());
	circle.setAttribute('cy', centerY.toString());
	circle.setAttribute('r', radius.toString());
	circle.setAttribute('fill', '#F4F6F8'); 
    circle.setAttribute('stroke', '#154273');
    circle.setAttribute('stroke-width', outline.toString());

	svgElement.insertBefore(circle, svgElement.firstChild);

	svgElement.setAttribute('viewBox', `${newMinX} ${newMinY} ${newWidth} ${newHeight}`);
	svgElement.setAttribute('width', size);
	svgElement.setAttribute('height', size);

	const serializer = new XMLSerializer();
	const newSvgContent = serializer.serializeToString(svgDoc);

	return `data:image/svg+xml,${encodeURIComponent(newSvgContent)}`;
}