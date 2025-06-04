// polygonStore.ts
import { writable } from 'svelte/store';
import type { Cartesian3 } from 'cesium';
import type { Writable } from 'svelte/store';

export const polygonPositions: Writable<Cartesian3[]> = writable([]);


