function dewPointC(temperature, humidity) {
  const t = Number(temperature);
  const rh = Math.min(100, Math.max(1, Number(humidity)));
  const a = 17.62;
  const b = 243.12;
  const gamma = Math.log(rh / 100) + (a * t) / (b + t);
  return Number(((b * gamma) / (a - gamma)).toFixed(1));
}

function heatIndexC(temperature, humidity) {
  const tF = (Number(temperature) * 9) / 5 + 32;
  const rh = Number(humidity);
  let hiF = 0.5 * (tF + 61 + (tF - 68) * 1.2 + rh * 0.094);
  if (hiF >= 80) {
    hiF = -42.379 + 2.04901523 * tF + 10.14333127 * rh
      - 0.22475541 * tF * rh - 6.83783e-3 * tF ** 2
      - 5.481717e-2 * rh ** 2 + 1.22874e-3 * tF ** 2 * rh
      + 8.5282e-4 * tF * rh ** 2 - 1.99e-6 * tF ** 2 * rh ** 2;
    if (rh < 13 && tF >= 80 && tF <= 112) {
      hiF -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(tF - 95)) / 17);
    }
    if (rh > 85 && tF >= 80 && tF <= 87) {
      hiF += ((rh - 85) / 10) * ((87 - tF) / 5);
    }
  }
  return Number((((hiF - 32) * 5) / 9).toFixed(1));
}

module.exports = { dewPointC, heatIndexC };
