import openmeteo_requests
import requests_cache
import asyncio
from retry_requests import retry
import math
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class OpenMeteoService:
    """
    Service to fetch weather data from Open-Meteo API using the official SDK.
    """
    def __init__(self):
        cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
        retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
        self.openmeteo = openmeteo_requests.Client(session=retry_session)
        self.url = "https://api.open-meteo.com/v1/forecast"

    async def get_forecast(self, lat: float, lon: float):
        """
        Fetches weather data using the Open-Meteo SDK.
        Wraps the synchronous SDK call in a thread to remain non-blocking.
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", 
                        "wind_gusts_10m", "shortwave_radiation", "precipitation", 
                        "soil_moisture_0_to_1cm", "vapour_pressure_deficit"],
            "hourly": ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "precipitation"],
            "wind_speed_unit": "ms",
            "timezone": "auto"
        }

        try:
            responses = await asyncio.to_thread(
                self.openmeteo.weather_api, self.url, params=params
            )
            response = responses[0]
            
            current = response.Current()
            
            current_data = {
                "temperature_2m": current.Variables(0).Value(),
                "relative_humidity_2m": current.Variables(1).Value(),
                "wind_speed_10m": current.Variables(2).Value(),
                "wind_gusts_10m": current.Variables(3).Value(),
                "shortwave_radiation": current.Variables(4).Value(),
                "precipitation": current.Variables(5).Value(),
                "soil_moisture_0_to_1cm": current.Variables(6).Value(),
                "vapour_pressure_deficit": current.Variables(7).Value(),
            }

            hourly = response.Hourly()
            hourly_data = {
                "time": [datetime.fromtimestamp(hourly.Time() + i * hourly.Interval()).isoformat() 
                         for i in range(hourly.Variables(0).ValuesAsNumpy().size)],
                "temperature_2m": hourly.Variables(0).ValuesAsNumpy().tolist(),
                "relative_humidity_2m": hourly.Variables(1).ValuesAsNumpy().tolist(),
                "precipitation": hourly.Variables(3).ValuesAsNumpy().tolist() 
            }

            return {
                "current": current_data,
                "hourly": hourly_data
            }

        except Exception as e:
            logger.error(f"Failed to fetch weather data with SDK: {e}")
            import traceback
            traceback.print_exc()
            return None

    def find_forecast_for_offset(self, forecast_data, hour_offset):
        """
        Returns the forecast data. 
        For now, we prioritize current real-time data for the risk model as requested.
        """
        return forecast_data

    def extract_weather_features(self, weather_data, lat, lon):
        """
        Extracts features from the result of get_forecast.
        """
        temp = 20.0
        rh = 60.0
        wind_speed = 5.0
        wind_gusts = 0.0
        solar_rad = 0.0
        soil_moisture = 0.25
        precip = 0.0
        vpd_kpa = 0.0
        
        if weather_data and "current" in weather_data:
            cw = weather_data["current"]
            temp = cw.get("temperature_2m", 20.0)
            rh = cw.get("relative_humidity_2m", 60.0)
            wind_speed = cw.get("wind_speed_10m", 5.0)
            wind_gusts = cw.get("wind_gusts_10m", 0.0)
            solar_rad = cw.get("shortwave_radiation", 0.0)
            soil_moisture = cw.get("soil_moisture_0_to_1cm", 0.25)
            precip = cw.get("precipitation", 0.0)
            vpd_kpa = cw.get("vapour_pressure_deficit", 0.0)
        
        veg = self._get_vegetation_type(lat, lon)
        fuel_moisture = self._estimate_fuel_moisture(temp, rh, precip)
        human_activity = self._estimate_human_activity(lat, lon)
        
        return {
            "temperature_c": temp,
            "relative_humidity": rh,
            "wind_speed_ms": wind_speed,
            "wind_gusts_ms": wind_gusts,
            "solar_radiation": solar_rad,
            "soil_moisture": soil_moisture,
            "precipitation": precip,
            "vpd_kpa": vpd_kpa,
            "vegetation_type": veg,
            "fuel_moisture": fuel_moisture,
            "human_activity": human_activity
        }

    def _get_vegetation_type(self, lat, lon):
        if 36.0 <= lat <= 38.0 and 26.0 <= lon <= 30.0:
            return "pine_forest"
        elif 38.0 <= lat <= 40.0 and 26.0 <= lon <= 30.0:
            return "mediterranean_forest"
        else:
            return "mixed_forest"

    def _estimate_fuel_moisture(self, temp, humidity, rain):
        temp = temp or 20.0
        humidity = humidity or 60.0
        rain = rain or 0.0
        if rain == 0.0:
            return min(0.4, 0.1 + (max(0, (35-temp)/35)*0.2) + ((humidity/100)*0.3))
        else:
            return min(1.0, 0.5 + (min(1.0, rain/10)*0.4) + ((humidity/100)*0.1))

    def _estimate_human_activity(self, lat, lon):
        if math.sqrt((lat - 41.0082)**2 + (lon - 28.9784)**2) < 0.5:
            return "high"
        return "low"
