from pathlib import Path
import pickle
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

MODEL_PATH = Path(__file__).with_name('model.pkl')
class HazardAnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.05, n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.observations = []
    def train(self, readings):
        values = np.asarray(readings, dtype=float)
        if values.ndim != 2 or values.shape[1] != 5 or len(values) < 30 or not np.isfinite(values).all():
            raise ValueError('Training requires at least 30 finite readings with five sensor fields')
        self.scaler.fit(values); self.model.fit(self.scaler.transform(values)); self.is_trained = True
        with MODEL_PATH.open('wb') as file: pickle.dump({'model': self.model, 'scaler': self.scaler}, file)
    def load(self):
        if MODEL_PATH.exists():
            with MODEL_PATH.open('rb') as file: saved = pickle.load(file)
            self.model, self.scaler, self.is_trained = saved['model'], saved['scaler'], True
    def observe_and_predict(self, reading):
        values = np.asarray(reading, dtype=float)
        if values.shape != (5,) or not np.isfinite(values).all(): raise ValueError('Prediction requires five finite sensor fields')
        if not self.is_trained:
            self.observations.append(values.tolist())
            if len(self.observations) >= 30: self.train(self.observations)
            else: raise RuntimeError('Model is waiting for real sensor observations')
        return self.predict(reading)
    def predict(self, reading):
        if not self.is_trained: raise RuntimeError('Model is not trained')
        values = self.scaler.transform(np.asarray([reading], dtype=float)); prediction = self.model.predict(values)[0]; score = float(self.model.score_samples(values)[0]); anomaly = prediction == -1
        severity = 'HIGH' if score < -0.6 else 'MEDIUM' if score < -0.4 else 'LOW' if anomaly else 'NONE'
        return {'is_anomaly': anomaly, 'anomaly_score': round(score, 4), 'severity': severity, 'message': f'Anomaly detected ({severity} severity) - potential hazard forming' if anomaly else 'Readings within normal range'}
