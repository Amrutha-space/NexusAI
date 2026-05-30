export function createReadinessHandler(service, checks) {
  return async (_req, res) => {
    const results = await Promise.all(
      checks.map(async (check) => {
        try {
          await check.run();
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
