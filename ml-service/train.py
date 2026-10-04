import json
import requests
import sys

if __name__ == '__main__':
    if len(sys.argv) != 2: raise SystemExit('Usage: python train.py REAL_READINGS.json')
    with open(sys.argv[1], encoding='utf-8') as file: readings = json.load(file)
    if not isinstance(readings, list): raise SystemExit('REAL_READINGS.json must contain a list of readings')
    response = requests.post('http://localhost:8000/train', json={'readings': readings}, timeout=10)
    response.raise_for_status()
    print(response.json())
