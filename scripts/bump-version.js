const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSION_FILE = path.join(__dirname, '..', 'version.json');
const HTML_FILES = [
  'index.html',
  'calculadoras.html',
  'comparador-investimentos.html',
  'conversor-moedas.html'
];

// Lê a versão atual
const version = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));

// Pega os commits desde a última tag
let log = '';
try {
  const lastTag = execSync('git describe --tags --abbrev=0 2>nul || echo ""', { encoding: 'utf-8' }).trim();
  if (lastTag) {
    log = execSync(`git log ${lastTag}..HEAD --oneline`, { encoding: 'utf-8' });
  } else {
    log = execSync('git log --oneline', { encoding: 'utf-8' });
  }
} catch {
  log = execSync('git log --oneline', { encoding: 'utf-8' });
}

// Analisa os commits para decidir o bump
const messages = log.toLowerCase();

let bumpType = 'patch'; // default

if (/\bbreaking\s*change\b|^major:/m.test(messages)) {
  bumpType = 'major';
} else if (/^feat:|^feature:|^nova\b/m.test(messages)) {
  bumpType = 'minor';
} else if (/^fix:|^bugfix:|^ajuste:|^refactor:|^perf:/m.test(messages)) {
  bumpType = 'patch';
} else if (/^docs:|^style:|^chore:|^test:/m.test(messages)) {
  bumpType = 'none'; // não altera versão
}

// Aplica o bump
if (bumpType === 'major') {
  version.major += 1;
  version.minor = 0;
  version.patch = 0;
} else if (bumpType === 'minor') {
  version.minor += 1;
  version.patch = 0;
} else if (bumpType === 'patch') {
  version.patch += 1;
}

// Salva version.json
fs.writeFileSync(VERSION_FILE, JSON.stringify(version, null, 2) + '\n');

const versionStr = `v${version.major}.${version.minor}.${version.patch}`;
console.log(`Versão atualizada: ${versionStr}`);

// Atualiza o footer em todos os HTMLs
// Remove qualquer versão existente e adiciona a nova
// Aceita: "&copy;" ou "©" e remove prefixo "vX.Y.Z • " se existir
const footerRegex = /(?:v\d+\.\d+\.\d+\s*•\s*)?((&copy;|©) \d{4} Compara Financiamento\. Todos os direitos reservados\.)/;
const replacement = `${versionStr} • $1`;

for (const file of HTML_FILES) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠ Arquivo não encontrado: ${file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  if (footerRegex.test(content)) {
    content = content.replace(footerRegex, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ Footer atualizado: ${file}`);
  } else {
    console.log(`  ⚠ Padrão não encontrado em: ${file}`);
  }
}

// Cria a tag git
try {
  execSync(`git tag ${versionStr}`, { encoding: 'utf-8' });
  console.log(`Tag criada: ${versionStr}`);
} catch (e) {
  console.log(`Tag já existe ou erro ao criar: ${e.message}`);
}