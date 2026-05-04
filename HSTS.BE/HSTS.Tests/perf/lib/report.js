// Custom report generation for HSTS performance tests
// Generates thesis-formatted HTML with NFR compliance table

import { getBaseUrl } from '../config/environments.js';

// Generate handleSummary output for thesis
export function generateThesisReport(data, testName, environment) {
  const metrics = data.metrics;
  const httpDuration = metrics.http_req_duration?.values || {};
  const httpFailed = metrics.http_req_failed?.values || {};
  const httpReqs = metrics.http_reqs?.values || {};
  const iterations = metrics.iterations?.values || {};

  // NFR compliance checks (from PRD Section 4)
  const isItinerary = testName.includes('itinerary');
  const p95Threshold = isItinerary ? 90000 : 3000;
  const p95Label = isItinerary ? '< 90s (itinerary)' : '< 3s (simple API)';

  const nfrChecks = [
    {
      criterion: `p95 response time ${p95Label}`,
      value: `${(httpDuration['p(95)'] || 0).toFixed(0)}ms`,
      pass: (httpDuration['p(95)'] || 0) < p95Threshold,
    },
    {
      criterion: 'Error rate < 1%',
      value: `${((httpFailed.rate || 0) * 100).toFixed(2)}%`,
      pass: (httpFailed.rate || 0) < 0.01,
    },
    {
      criterion: 'p99 response time within acceptable range',
      value: `${(httpDuration['p(99)'] || 0).toFixed(0)}ms`,
      pass: (httpDuration['p(99)'] || 0) < p95Threshold * 2,
    },
  ];

  const allPass = nfrChecks.every((c) => c.pass);
  const passCount = nfrChecks.filter((c) => c.pass).length;

  // Text summary for stdout
  const textSummary = `
╔══════════════════════════════════════════════════════════╗
║         HSTS Performance Test Report                    ║
╠══════════════════════════════════════════════════════════╣
║  Test:        ${testName.padEnd(42)}║
║  Environment: ${(environment || 'local-dev').padEnd(42)}║
║  Date:        ${new Date().toISOString().padEnd(42)}║
║  Result:      ${allPass ? 'PASS' : 'FAIL'} (${passCount}/${nfrChecks.length} criteria met)${' '.repeat(42 - `${allPass ? 'PASS' : 'FAIL'} (${passCount}/${nfrChecks.length} criteria met)`.length)}║
╠══════════════════════════════════════════════════════════╣
║  Metrics Summary:                                        ║
║    Requests:  ${(iterations.count || 0).toString().padEnd(44)}║
║    RPS:       ${(httpReqs.rate || 0).toFixed(1).padEnd(44)}║
║    p50:       ${((httpDuration['p(50)'] || 0)).toFixed(0)}ms${' '.repeat(42)}║
║    p95:       ${((httpDuration['p(95)'] || 0)).toFixed(0)}ms${' '.repeat(42)}║
║    p99:       ${((httpDuration['p(99)'] || 0)).toFixed(0)}ms${' '.repeat(42)}║
║    Avg:       ${((httpDuration.avg || 0)).toFixed(0)}ms${' '.repeat(42)}║
║    Max:       ${((httpDuration.max || 0)).toFixed(0)}ms${' '.repeat(42)}║
║    Errors:    ${((httpFailed.rate || 0) * 100).toFixed(2)}%${' '.repeat(42)}║
╚══════════════════════════════════════════════════════════╝
`;

  // HTML report for thesis
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HSTS Performance Report - ${testName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; background: #f5f5f5; color: #333; }
  .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 2rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #1a1a1a; }
  h2 { font-size: 1.2rem; margin: 1.5rem 0 0.75rem; color: #444; border-bottom: 2px solid #eee; padding-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
  .result-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: 600; font-size: 0.9rem; }
  .result-pass { background: #d4edda; color: #155724; }
  .result-fail { background: #f8d7da; color: #721c24; }
  table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; font-size: 0.9rem; }
  th, td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f8f9fa; font-weight: 600; }
  .pass { background: #d4edda; }
  .fail { background: #f8d7da; }
  .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; }
  .metric-card { background: #f8f9fa; border-radius: 6px; padding: 1rem; text-align: center; }
  .metric-value { font-size: 1.5rem; font-weight: 700; color: #1a1a1a; }
  .metric-label { font-size: 0.8rem; color: #666; margin-top: 0.25rem; }
  .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee; font-size: 0.8rem; color: #999; }
</style>
</head>
<body>
<div class="container">
  <h1>HSTS Performance Test Report</h1>
  <p class="meta">
    Test: <strong>${testName}</strong> |
    Environment: <strong>${environment || 'local-dev'}</strong> |
    Date: <strong>${new Date().toISOString()}</strong> |
    Result: <span class="result-badge ${allPass ? 'result-pass' : 'result-fail'}">${allPass ? 'PASS' : 'FAIL'}</span>
  </p>

  <h2>NFR Compliance</h2>
  <table>
    <tr><th>Criterion</th><th>Value</th><th>Result</th></tr>
    ${nfrChecks.map((c) => `<tr class="${c.pass ? 'pass' : 'fail'}"><td>${c.criterion}</td><td>${c.value}</td><td>${c.pass ? 'PASS' : 'FAIL'}</td></tr>`).join('')}
  </table>

  <h2>Metrics Summary</h2>
  <div class="metric-grid">
    <div class="metric-card"><div class="metric-value">${(iterations.count || 0)}</div><div class="metric-label">Total Requests</div></div>
    <div class="metric-card"><div class="metric-value">${(httpReqs.rate || 0).toFixed(1)}</div><div class="metric-label">Requests/sec</div></div>
    <div class="metric-card"><div class="metric-value">${((httpFailed.rate || 0) * 100).toFixed(2)}%</div><div class="metric-label">Error Rate</div></div>
    <div class="metric-card"><div class="metric-value">${(httpDuration['p(50)'] || 0).toFixed(0)}ms</div><div class="metric-label">p50 Latency</div></div>
    <div class="metric-card"><div class="metric-value">${(httpDuration['p(95)'] || 0).toFixed(0)}ms</div><div class="metric-label">p95 Latency</div></div>
    <div class="metric-card"><div class="metric-value">${(httpDuration['p(99)'] || 0).toFixed(0)}ms</div><div class="metric-label">p99 Latency</div></div>
    <div class="metric-card"><div class="metric-value">${(httpDuration.avg || 0).toFixed(0)}ms</div><div class="metric-label">Avg Latency</div></div>
    <div class="metric-card"><div class="metric-value">${(httpDuration.max || 0).toFixed(0)}ms</div><div class="metric-label">Max Latency</div></div>
    <div class="metric-card"><div class="metric-value">${(httpDuration.min || 0).toFixed(0)}ms</div><div class="metric-label">Min Latency</div></div>
  </div>

  <div class="footer">
    Generated by HSTS Performance Test Suite (k6) | Hangout - Smart Travel System
  </div>
</div>
</body>
</html>`;

  return {
    stdout: textSummary,
    [`reports/${testName}-${environment || 'local'}-${Date.now()}.html`]: html,
  };
}
