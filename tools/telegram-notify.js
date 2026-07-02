const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const author = process.env.AUTHOR || 'Desconocido';
const branch = process.env.BRANCH || 'unknown';
const commitSha = process.env.COMMIT_SHA || '';
const commitUrl = process.env.COMMIT_URL || '';
const repoUrl = process.env.REPO_URL || '';
const filesChanged = process.env.FILES_CHANGED || '';
const sonarQualityGate = process.env.SONAR_QUALITY_GATE || '';
const sonarBugs = process.env.SONAR_BUGS || '';
const sonarVulnerabilities = process.env.SONAR_VULNERABILITIES || '';
const sonarUrl = process.env.SONAR_URL || '';
const isDetailed = process.env.IS_DETAILED === 'true';

function buildMessage() {
  let msg = `🚀 *Nuevo commit en app-reservas*\n\n`;
  msg += `👤 *Autor:* ${author}\n`;
  msg += `🌿 *Rama:* ${branch}\n`;
  msg += `🔗 *Commit:* ${commitUrl || `${repoUrl}/commit/${commitSha}`}\n`;

  if (filesChanged) {
    const files = filesChanged.split(',').slice(0, 10).map(f => `  \`${f.trim()}\``).join('\n');
    msg += `📁 *Archivos modificados:*\n${files}\n`;
  }

  if (isDetailed && sonarQualityGate) {
    const statusEmoji = sonarQualityGate === 'OK' ? '✅' : sonarQualityGate === 'FAILED' ? '❌' : '⚠️';
    msg += `\n📊 *Análisis SonarQube:*\n`;
    msg += `${statusEmoji} *Quality Gate:* ${sonarQualityGate}\n`;
    msg += `🐛 *Bugs:* ${sonarBugs}\n`;
    msg += `🔒 *Vulnerabilidades:* ${sonarVulnerabilities}\n`;
    if (sonarUrl) {
      msg += `🔗 *Logs:* ${sonarUrl}\n`;
    }
  }

  return msg;
}

async function sendNotification() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados');
    process.exit(1);
  }

  const message = buildMessage();
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error Telegram (${response.status}): ${errorText}`);
      process.exit(1);
    }

    console.log('✅ Notificación enviada a Telegram');
  } catch (err) {
    console.error(`❌ Error al enviar notificación: ${err.message}`);
    process.exit(1);
  }
}

sendNotification();
