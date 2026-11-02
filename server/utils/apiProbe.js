export async function isCampusFlowApiRunning(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;

    const health = await response.json();
    return health.status === "ok" && health.database === "connected";
  } catch (error) {
    if (error.cause?.code === "ECONNREFUSED" || error.name === "TimeoutError") {
      return false;
    }
    throw error;
  }
}
