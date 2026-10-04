from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from model import HazardAnomalyDetector

app = FastAPI(title='HazardGuard ML Service')
detector = HazardAnomalyDetector()
detector.load()

class SensorReading(BaseModel):
    mq2: float
    temperature: float
    humidity: float
    flame: int
    rain: int

class TrainingData(BaseModel):
    readings: list[list[float]]

@app.post('/train')
def train(data: TrainingData):
    try: detector.train(data.readings)
    except (TypeError, ValueError) as error: raise HTTPException(status_code=422, detail=str(error)) from error
    return {'status': 'trained', 'samples': len(data.readings)}

@app.post('/predict')
def predict(reading: SensorReading):
    values = [
        reading.mq2, 
        reading.temperature, 
        reading.humidity, 
        reading.flame, 
        reading.rain
    ]
    try: result = detector.observe_and_predict(values)
    except RuntimeError as error: raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error: raise HTTPException(status_code=422, detail=str(error)) from error
    
    # Safely convert NumPy types to native Python types for FastAPI serialization
    if isinstance(result, dict):
        return {k: (v.item() if hasattr(v, 'item') else v) for k, v in result.items()}
    elif hasattr(result, 'item'):
        return result.item()
    elif hasattr(result, 'tolist'):
        return result.tolist()
        
    return result

@app.get('/health')
def health():
    return {'status': 'ok', 'model_trained': detector.is_trained}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)