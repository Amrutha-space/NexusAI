async function runWithTimeout(check, timeoutMs = 4000) {
  let timeout;
  try {
    return await Promise.race([
      check.run(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${check.name} readiness timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

export function createReadinessHandler(service, checks) {
  return async (_req, res) => {
    const results = await Promise.all(
      checks.map(async (check) => {
        try {
          await runWithTimeout(check, check.timeoutMs);
          return { name: check.name, ok: true };
        } catch (error) {
          return { name: check.name, ok: false, error: error.message };
        }
      })
    );

    const isReady = results.every((result) => result.ok);
    res.status(isReady ? 200 : 503).json({
      status: isReady ? "ready" : "degraded",
      service,
      checks: results
    });
  };
}
