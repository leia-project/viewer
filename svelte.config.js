import adapterNode from "@sveltejs/adapter-node";
import adapterStatic from "@sveltejs/adapter-static";
import preprocess from "svelte-preprocess";
import { optimizeImports } from "carbon-preprocess-svelte";
import dotenv from "dotenv";
dotenv.config();

// extract the relative viewer path from the APP_URL
const viewerPath = ((new URL(process.env.APP_URL)).pathname === '/') ? '' : new URL(process.env.APP_URL).pathname

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		preprocess({}),
		optimizeImports({})
	],
	kit: {
		adapter:
			process.env.npm_config_adapter === "static"
				? adapterStatic({
					strict: false,
					fallback: "index.html"
				})
				: adapterNode({
					out: "build",
					precompress: true,
					envPrefix: ""
				}),
		paths: {
			base: viewerPath
		},
		files: {
			routes: process.env.npm_config_adapter === "static"
				? "src/routes-static"
				: "src/routes"
		}
	}
};

export default config;