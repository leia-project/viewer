<script lang="ts">
	import type { GameController } from "../../module/game-controller";
	import type { IRole } from "../../module/models";
	import DataLayers from "./DataLayers.svelte";
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
				""
			]
		},
		{
			role: "Brandweer",
			svgIcon: iconFirefighter,
			layerIds: [
				""
			]
		},
		{
			role: "Politie",
			svgIcon: iconPolice,
			layerIds: [
				"999"
			]
		},
		{
			role: "GHOR",
			svgIcon: iconAmbulance,
			layerIds: [
				"6"
			]
		}
	];
	let selectedRole: IRole | undefined;

	const mainLayerIds = ["1", "2", "3", "4", "5"];

</script>


<DataLayers
	role={selectedRole}
	{mainLayerIds}
	{gameController}
/>
<div class="role-nav-container">
	<RoleNav
		{roles}
		bind:selectedRole
	/>
</div>


<style>

	.role-nav-container {
		position: absolute;
		bottom: 0.5rem;
		left: calc(100% + 0.5rem);
	}

</style>