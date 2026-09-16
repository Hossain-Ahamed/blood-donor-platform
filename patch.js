const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.pnpm = { overrides: { "htmlparser2": "^9.1.0" } };
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
