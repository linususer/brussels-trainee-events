// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages serves project sites under /<repo-name>/. In CI the workflow
// passes the real values from the Pages configuration; locally these defaults apply.
export default defineConfig({
  site: process.env.SITE_ORIGIN || 'https://linususer.github.io',
  base: process.env.SITE_BASE_PATH ?? '/brussels-trainee-events',
});
