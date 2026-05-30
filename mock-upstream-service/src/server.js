import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "upstream-ok" });
});

app.get("/catalog/items", (_req, res) => {
  res.json({
    items: [
      { sku: "sku_analytics", name: "Analytics Bundle", price: 199 },
      { sku: "sku_gateway", name: "Gateway Pro", price: 299 }
    ]
  });
});

app.post("/payments/charge", (req, res) => {
  const amount = Number(req.body.amount || 0);
  if (amount <= 0) {
    return res.status(400).json({ error: "amount must be greater than zero" });
  }

  if (amount > 5000) {
    return res.status(502).json({ error: "upstream processor unavailable" });
  }

  return res.status(201).json({
    chargeId: `ch_${Date.now()}`,
    amount,
    currency: req.body.currency || "USD",
    status: "succeeded"
  });
});

app.listen(4010, () => {
  // Keep logs simple here because this service is only for local validation.
  console.log("mock-upstream-service listening on 4010");
});

