export const thresholds = {
  hysteresisMargin: 0.08,
  consecutiveToRaise: 2,
  drainageWetCriticalMs: 5 * 60 * 1000,
  autoResolveMs: 60_000,
  deviceOfflineMs: 10_000,
  fields: {
    gas: { warning: 300, danger: 1000, critical: 2000, unit: 'ppm', label: 'Gas', source: 'MQ-2' },
    smoke: { warning: 100, danger: 300, critical: 600, unit: 'ppm', label: 'Smoke', source: 'MQ-2' },
    temperature: { warning: 35, danger: 42, critical: 48, unit: '°C', label: 'Temperature', source: 'DHT11' },
    humidity: { warningHigh: 75, warningLow: 25, dangerHigh: 85, dangerLow: 20, unit: '%', label: 'Humidity', source: 'DHT11' },
    flame: { critical: 1, unit: '', label: 'Flame', source: 'IR flame module' },
    drainage: { danger: 1, unit: '', label: 'Drainage / leak', source: 'Rain module' },
    heatIndex: { warning: 38, danger: 45, critical: 52, unit: '°C', label: 'Heat index', source: 'Calculated' },
    dewPoint: { warning: 22, danger: 26, unit: '°C', label: 'Dew point', source: 'Calculated' },
  },
} as const;

export const sensorCards = [
  { field: 'gas', name: 'Gas', source: 'MQ-2', unit: 'ppm', tooltip: 'Gas and Smoke both come from one MQ-2 sensor. Values are approximate and need clean-air R0 calibration.' },
  { field: 'smoke', name: 'Smoke', source: 'MQ-2', unit: 'ppm', tooltip: 'Gas and Smoke both come from one MQ-2 sensor. Values are approximate and need clean-air R0 calibration.' },
  { field: 'temperature', name: 'Temperature', source: 'DHT11', unit: '°C' },
  { field: 'humidity', name: 'Humidity', source: 'DHT11', unit: '%' },
  { field: 'flame', name: 'Flame', source: 'IR flame module', unit: '' },
  { field: 'drainage', name: 'Drainage / leak', source: 'Rain module', unit: '' },
  { field: 'heatIndex', name: 'Heat index', source: 'Calculated', unit: '°C', calculated: true },
  { field: 'dewPoint', name: 'Dew point', source: 'Calculated', unit: '°C', calculated: true },
] as const;
