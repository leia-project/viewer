// src/lib/stores/PolygonEntityStore.ts
import { writable } from 'svelte/store';
import type { Entity } from 'cesium';

type PolygonState = {
    polygonEntity: Entity | null;
    redPoints: Entity[];
    distributions: Array<{ group: string; value: number }[]>;
};

export const polygonStore = writable<PolygonState>({
    polygonEntity: null,
    redPoints: [],
    distributions: []
});
