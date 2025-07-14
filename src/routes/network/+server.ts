import { createGraph } from '$lib/components/map-cesium/MapToolFlooding/MapToolSeriousGame/module/game-elements/api/routing/network';


/** @type {import('./$types').RequestHandler} */
export async function GET() {
	await createGraph("zeeland_2", "car");
	return new Response("Network processed successfully", {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}