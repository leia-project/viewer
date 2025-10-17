
import { env } from '$env/dynamic/private';
import { decode } from 'jsonwebtoken';

import type { Handle } from '@sveltejs/kit';

const configUrl = env.CONFIG_URL;

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	if (configUrl) {
		event.locals.configSettings = {
			configUrl: configUrl
		}
	}

	const response = await resolve(event);
	return response;
}


import { env } from '$env/dynamic/private';
import { decode } from 'jsonwebtoken';
import { readFileSync } from 'fs'; // New import for file system operations
import { join } from 'path';     // New import for path manipulation

import type { Handle } from '@sveltejs/kit';

const configUrl = env.CONFIG_URL;

/**
 * Reads the 'klimaatonderlegger.config.json' file from the static directory.
 * Provides a default configuration if the file is not found or parsing fails.
 * @returns {object} The parsed configuration object.
 */
function readConfigFile() {
  try {
    const configPath = join(process.cwd(), 'static', 'klimaatonderlegger.config.json');
    const configFile = readFileSync(configPath, 'utf-8');
    return JSON.parse(configFile);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn('Configuration file static/klimaatonderlegger.config.json not found. Using default settings.');
    } else {
      console.error('Error reading or parsing static/klimaatonderlegger.config.json:', error);
    }
    // Default to projectsToolEnabled: false if there's any error
    return { projectsToolEnabled: false }; 
  }
}

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	if (configUrl) {
		event.locals.configSettings = {
			configUrl: configUrl
		}
	}

  // Read the application configuration and make 'projectsToolEnabled' available in event.locals
  const config = readConfigFile();
  event.locals.projectsToolEnabled = config.projectsToolEnabled || false; // Ensure a boolean default

	const response = await resolve(event, {
    // Use transformPageChunk to inject a script tag into the head
    // This makes 'projectsToolEnabled' available globally on the client-side (window object)
    // and can be used by app.html for conditional rendering logic.
    transformPageChunk: ({ html }) => {
      return html.replace('%sveltekit.head%', `
        %sveltekit.head%
        <script>
            window.projectsToolEnabled = ${JSON.stringify(event.locals.projectsToolEnabled)};
        </script>
      `);
    },
  });
	return response;
}