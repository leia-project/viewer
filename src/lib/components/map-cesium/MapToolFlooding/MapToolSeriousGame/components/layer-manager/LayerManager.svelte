<script lang="ts">
	import type { GameController } from "../../module/game-controller";
	import type { IRole } from "../../module/models";
	import RoleData from "./RoleData.svelte";
	import RoleNav from "./RoleNav.svelte";

	import { icon as iconPolice } from "./role-icons/icon-police";
	import { icon as iconAmbulance } from "./role-icons/icon-ambulance";
	import { icon as iconFirefighter } from "./role-icons/icon-firefighter";
	import { icon as iconTank } from "./role-icons/icon-tank";

	export let gameController: GameController;
	
	const roles: Array<IRole> = [
		{
			role: "Defensie",
			svgIcon: iconTank,
			layerIds: [
				"4",
				"5"
			]
		},
		{
			role: "Brandweer",
			svgIcon: iconFirefighter,
			layerIds: [
				"6",
				"7"
			]
		},
		{
			role: "Politie",
			svgIcon: iconPolice,
			layerIds: [
				"8",
				"9"
			]
		},
		{
			role: "GHOR",
			svgIcon: iconAmbulance,
			layerIds: [
				"10",
				"11"
			]
		}
	];
	let selectedRole: IRole;

	const mainLayerIds = ["1", "2", "3"];

</script>


<div class="layer-manager">
	{#if selectedRole}
		<RoleData roleData={selectedRole} {mainLayerIds} {gameController}/>
	{/if}
</div>
<div class="role-nav-container">
	<RoleNav
		{roles}
		bind:selectedRole
	/>
</div>


<style>
	
	.layer-manager {
		display: grid;
		grid-template-columns: 1fr auto;
	}

	.role-nav-container {
		position: absolute;
		bottom: 0.5rem;
		left: calc(100% + 0.5rem);
	}

</style>