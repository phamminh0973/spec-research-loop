/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@specloop/schemas", "@specloop/api"],
  experimental: {
    // tRPC v10 + superjson works without this, but kept here as a reminder
    // for future server-action work.
  },
};

export default nextConfig;
