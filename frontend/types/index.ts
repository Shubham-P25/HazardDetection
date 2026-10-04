export type RiskLevel = 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL' | 'NONE';

export type SensorField = 'gas' | 'smoke' | 'temperature' | 'humidity' | 'flame' | 'drainage' | 'heatIndex' | 'dewPoint';

export interface SensorReading {
  ts: string;
  timestamp?: string;
  serverTs?: number;
  deviceId?: string;
  zone?: string | null;
  mq2: number;
  gas: number;
  smoke: number;
  temperature: number;
  humidity: number;
  flame: number;
  rain?: number;
  drainage: number;
  heatIndex: number;
  dewPoint: number;
  risk: number;
  riskScore: number;
  riskLevel: RiskLevel;
  statuses?: Record<string, RiskLevel>;
  roomStatuses?: Record<string, RiskLevel>;
  simulated?: boolean;
  anomaly?: { is_anomaly: boolean; severity: string; message: string; anomaly_score: number };
}

export interface IncidentAlert {
  id: string;
  channel: string;
  recipient: string;
  status: string;
  error?: string | null;
  sentAt: string;
}

export interface Incident {
  id: string;
  sensorField: string;
  zone: string;
  severity: 'WARNING' | 'DANGER' | 'CRITICAL';
  peakValue: number;
  unit: string;
  thresholdCrossed: string;
  startedAt: string;
  resolvedAt?: string | null;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedByClerkId?: string | null;
  note?: string | null;
  alerts?: IncidentAlert[];
  type?: string;
  sensor?: string;
  value?: number;
  message?: string;
  createdAt?: string;
  acknowledged?: boolean;
}

export interface ComplianceRecord {
  id: string;
  date: string;
  zone: string;
  safeMinutes: number;
  unsafeMinutes: number;
  compliancePct?: number;
  safePercentage: number;
}

export type ConnectionState = 'connecting' | 'live' | 'disconnected' | 'device-offline';
