const fs = require('node:fs');
fs.cpSync('public', 'dist/store', {
  recursive: true,
  filter: (source) => source !== 'public/index.html',
});
fs.cpSync('public/conf', 'dist/store/public/conf', { recursive: true });
