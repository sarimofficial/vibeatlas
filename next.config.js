/** @type {import('next').NextConfig} */
const nextConfig = {
  // Qloo key is only ever read in the server-side API route (lib/qloo.ts).
  // Nothing under /app or /lib is shipped to the browser except the API
  // response, which never contains the key.
};
module.exports = nextConfig;
