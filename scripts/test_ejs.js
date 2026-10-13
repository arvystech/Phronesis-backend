const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '../views');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith('.ejs')) {
      files.push(name);
    }
  }
  return files;
}

const ejsFiles = getFiles(viewsDir);
let hasError = false;

console.log(`Testing compilation of ${ejsFiles.length} EJS templates...\n`);

for (const filePath of ejsFiles) {
  const relativePath = path.relative(viewsDir, filePath);
  try {
    const template = fs.readFileSync(filePath, 'utf8');
    ejs.compile(template, { filename: filePath });
    console.log(`✅ OK: ${relativePath}`);
  } catch (err) {
    hasError = true;
    console.error(`❌ ERROR in ${relativePath}:`);
    console.error(err.message);
    console.error('---');
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('\n✨ All EJS templates compiled cleanly!');
  process.exit(0);
}
