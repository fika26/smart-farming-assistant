/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { dirs: ['src'] },
  async redirects() {
    return [
      // AI Insights was merged into the AI Assistant's "What your readings mean" tab.
      { source: '/ai-insights', destination: '/ai-assistant', permanent: true },
    ];
  },
};

export default nextConfig;
