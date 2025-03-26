<script lang="ts">
	import { writable, type Writable } from "svelte/store";

	export let animate: Writable<boolean> = writable(false);
	export let open: boolean = true;
	
</script>


<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div id="logo-container" class={$animate ? "" : "logo-animation-disabled"} on:click={() => open = !open}>
	<svg width="32" height="32" version="1.1" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
		<g id="icon-group" transform="translate(-37.468 -83.688)" stroke="#000">
			<ellipse id="head" cx="46.151" cy="92.371" rx="8.5329" ry="8.533" fill="#e6e6e6" stroke-dasharray="0.03, 0.03" stroke-linecap="round" stroke-linejoin="round" stroke-width=".45" />
			<path id="eye-right" d="m53.044 94.36-2.2251 2.5518-3.2336-3.5085c2.1055 0.23179 4.5309 0.60842 5.4587 0.95667" fill="#7ebd01" stroke-linejoin="bevel" stroke-width=".1" />
			<path id="eye-left" d="m39.498 94.404 2.1079 2.5433 3.4304-3.5538c-1.3623 0.09579-3.9272 0.53002-5.5383 1.0105" fill="#7ebd01" stroke-linejoin="bevel" stroke-width=".1" />
			<path id="eye-line" d="m38.126 94.918c8.1779-3.3793 16.233-0.09411 16.233-0.09411" fill="none" stroke-width=".3" />
		</g>
	</svg>
</div>


<style>
	#eye-left {
		animation: eyeColorChange 2s infinite alternate ease-in-out;
	}

	#eye-right {
		animation: eyeColorChange 2s infinite alternate ease-in-out;
	}

	:global(.logo-animation-disabled #eye-left, .logo-animation-disabled #eye-right) {
		animation: none;
	}

	@keyframes eyeColorChange {
		0% {
			fill: #7ebd01;
		}
		30% {
			fill: #ff6b6b;
		}
		70% {
			fill: #3498db;
		}
		100% {
			fill: #7ebd01;
		}
	}

    #logo-container {
        display: inline-block;
        position: relative;
        animation: pulsateDropShadow 2s infinite ease-in-out;
    }

    :global(.logo-animation-disabled#logo-container) {
        animation: none;
    }

    @keyframes pulsateDropShadow {
        0% {
            filter: drop-shadow(0 0 2px #7ebd01);
        }
        30% {
            filter: drop-shadow(0 0 6px #ff6b6b);
        }
        70% {
            filter: drop-shadow(0 0 6px #3498db);
        }
		100% {
			filter: drop-shadow(0 0 2px #7ebd01);
		}
    }
</style>
