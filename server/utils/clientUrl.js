const localClientOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function originForHost(host) {
  return new URL(host.includes("://") ? host : `https://${host}`).origin;
}

export function getClientUrl() {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return process.env.CLIENT_URL || (vercelHost ? `https://${vercelHost}` : "http://localhost:5173");
}

export function getAllowedClientOrigins(clientPort) {
  const vercelOrigins = [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter(Boolean).map(originForHost);

  return new Set([
    ...localClientOrigins,
    `http://localhost:${clientPort}`,
    `http://127.0.0.1:${clientPort}`,
    originForHost(getClientUrl()),
    ...vercelOrigins,
  ]);
}
