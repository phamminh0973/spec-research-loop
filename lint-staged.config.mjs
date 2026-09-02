/** @type {import("lint-staged").Configuration} */
const config = {
  "**/*.{js,jsx,mjs,cjs,ts,tsx}": [
    "biome check --write --files-ignore-unknown=true",
  ],
  "**/*.{json,jsonc,css,yml,yaml,md,mdx}": [
    "biome check --write --files-ignore-unknown=true",
  ],
};

export default config;
