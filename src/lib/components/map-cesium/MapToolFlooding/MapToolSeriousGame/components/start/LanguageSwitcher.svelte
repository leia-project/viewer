<script lang="ts">
	import { selectedLanguage } from "../../external-dependencies";

</script>


<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions a11y-no-static-element-interactions -->
<div class="language-switcher">
	<svg
		on:click={() => selectedLanguage.set("nl")} 
		class="flag"
		class:selected={$selectedLanguage === "nl"}
		xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 11"
	>
		<rect width="16" height="3.67" y="0" style="fill:#ae1c28"/>
		<rect width="16" height="3.66" y="3.67" style="fill:#fff"/>
		<rect width="16" height="3.67" y="7.33" style="fill:#21468b"/>
	</svg>
	<svg 
		on:click={() => selectedLanguage.set("en")}
		class="flag"
		class:selected={$selectedLanguage === "en"}
		xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 11"
	>
		<path d="M0,0H16V11H0Z" transform="translate(0)" style="fill:#012169"/><path d="M1.9,0,8,4.1,14.1,0H16V1.4L10,5.5l6,4.1V11H14L8,6.9,2,11H0V9.6L6,5.5l-6-4V0Z" transform="translate(0)" style="fill:#fff"/><path d="M10.6,6.4,16,10.1V11L9.2,6.4ZM6,6.9l.2.8L1.4,11H0ZM16,0h0L9.8,4.4v-1l5-3.4ZM0,0,6,4H4.5L0,1Z" transform="translate(0)" style="fill:#c8102e"/><path d="M6,0V11h4V0ZM0,3.7V7.3H16V3.7Z" transform="translate(0)" style="fill:#fff"/><path d="M0,4.4V6.6H16V4.4ZM6.8,0V11H9.2V0Z" transform="translate(0)" style="fill:#c8102e"/>
	</svg>
</div>


<style>

	.language-switcher {
		display: flex;
		gap: 0.5rem;
	}

	.flag {
		width: 2rem;
		height: 1.5rem;
		cursor: pointer;
		border-radius: 0.3rem;
	}

	.flag:not(.selected) {
		filter: brightness(0.35);
	}

	.flag:hover {
		filter: brightness(1);
	}

</style>
