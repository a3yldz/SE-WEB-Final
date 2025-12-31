import math
import numpy as np
from shapely.geometry import shape, Point
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
import httpx
import os


ELEVATION_API_URL = "https://api.open-elevation.com/api/v1/lookup"
ROBOFLOW_API_URL = "https://detect.roboflow.com"
ROBOFLOW_API_KEY = "XoNbKefV5xjEal7LJ744"
ROBOFLOW_MODEL_ID = "smoke-detection-5tkur/3"

