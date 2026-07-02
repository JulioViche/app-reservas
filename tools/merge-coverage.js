const fs = require('fs');
const path = require('path');

const coverageDirs = [
  'auth-service/coverage',
  'booking-service/coverage',
  'user-service/coverage',
  'notification-service/coverage',
  'frontend/coverage'
];

const rootCoverageDir = path.join(__dirname, '..', 'coverage');

if (!fs.existsSync(rootCoverageDir)) {
  fs.mkdirSync(rootCoverageDir, { recursive: true });
}

const mergedLcovLines = [];

coverageDirs.forEach(dir => {
  const lcovPath = path.join(__dirname, '..', dir, 'lcov.info');
  if (fs.existsSync(lcovPath)) {
    const content = fs.readFileSync(lcovPath, 'utf-8');
    mergedLcovLines.push(content);
    console.log(`✓ Coverage agregado: ${dir}/lcov.info`);
  } else {
    console.warn(`⚠ No se encontró: ${dir}/lcov.info`);
  }
});

const outputPath = path.join(rootCoverageDir, 'lcov.info');
fs.writeFileSync(outputPath, mergedLcovLines.join('\n'), 'utf-8');
console.log(`\n✓ Reporte fusionado generado: ${outputPath}`);
