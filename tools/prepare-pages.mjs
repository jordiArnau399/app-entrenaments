import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const indexPath = path.join(dist, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('No hi ha dist/index.html. Executa primer expo export --platform web.');
  process.exit(1);
}

// GitHub Pages serveix 404.html quan algú obre o refresca /entrenador directament.
fs.copyFileSync(indexPath, path.join(dist, '404.html'));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('Preparat per a GitHub Pages: 404.html i .nojekyll');
