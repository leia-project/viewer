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

	const roles: Array<IRole> = gameController.settings.roles;

	const roleIconMap: Record<string, string> = {
		defensie: iconTank,
		politie: iconPolice,
		brandweer: iconFirefighter,
		ambulance: iconAmbulance,
		ghor: iconAmbulance
	};

	const svgFallback = `
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 32 32"
			fill="#9ccddc"
			preserveAspectRatio="xMidYMid meet"
			width=16
			height=16
		>
			<path d="M28,2H16a2.002,2.002,0,0,0-2,2V14H4a2.002,2.002,0,0,0-2,2V30H30V4A2.0023,2.0023,0,0,0,28,2ZM9,28V21h4v7Zm19,0H15V20a1,1,0,0,0-1-1H8a1,1,0,0,0-1,1v8H4V16H16V4H28Z"></path>
			<path d="M18 8H20V10H18zM24 8H26V10H24zM18 14H20V16H18zM24 14H26V16H24zM18 20H20V22H18zM24 20H26V22H24z"></path>
		</svg>
	`;

	roles.forEach((role) => {
		if (!role.svgIcon) {
			role.svgIcon = roleIconMap[role.role.toLowerCase()] ?? svgFallback;
		}
	});
	
	let selectedRole: IRole | undefined;

	const activeGame = gameController.active;

</script>


<DataLayers
	role={selectedRole}
	generalLayerIds={gameController.settings.generalLayerIds}
	{gameController}
/>
<div class="role-nav-container">
	<RoleNav
		game={$activeGame}
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