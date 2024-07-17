import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	return {
		configSettings: locals.configSettings,
		story: url.searchParams.get('story')
	};
};