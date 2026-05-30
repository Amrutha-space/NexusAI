import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || "http://localhost:4000";
const authUrl = import.meta.env.VITE_AUTH_URL || "http://localhost:4001";
const loggingUrl = import.meta.env.VITE_LOGGING_URL || "http://localhost:4003";
const featureHighlights = [
  { title: "AI abuse detection", detail: "Score traffic spikes, errors, and latency drift from gateway telemetry." },
  { title: "Cloud-native control", detail: "Manage APIs, keys, limits, retries, and circuit breakers from one place." },
  { title: "Predictive operations", detail: "Recommend replicas, cache TTLs, and protective policies before incidents spread." }
];
const socialLinks = [
  { label: "LinkedIn", href: "https://www.linkedin.com" },
  { label: "GitHub", href: "https://github.com" },
  { label: "X", href: "https://x.com" },
  { label: "Email", href: "mailto:support@apigateway.local" }
];

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function Card({ title, value, subtitle }) {
  return (
    <div className="card metric-card">
      <span className="eyebrow">{title}</span>
      <strong>{value}</strong>
      <p>{subtitle}</p>
    </div>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function InsightCard({ label, value, detail, tone = "default" }) {
  return (
    <div className={`insight-card insight-${tone}`}>
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function NexusMotion() {
  return (
    <div className="nexus-motion" aria-hidden="true">
      <div className="motion-plane">
        <span className="scan-line" />
        <div className="signal-node node-a" />
        <div className="signal-node node-b" />
        <div className="signal-node node-c" />
        <div className="signal-node node-d" />
        <div className="traffic-column column-a" />
        <div className="traffic-column column-b" />
        <div className="traffic-column column-c" />
        <div className="traffic-column column-d" />
      </div>
      <div className="motion-readout">
        <span>AI risk model</span>
        <strong>live</strong>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="platform-footer animate-wind">
      <div className="footer-grid">
        <div className="footer-about">
        <span className="eyebrow">About NexusAI Gateway</span>
          <h3>AI-powered API operations for cloud-native teams.</h3>
          <p>
            NexusAI Gateway combines API management, distributed rate limiting, observability, and
            AI-assisted operations for safer high-scale API traffic.
          </p>
        </div>
        <div>
          <span className="footer-heading">Product</span>
          <div className="footer-stack">
            <span>AI Gateway</span>
            <span>Adaptive Rate Limits</span>
            <span>Predictive Scaling</span>
          </div>
        </div>
        <div>
          <span className="footer-heading">Follow</span>
          <div className="footer-links">
            {socialLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
            ))}
          </div>
        </div>
      </div>
      <div className="footer-meta">
        <span>NexusAI Gateway</span>
        <span>Built for AI-powered API operations</span>
      </div>
    </footer>
  );
}

export default function App() {
  const [mode, setMode] = useState("register");
  const [token, setToken] = useState(localStorage.getItem("platform-token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("platform-user") || "null"));
  const [overview, setOverview] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [usage, setUsage] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [apis, setApis] = useState([]);
  const [keys, setKeys] = useState([]);
  const [selectedApiId, setSelectedApiId] = useState("");
  const [activityFeed, setActivityFeed] = useState([]);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [isCreatingApi, setIsCreatingApi] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [alertFilter, setAlertFilter] = useState("open");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }),
    [token]
  );
  const filteredAlerts = useMemo(() => {
    if (alertFilter === "all") {
      return alerts;
    }

    if (alertFilter === "resolved") {
      return alerts.filter((alert) => Boolean(alert.resolved_at));
    }

    return alerts.filter((alert) => !alert.resolved_at);
  }, [alertFilter, alerts]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            organizationName: formData.get("organizationName"),
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password")
          }
        : {
            email: formData.get("email"),
            password: formData.get("password")
          };

    const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
    const data = await request(`${authUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("platform-token", data.token);
    localStorage.setItem("platform-user", JSON.stringify(data.user));
  }

  async function loadDashboard() {
    const [overviewResponse, intelligenceResponse, trafficResponse, usageResponse, alertsResponse, apiResponse] = await Promise.all([
      request(`${loggingUrl}/dashboard/overview`, { headers: authHeaders }),
      request(`${loggingUrl}/dashboard/intelligence`, { headers: authHeaders }),
      request(`${loggingUrl}/dashboard/traffic`, { headers: authHeaders }),
      request(`${loggingUrl}/dashboard/usage`, { headers: authHeaders }),
      request(`${loggingUrl}/dashboard/alerts`, { headers: authHeaders }),
      request(`${gatewayUrl}/management/apis`, { headers: authHeaders })
    ]);

    setOverview(overviewResponse.overview);
    setIntelligence(intelligenceResponse.intelligence);
    setTraffic(trafficResponse.data);
    setUsage(usageResponse.data);
    setAlerts(alertsResponse.alerts);
    setApis(apiResponse.apis);
    if (!selectedApiId && apiResponse.apis[0]) {
      setSelectedApiId(apiResponse.apis[0].id);
    }
  }

  async function loadKeys(apiId) {
    if (!apiId) return;
    const data = await request(`${gatewayUrl}/management/apis/${apiId}/keys`, { headers: authHeaders });
    setKeys(data.keys);
  }

  useEffect(() => {
    if (!token) return;
    loadDashboard().catch((error) => setStatus(error.message));
  }, [token]);

  useEffect(() => {
    loadKeys(selectedApiId).catch(() => {});
  }, [selectedApiId]);

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`${loggingUrl.replace("http", "ws")}/ws`);
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setActivityFeed((current) => [payload, ...current].slice(0, 12));
      if (payload.type === "alert") {
        setAlerts((current) => [payload.alert, ...current].slice(0, 20));
      }
    };
    return () => ws.close();
  }, [token]);

  useEffect(() => {
    const nodes = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        threshold: 0.16
      }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [token, mode, apis.length, keys.length, usage.length, alerts.length, traffic.length, intelligence?.generatedAt]);

  async function createApi(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsCreatingApi(true);
    setStatusType("info");
    setStatus("Creating API...");
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.cacheTtlSeconds = Number(payload.cacheTtlSeconds);
    payload.retryCount = Number(payload.retryCount);
    payload.timeoutMs = Number(payload.timeoutMs);
    payload.circuitBreakerThreshold = Number(payload.circuitBreakerThreshold);

    try {
      const data = await request(`${gatewayUrl}/management/apis`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      setStatusType("success");
      setStatus(`API ${data.api.name} created`);
      form.reset();
      await loadDashboard();
    } catch (error) {
      setStatusType("error");
      setStatus(error.message);
    } finally {
      setIsCreatingApi(false);
    }
  }

  async function createKey(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsCreatingKey(true);
    setStatusType("info");
    setStatus("Creating API key...");
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.requestsPerMinute = Number(payload.requestsPerMinute);
    payload.burstCapacity = Number(payload.burstCapacity);
    payload.windowSizeSeconds = Number(payload.windowSizeSeconds);

    try {
      const data = await request(`${gatewayUrl}/management/apis/${selectedApiId}/keys`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      setStatusType("success");
      setStatus(`API key created. Secret: ${data.apiKey.secret}`);
      form.reset();
      await loadKeys(selectedApiId);
    } catch (error) {
      setStatusType("error");
      setStatus(error.message);
    } finally {
      setIsCreatingKey(false);
    }
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <div className="ambient-grid" />
        <section className="auth-panel">
          <div className="hero-copy animate-slide hero-stage">
            <span className="eyebrow">NexusAI Gateway</span>
            <h1>AI traffic intelligence for cloud APIs.</h1>
            <p>
              Secure APIs, detect anomalies, debug failures, and plan scaling from live gateway telemetry.
            </p>
            <NexusMotion />
            <div className="feature-rail">
              {featureHighlights.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`feature-card ${index === 1 ? "animate-flip" : "animate-wind"}`}
                >
                  <strong>{feature.title}</strong>
                  <span>{feature.detail}</span>
                </div>
              ))}
            </div>
          </div>
          <form className="card form-card animate-flip auth-form-shell" onSubmit={handleAuthSubmit}>
            <div className="form-heading">
              <h2>{mode === "register" ? "Get started" : "Welcome back"}</h2>
              <p>
                {mode === "register"
                  ? "Create your organization and start managing API traffic."
                  : "Sign in to access your API dashboard."}
              </p>
            </div>
            <div className="toggle-row">
              <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
                Onboard
              </button>
              <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
                Sign in
              </button>
            </div>
            {mode === "register" && <input name="organizationName" placeholder="Organization name" required />}
            {mode === "register" && <input name="name" placeholder="Your name" required />}
            <input name="email" placeholder="Work email" type="email" required />
            <input name="password" placeholder="Password" type="password" required minLength={10} />
            <button className="primary" type="submit">
              {mode === "register" ? "Create account" : "Login"}
            </button>
          </form>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <div className="ambient-grid" />
      <header className="topbar animate-slide">
        <div className="topbar-copy">
          <span className="eyebrow">{user?.organizationName}</span>
          <h1>NexusAI Gateway</h1>
          <p>AI-powered cloud-native API management with adaptive traffic control and live operational intelligence.</p>
        </div>
        <div className="topbar-actions">
          <div className="mini-stat">
            <span>Role</span>
            <strong>{user?.role || "admin"}</strong>
          </div>
          <div className="mini-stat">
            <span>Endpoints</span>
            <strong>{apis.length}</strong>
          </div>
        </div>
        <button
          className="ghost"
          onClick={() => {
            localStorage.clear();
            setToken("");
            setUser(null);
          }}
        >
          Logout
        </button>
      </header>

      {status && <div className={`banner ${statusType === "error" ? "banner-error" : ""}`}>{status}</div>}

      <section className="metrics-grid animate-slide">
        <Card title="Requests (24h)" value={overview?.requests || 0} subtitle="Total routed through the gateway" />
        <Card title="Error Rate" value={`${((overview?.errorRate || 0) * 100).toFixed(2)}%`} subtitle="Rolling platform error ratio" />
        <Card title="Latency" value={`${Math.round(overview?.avgLatency || 0)} ms`} subtitle={`p95 ${Math.round(overview?.p95 || 0)} ms`} />
        <Card title="AI Risk" value={`${intelligence?.anomaly?.score ?? 0}/100`} subtitle={intelligence?.anomaly?.severity || "normal"} />
      </section>

      <section className="hero-dashboard-band animate-wind">
        <div className="hero-band-copy">
          <span className="eyebrow">AI Operations Snapshot</span>
          <h2>Detect, explain, and optimize traffic.</h2>
          <p>
            {intelligence?.summary || "NexusAI analyzes traffic patterns, failures, latency, and cache pressure from live telemetry."}
          </p>
        </div>
        <div className="hero-band-pills">
          <NexusMotion />
        </div>
      </section>

      <section className="ai-grid reveal reveal-slide">
        <InsightCard
          label="Anomaly Detection"
          value={`${intelligence?.anomaly?.score ?? 0}/100`}
          detail={intelligence?.anomaly?.message || "Waiting for enough traffic to build an anomaly baseline."}
          tone={intelligence?.anomaly?.severity === "critical" ? "danger" : intelligence?.anomaly?.severity === "warning" ? "warn" : "default"}
        />
        <InsightCard
          label="Predictive Scaling"
          value={`${intelligence?.scaling?.recommendedReplicas ?? 1} replicas`}
          detail={intelligence?.scaling?.reason || "Replica recommendation will update as traffic arrives."}
          tone={intelligence?.scaling?.autoscalingSignal === "scale-out" ? "warn" : "default"}
        />
        <InsightCard
          label="AI Log Debugger"
          value={intelligence?.openaiAnalysis?.enabled ? "OpenAI on" : intelligence?.logDebug?.severity || "normal"}
          detail={intelligence?.openaiAnalysis?.enabled ? intelligence?.openaiAnalysis?.summary : intelligence?.logDebug?.recommendation || "No failure clusters detected."}
          tone={intelligence?.logDebug?.severity === "warning" ? "warn" : "default"}
        />
        <InsightCard
          label="Adaptive Limits"
          value={intelligence?.adaptivePolicy?.mode || "balanced"}
          detail={intelligence?.adaptivePolicy?.recommendation || "Rate-limit policy recommendation will appear after traffic is observed."}
        />
      </section>

      <section className="panel-grid">
        <div className="card reveal reveal-slide stagger-1">
          <SectionTitle title="NexusAI Recommendations" description="AI-assisted cache, scale, and debugging suggestions from live platform telemetry." />
          <div className="feed">
            {(intelligence?.cache?.candidates || []).length === 0 && (
              <p className="muted">{intelligence?.cache?.message || "Generate GET traffic to unlock cache recommendations."}</p>
            )}
            {(intelligence?.cache?.candidates || []).map((candidate) => (
              <div key={candidate.slug} className="feed-item">
                <strong>{candidate.name}: cache score {candidate.score}/100</strong>
                <span>{candidate.reason}</span>
                <span className="incident-meta">Recommended TTL: {candidate.recommendedTtlSeconds}s</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card reveal reveal-flip stagger-2">
          <SectionTitle title="AI Failure Explanation" description="OpenAI-enhanced root-cause analysis when an API key is configured, with deterministic local fallback." />
          <div className="feed">
            <div className="feed-item">
              <strong>{intelligence?.openaiAnalysis?.likelyCause || intelligence?.logDebug?.likelyCause || "No active failure cluster"}</strong>
              <span>{intelligence?.openaiAnalysis?.summary || intelligence?.logDebug?.recommendation || "Keep observing live traffic."}</span>
              <span className="incident-meta">Model: {intelligence?.openaiAnalysis?.model || intelligence?.model || "local-heuristic-ai-v1"}</span>
            </div>
            {(intelligence?.openaiAnalysis?.actions || []).map((action) => (
              <div key={action} className="table-row compact-row">
                <span>{action}</span>
              </div>
            ))}
            {(intelligence?.logDebug?.evidence || []).map((event, index) => (
              <div key={`${event.routeSlug}-${event.statusCode}-${index}`} className="table-row compact-row">
                <span>{event.method} /{event.routeSlug}</span>
                <span>{event.statusCode}</span>
                <span>{event.latencyMs} ms</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="architecture-card reveal reveal-wind">
        <SectionTitle title="Cloud Architecture" description="How NexusAI Gateway handles real API traffic across distributed services." />
        <div className="architecture-flow">
          {["Users", "Load Balancer", "Gateway Cluster", "Rate Limiter", "Upstream APIs", "Event Queue", "NexusAI Engine", "Ops Dashboard"].map((node) => (
            <div key={node} className="architecture-node">
              <span>{node}</span>
            </div>
          ))}
        </div>
        <div className="architecture-proof">
          <span>Dockerized microservices</span>
          <span>Redis shared state</span>
          <span>PostgreSQL rollups</span>
          <span>Prometheus metrics</span>
          <span>Trace propagation</span>
          <span>Kubernetes HPA manifests</span>
        </div>
      </section>

      <section className="panel-grid">
        <div className="card chart-card reveal reveal-slide stagger-1">
          <SectionTitle title="Traffic" description="Recent request volume, errors, and average latency." />
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={traffic}>
              <defs>
                <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff7b54" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ff7b54" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
              <XAxis dataKey="time" hide />
              <YAxis stroke="#9f9f9f" />
              <Tooltip />
              <Area type="monotone" dataKey="requests" stroke="#ff7b54" fill="url(#trafficFill)" />
              <Area type="monotone" dataKey="errors" stroke="#ffd56f" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card reveal reveal-flip stagger-2">
          <SectionTitle title="Live Activity" description="Real-time updates from WebSocket telemetry." />
          <div className="feed">
            {activityFeed.length === 0 && <p className="muted">Waiting for live traffic...</p>}
            {activityFeed.map((item, index) => (
              <div key={`${item.type}-${index}`} className="feed-item">
                <strong>{item.type === "alert" ? "Alert" : "Metric update"}</strong>
                <span>{item.type === "alert" ? item.alert.message : `${item.requests || 0} requests | ${Math.round(item.avgLatency || 0)} ms avg latency`}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel-grid">
        <div className="card reveal reveal-slide stagger-1">
          <SectionTitle title="Register API" description="Create an upstream route with cache, timeout, retry, and breaker settings." />
          <form className="stack-form" onSubmit={createApi}>
            <input name="name" placeholder="Payments API" required />
            <input name="slug" placeholder="payments" required />
            <input name="upstreamUrl" placeholder="https://api.example.com/" required />
            <input name="description" placeholder="Core payment processing API" />
            <div className="inline-grid">
              <input name="cacheTtlSeconds" defaultValue="30" type="number" min="0" />
              <input name="retryCount" defaultValue="2" type="number" min="0" />
            </div>
            <div className="inline-grid">
              <input name="timeoutMs" defaultValue="5000" type="number" min="100" />
              <input name="circuitBreakerThreshold" defaultValue="5" type="number" min="1" />
            </div>
            <button className="primary" type="submit" disabled={isCreatingApi}>
              {isCreatingApi ? "Creating..." : "Create API"}
            </button>
          </form>
        </div>

        <div className="card reveal reveal-wind stagger-2">
          <SectionTitle title="Provision API Key" description="Attach rate limiting strategy and per-key quota." />
          <select value={selectedApiId} onChange={(event) => setSelectedApiId(event.target.value)}>
            <option value="">Select API</option>
            {apis.map((api) => (
              <option key={api.id} value={api.id}>{api.name}</option>
            ))}
          </select>
          <form className="stack-form" onSubmit={createKey}>
            <input name="name" placeholder="Mobile client key" required />
            <select name="role" defaultValue="user">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <select name="rateLimitStrategy" defaultValue="token_bucket">
              <option value="token_bucket">token_bucket</option>
              <option value="sliding_window">sliding_window</option>
            </select>
            <div className="inline-grid">
              <input name="requestsPerMinute" defaultValue="120" type="number" min="1" />
              <input name="burstCapacity" defaultValue="40" type="number" min="1" />
            </div>
            <input name="windowSizeSeconds" defaultValue="60" type="number" min="1" />
            <button className="primary" type="submit" disabled={!selectedApiId || isCreatingKey}>
              {isCreatingKey ? "Creating..." : "Create Key"}
            </button>
          </form>
        </div>
      </section>

      <section className="panel-grid">
        <div className="card chart-card reveal reveal-slide stagger-1">
          <SectionTitle title="Usage Analytics" description="Per-API request volume, latency, and billable spend." />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={usage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
              <XAxis dataKey="slug" stroke="#9f9f9f" />
              <YAxis stroke="#9f9f9f" />
              <Tooltip />
              <Bar dataKey="requests" fill="#6dd3ce" />
              <Bar dataKey="errors" fill="#ff7b54" />
            </BarChart>
          </ResponsiveContainer>
          <div className="table-list">
            {usage.map((item) => (
              <div key={item.slug} className="table-row">
                <span>{item.name}</span>
                <span>{item.requests} req</span>
                <span>{Math.round(item.avg_latency)} ms</span>
                <span>${Number(item.spend || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card reveal reveal-flip stagger-2">
          <SectionTitle title="Active Keys" description="Provisioned credentials for the selected API." />
          <div className="table-list">
            {keys.map((key) => (
              <div key={key.id} className="table-row">
                <span>{key.name}</span>
                <span>{key.rate_limit_strategy}</span>
                <span>{key.requests_per_minute}/min</span>
                <span>{key.is_active ? "active" : "revoked"}</span>
              </div>
            ))}
          </div>
          <div className="alert-header">
            <SectionTitle title="Alerts" description="Open incidents first, with resolved history available for review." />
            <div className="alert-filters">
              <button
                type="button"
                className={alertFilter === "open" ? "filter-pill active" : "filter-pill"}
                onClick={() => setAlertFilter("open")}
              >
                Open
              </button>
              <button
                type="button"
                className={alertFilter === "resolved" ? "filter-pill active" : "filter-pill"}
                onClick={() => setAlertFilter("resolved")}
              >
                Resolved
              </button>
              <button
                type="button"
                className={alertFilter === "all" ? "filter-pill active" : "filter-pill"}
                onClick={() => setAlertFilter("all")}
              >
                All
              </button>
            </div>
          </div>
          <div className="feed">
            {filteredAlerts.length === 0 && <p className="muted">No alerts for this filter.</p>}
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className={`feed-item ${alert.resolved_at ? "resolved-alert" : "open-alert"}`}>
                <strong>{alert.resolved_at ? "Resolved incident" : "Open incident"}</strong>
                <span>{alert.message}</span>
                <span className="incident-meta">
                  {alert.resolved_at
                    ? `Resolved at ${new Date(alert.resolved_at).toLocaleString()}`
                    : `Triggered at ${new Date(alert.triggered_at).toLocaleString()}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
