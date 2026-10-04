const axios = require('axios');
const config = require('../config');

async function checkAnomaly(readings) {
  if (!config.ML_SERVICE_URL) throw new Error('ML_SERVICE_URL is required');
  const response = await axios.post(`${config.ML_SERVICE_URL}/predict`, readings, { timeout: 1500 });
  return response.data;
}

module.exports = { checkAnomaly };
