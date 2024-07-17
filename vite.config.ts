import { defineConfig, loadEnv } from "vite";
import { sveltekit } from '@sveltejs/kit/vite';
import { viteStaticCopy } from "vite-plugin-static-copy";

const cesiumSource = "node_modules/cesium/Build/Cesium";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory and append to process.env
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  process.env = {...process.env, ...loadEnv(mode, process.cwd(), '')};
  const cesiumBaseUrl = `${process.env.APP_URL}/Cesium`

  return {
      define: {
        // This is the base url for static files that CesiumJS needs to load.
        // Set to an empty string to place the files at the site's root path
        CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl),
        "process.env": process.env
      },
      plugins: [
        sveltekit(),
        // Copy Cesium Assets, Widgets, and Workers to a static directory.
        // If you need to add your own static files to your project, use the `public` directory
        // and other options listed here: https://vitejs.dev/guide/assets.html#the-public-directory
        viteStaticCopy({
          targets: [
            { src: `${cesiumSource}/ThirdParty`, dest: 'Cesium' },
            { src: `${cesiumSource}/Workers`, dest: 'Cesium' },
            { src: `${cesiumSource}/Assets`, dest: 'Cesium' },
            { src: `${cesiumSource}/Widgets`, dest: 'Cesium' },
          ],
        }),
      ],
    }
  }
);