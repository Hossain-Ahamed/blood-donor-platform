const fs = require('fs');
const path = 'apps/api/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

pkg.dependencies['@nestjs/cache-manager'] = '^3.1.3';
pkg.dependencies['@nestjs/jwt'] = '^10.2.0';
pkg.dependencies['@nestjs/passport'] = '^10.0.3';
pkg.dependencies['@nestjs/schedule'] = '^6.1.3';
pkg.dependencies['@nestjs/swagger'] = '^8.1.1';
pkg.dependencies['@nestjs/terminus'] = '^10.2.3';

fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
