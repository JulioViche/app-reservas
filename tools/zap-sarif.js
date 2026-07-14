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

  let converter;
  try {
    converter = require('@zaproxy/sarif-converter');
  } catch (err) {
    console.error('❌ Falta dependencia @zaproxy/sarif-converter. Ejecuta: npm install');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(args.input, 'utf-8'));
  const tool = { name: 'OWASP ZAP' };

  const sarif = converter.convert(report, tool);

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, JSON.stringify(sarif, null, 2), 'utf-8');
  console.log(`✅ SARIF generado: ${args.output}`);
}

main();
