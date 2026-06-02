/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aggregate/db'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
