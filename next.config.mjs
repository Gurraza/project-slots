/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/play/:slug*', // What the user sees in the browser
        destination: '/games/:slug*', // Where the code actually lives
      },
    ];
  },
};

export default nextConfig;
