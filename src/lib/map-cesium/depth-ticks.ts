import { tickStep, ticks } from "d3-array";

/** Tick count = exaggeration^this, below 1 as exaggerated columns are viewed from further away */
const TICK_COUNT_GROWTH = 0.5;
/** Finest tick step in metres, finer than the data's precision */
const MIN_TICK_STEP_M = 1;

/**
 * Heights to label from `top` down to `bottom` (datum metres): the ends, and
 * round ticks in between kept half a step clear of them so labels don't
 * collide. More ticks fill in as `exaggeration` grows.
 */
export function depthTicks(top: number, bottom: number, exaggeration: number): Array<number> {
	const count = tickCount(top - bottom, exaggeration);
	const clearance = tickStep(bottom, top, count) / 2;
	// From top to bottom, d3 returns them in the order of its arguments
	const interior = ticks(top, bottom, count).filter(
		(tick) => top - tick >= clearance && tick - bottom >= clearance
	);

	return [top, ...interior, bottom];
}

/**
 * Depends on the exaggeration, not the span: a column is viewed whole, so a
 * short one gets as many ticks as a long one. Capped at a MIN_TICK_STEP_M step.
 */
function tickCount(spanM: number, exaggeration: number): number {
	return Math.min(spanM / MIN_TICK_STEP_M, Math.max(1, exaggeration ** TICK_COUNT_GROWTH));
}
