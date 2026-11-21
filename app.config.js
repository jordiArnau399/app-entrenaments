const appJson = require('./app.json');

// Only the published site lives under /app-entrenaments/. Local `npm start` stays at /.
const pagesBase = process.env.GITHUB_PAGES === 'true' ? '/app-entrenaments' : '';

module.exports = () => ({
  expo: {
    ...appJson.expo,
    web: {
      ...appJson.expo.web,
      output: 'single',
    },
    experiments: {
      ...appJson.expo.experiments,
      ...(pagesBase ? { baseUrl: pagesBase } : {}),
    },
  },
});
