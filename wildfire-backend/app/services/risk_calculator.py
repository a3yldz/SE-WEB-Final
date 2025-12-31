import math
from typing import Dict, Any

class AdvancedFireRiskCalculator:
    def __init__(self):
        self.vegetation_risk_factors = {"pine_forest": 0.9, "mediterranean_forest": 0.8, "mixed_forest": 0.7}
        self.human_activity_factors = {"high": 0.3, "medium": 0.2, "low": 0.1}

    def _calculate_vpd(self, temp_c: float, rh_percent: float) -> float:
        if temp_c is None or rh_percent is None:
            return 0.0
        svp = 6.112 * math.exp((17.67 * temp_c) / (temp_c + 243.5))
        avp = svp * (rh_percent / 100.0)
        return svp - avp

    def calculate_risk(self, features: Dict[str, Any], slope_factor: float, drought_factor: float) -> float:
        temp = features.get("temperature_c", 20.0)
        rh = features.get("relative_humidity", 60.0)
        wind_speed = features.get("wind_speed_ms", 0.0)
        fuel_moisture = features.get("fuel_moisture", 0.5)
        vegetation = features.get("vegetation_type", "mixed_forest")
        human_activity = features.get("human_activity", "low")

        # Sanity Check for Temperature
        # Open-Meteo or any API might sometimes return extreme anomalies
        if temp > 55 or temp < -20:
            print(f"Warning: Abnormal temperature {temp}°C detected. Using fallback 15°C.")
            temp = 15.0

        # Use direct VPD from API if available (in KPa), otherwise calculate
        if "vpd_kpa" in features:
            vpd = features["vpd_kpa"] * 10  # Convert kPa to hPa (mb) if needed for consistency, 
            # BUT wait, the calculation below: (vpd - 15) / 25
            # 15 and 25 look like hPa values (saturation vapor pressure is usually < 100 hPa).
            # Open-Meteo gives kPa. 1 kPa = 10 hPa.
            # Let's check the _calculate_vpd implementation:
            # svp = 6.112 * exp(...) -> this returns hPa (mbar)
            # So we need hPa.
            vpd = features["vpd_kpa"] * 10
        else:
            vpd = self._calculate_vpd(temp, rh)
            
        # Advanced Risk Factors
        wind_gusts = features.get("wind_gusts_ms", 0.0)
        solar_rad = features.get("solar_radiation", 0.0)
        soil_moisture = features.get("soil_moisture", 0.25)
        precip = features.get("precipitation", 0.0)

        # 1. Spread Factor: If gusts are 50% stronger than sustained wind
        spread_boost = 0.0
        if wind_gusts > (wind_speed * 1.5) and wind_speed > 3.0:
            spread_boost = 0.15 # +15% risk

        # 2. Drought Factor: Soil moisture check
        drought_boost = 0.0
        if soil_moisture < 0.2:
            drought_boost = 0.20 # +20% risk

        # 3. Solar Heating Factor: Max 10% boost at peak sun (>800 W/m2)
        solar_boost = min(0.10, solar_rad / 8000.0) # Normalize 0-1000 W/m2 -> 0.0-0.125 roughly

        # Calculate Components
        vpd_risk = min(1.0, max(0.0, (vpd - 15) / 25))
        wind_risk = min(1, wind_speed / 15)
        fuel_risk = 1 - fuel_moisture
        vegetation_risk = self.vegetation_risk_factors.get(vegetation, 0.5)
        human_risk = self.human_activity_factors.get(human_activity, 0.1)

        base_risk = (
            vpd_risk * 0.40 +        # Reduced slightly from 0.50
            fuel_risk * 0.20 +       # Reduced slightly from 0.25
            wind_risk * 0.15 +
            vegetation_risk * 0.05 +
            human_risk * 0.05
        )
        
        # Apply Advanced Factors
        total_risk = (base_risk * slope_factor * drought_factor) + spread_boost + drought_boost + solar_boost

        # 4. Rain Buffer: Significant reduction if raining
        if precip > 0:
            rain_reduction = 0.5 + (min(5.0, precip) / 10.0) # 0.5 to 1.0 reduction factor
            total_risk = total_risk * (1.0 - rain_reduction) # Reduce by 50-100%

        return min(1.0, max(0.0, total_risk))
