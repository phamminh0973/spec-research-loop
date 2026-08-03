/** @type {import("lint-staged").Configuration} */
const config = {
  "apps/web/**/*.{js,jsx,mjs,cjs,ts,tsx}": [
    "pnpm --dir apps/web exec eslint --fix --max-warnings=0",
    "pnpm exec prettier --write",
  ],
  "apps/api/**/*.py": [
    "uv run --directory apps/api ruff check --fix",
    "uv run --directory apps/api ruff format",
  ],
  "apps/worker/**/*.py": [
    "uv run --directory apps/worker ruff check --fix",
    "uv run --directory apps/worker ruff format",
  ],
  "./*.{js,mjs,cjs}": "pnpm exec prettier --write",
  "packages/**/*.{js,mjs,cjs}": "pnpm exec prettier --write",
  "**/*.{md,mdx}": "pnpm exec prettier --write",
  "*.{json,jsonc,css,yml,yaml}": "pnpm exec prettier --write",
};

export default config;
