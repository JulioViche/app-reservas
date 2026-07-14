const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { input: null, output: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1]) {
      args.input = argv[++i];
    } else if (argv[i] === '--output' && argv[i + 1]) {
      args.output = argv[++i];
    }
  }
  return args;
}

const RISK_TO_LEVEL = {
  '3': 'error',
  '2': 'warning',
  '1': 'note',
  '0': 'note'
};

const CONFIDENCE_TO_LEVEL = {
  '3': 'error',
  '2': 'warning',
  '1': 'note',
  '0': 'none'
};

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildSarif(report) {
  const version = report['@version'] || 'unknown';
  const sites = Array.isArray(report.site) ? report.site : [];

  const rulesMap = new Map();
  const results = [];

  for (const site of sites) {
    const host = site['@host'] || 'unknown';
    const port = site['@port'] || '';
    const ssl = site['@ssl'] === 'true' || site['@ssl'] === true;
    const baseUri = `${ssl ? 'https' : 'http'}://${host}${port ? ':' + port : ''}`;

    const alerts = Array.isArray(site.alerts) ? site.alerts : [];
    for (const alert of alerts) {
      const ruleId = String(alert.pluginid || alert.id || 'unknown');
      const name = String(alert.alert || alert.name || 'Unknown alert');
      const risk = String(alert.riskcode || '0');
      const confidence = String(alert.confidence || '0');
      const uri = alert.uri || baseUri;
      const method = alert.method || 'GET';
      const param = alert.param || '';
      const evidence = stripHtml(alert.evidence);
      const solution = stripHtml(alert.solution);
      const description = stripHtml(alert.desc);
      const otherInfo = stripHtml(alert.otherinfo);

      if (!rulesMap.has(ruleId)) {
        rulesMap.set(ruleId, {
          id: ruleId,
          name: name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 64) || `Rule${ruleId}`,
          shortDescription: { text: name },
          fullDescription: { text: description.slice(0, 1000) || name },
          helpUri: `https://www.zaproxy.org/docs/alerts/${ruleId}`,
          defaultConfiguration: {
            level: RISK_TO_LEVEL[risk] || 'warning'
          },
          properties: {
            riskCode: risk,
            confidenceCode: confidence,
            cweId: alert.cweid || '',
            wascId: alert.wascid || '',
            tags: ['security', 'zap', `risk-${alert.riskdesc || risk}`.toLowerCase()]
          }
        });
      }

      const messageParts = [`${name}`];
      if (param) messageParts.push(`Parameter: ${param}`);
      if (evidence) messageParts.push(`Evidence: ${evidence}`);
      if (otherInfo) messageParts.push(`Info: ${otherInfo}`);

      const result = {
        ruleId,
        level: RISK_TO_LEVEL[risk] || 'warning',
        message: { text: messageParts.join(' | ') },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: uri.replace(/^https?:\/\/[^/]+/, '').split('?')[0] || '/',
                uriBaseId: '%SRCROOT%',
                properties: {
                  fullUrl: uri,
                  method,
                  host,
                  port
                }
              },
              region: { startLine: 1, startColumn: 1 }
            },
            logicalLocations: [
              {
                name: method + ' ' + uri,
                kind: 'url'
              }
            ]
          }
        ],
        properties: {
          confidence: CONFIDENCE_TO_LEVEL[confidence] || 'warning',
          confidenceCode: confidence,
          solution,
          otherInfo,
          references: stripHtml(alert.reference)
        }
      };

      if (alert.cweid) {
        result.properties.cwe = `https://cwe.mitre.org/data/definitions/${alert.cweid}.html`;
      }

      results.push(result);
    }
  }

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'OWASP ZAP',
            version,
            informationUri: 'https://www.zaproxy.org/',
            rules: Array.from(rulesMap.values()),
            properties: {
              categories: ['DAST', 'security'],
              tags: ['security', 'dynamic-analysis']
            }
          }
        },
        invocations: [
          {
            executionSuccessful: true,
            endTimeUtc: new Date().toISOString()
          }
        ],
        results
      }
    ]
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    console.error('Uso: node tools/zap-sarif.js --input <report.json> --output <report.sarif>');
    process.exit(1);
  }

  if (!fs.existsSync(args.input)) {
    console.error(`❌ No existe: ${args.input}`);
    process.exit(1);
  }

  let report;
  try {
    report = JSON.parse(fs.readFileSync(args.input, 'utf-8'));
  } catch (err) {
    console.error(`❌ JSON inválido en ${args.input}: ${err.message}`);
    process.exit(1);
  }

  const sarif = buildSarif(report);
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, JSON.stringify(sarif, null, 2), 'utf-8');

  const total = sarif.runs[0].results.length;
  console.log(`✅ SARIF generado: ${args.output} (${total} resultados)`);
}

main();
