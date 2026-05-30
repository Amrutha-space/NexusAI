const baseUrls = {
  auth: process.env.AUTH_URL || "http://localhost:4001",
  gateway: process.env.GATEWAY_URL || "http://localhost:4000",
  logging: process.env.LOGGING_URL || "http://localhost:4003"
};

async function expectOkJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  const login = await expectOkJson(`${baseUrls.auth}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@example.com",
      password: "PlatformPass123!"
    })
  });

  const gatewayResponse = await expectOkJson(`${baseUrls.gateway}/proxy/payments/payments/charge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "ak_live_seed_platform_key"
    },
    body: JSON.stringify({
      amount: 299,
      currency: "USD"
    })
  });

  const overview = await expectOkJson(`${baseUrls.logging}/dashboard/overview`, {
    headers: {
      Authorization: `Bearer ${login.token}`
    }
  });

  if (!login.user?.organizationId) {
    throw new Error("Login response missing organizationId");
  }

  if (!gatewayResponse.chargeId) {
    throw new Error("Gateway response missing chargeId");
  }

  if (typeof overview.overview?.requests !== "number") {
    throw new Error("Overview response missing request count");
  }

  console.log(
    JSON.stringify(
      {
        login: login.user.email,
        organizationId: login.user.organizationId,
        chargeId: gatewayResponse.chargeId,
        requests: overview.overview.requests
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

