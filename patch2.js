const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
delete pkg.pnpm;
pkg.resolutions = { "htmlparser2": "^9.1.0" };
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
