from datetime import datetime

class DroughtService:
    def calculate_consecutive_dry_days(self, forecast_data: dict) -> int:
        if not forecast_data or "hourly" not in forecast_data:
            return 0
            
        hourly = forecast_data["hourly"]
        times = hourly.get("time", [])
        precip = hourly.get("precipitation", [])
        
        if not times or len(times) != len(precip):
            return 0
            
        now = datetime.now()
        
        # Combine time and precip, filter for past only, sort by time specific descending (most recent first)
        past_weather = []
        for i, t_str in enumerate(times):
            try:
                t = datetime.fromisoformat(t_str)
                if t <= now:
                    past_weather.append((t, precip[i]))
            except ValueError:
                continue
                
        # Sort descending by time
        past_weather.sort(key=lambda x: x[0], reverse=True)
        
        dry_hours = 0
        for _, p_mm in past_weather:
            if p_mm == 0:
                dry_hours += 1
            else:
                break
                
        # Convert hours to days
        return dry_hours // 24
    def get_drought_factor(self, dry_days: int) -> float:
        if dry_days <= 2:
            return 1.0
        return min(1.4, 1.0 + ((dry_days - 2) / 5) * 0.4)
