"""
Climate API and diurnal solar/weather dataset provider for ThermaBuild.
Compliant with ECBC 2017 climate zones and ASHRAE diurnal models.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class ClimateProfile:
    zone: str
    city: str
    latitude: float
    longitude: float
    elevation_m: float
    design_temp_summer_c: float
    design_temp_winter_c: float
    diurnal_range_c: float
    design_rh_pct: float
    prevailing_wind_dir: str
    prevailing_wind_speed_ms: float
    cdd_base18: float
    hdd_base18: float
    solar_irradiance_peak_wm2: float


CLIMATE_DATABASE: Dict[str, ClimateProfile] = {
    "composite": ClimateProfile(
        zone="Composite",
        city="New Delhi",
        latitude=28.6139,
        longitude=77.2090,
        elevation_m=216.0,
        design_temp_summer_c=43.5,
        design_temp_winter_c=6.0,
        diurnal_range_c=14.2,
        design_rh_pct=45.0,
        prevailing_wind_dir="NW",
        prevailing_wind_speed_ms=2.8,
        cdd_base18=2680.0,
        hdd_base18=210.0,
        solar_irradiance_peak_wm2=920.0,
    ),
    "hot_dry": ClimateProfile(
        zone="Hot-Dry",
        city="Jaipur",
        latitude=26.9124,
        longitude=75.7873,
        elevation_m=431.0,
        design_temp_summer_c=45.0,
        design_temp_winter_c=8.0,
        diurnal_range_c=16.5,
        design_rh_pct=25.0,
        prevailing_wind_dir="SW",
        prevailing_wind_speed_ms=3.2,
        cdd_base18=3100.0,
        hdd_base18=120.0,
        solar_irradiance_peak_wm2=980.0,
    ),
    "warm_humid": ClimateProfile(
        zone="Warm-Humid",
        city="Chennai",
        latitude=13.0827,
        longitude=80.2707,
        elevation_m=6.7,
        design_temp_summer_c=38.5,
        design_temp_winter_c=20.0,
        diurnal_range_c=7.5,
        design_rh_pct=78.0,
        prevailing_wind_dir="SE",
        prevailing_wind_speed_ms=3.6,
        cdd_base18=3450.0,
        hdd_base18=0.0,
        solar_irradiance_peak_wm2=880.0,
    ),
    "temperate": ClimateProfile(
        zone="Temperate",
        city="Bengaluru",
        latitude=12.9716,
        longitude=77.5946,
        elevation_m=920.0,
        design_temp_summer_c=34.0,
        design_temp_winter_c=15.0,
        diurnal_range_c=11.0,
        design_rh_pct=60.0,
        prevailing_wind_dir="W",
        prevailing_wind_speed_ms=2.5,
        cdd_base18=1850.0,
        hdd_base18=50.0,
        solar_irradiance_peak_wm2=890.0,
    ),
    "cold": ClimateProfile(
        zone="Cold",
        city="Shimla",
        latitude=31.1048,
        longitude=77.1734,
        elevation_m=2276.0,
        design_temp_summer_c=25.0,
        design_temp_winter_c=-2.0,
        diurnal_range_c=9.0,
        design_rh_pct=65.0,
        prevailing_wind_dir="NE",
        prevailing_wind_speed_ms=2.1,
        cdd_base18=350.0,
        hdd_base18=2200.0,
        solar_irradiance_peak_wm2=820.0,
    ),
    "ladakh": ClimateProfile(
        zone="Cold Arid (Ladakh Trans-Himalaya)",
        city="Leh, Ladakh",
        latitude=34.1526,
        longitude=77.5771,
        elevation_m=3500.0,
        design_temp_summer_c=24.5,
        design_temp_winter_c=-18.0,
        diurnal_range_c=17.5,
        design_rh_pct=22.0,
        prevailing_wind_dir="WNW",
        prevailing_wind_speed_ms=4.2,
        cdd_base18=80.0,
        hdd_base18=3950.0,
        solar_irradiance_peak_wm2=1040.0,
    ),
}

CITY_TO_ZONE = {
    "delhi": "composite",
    "new delhi": "composite",
    "lucknow": "composite",
    "patna": "composite",
    "jaipur": "hot_dry",
    "jodhpur": "hot_dry",
    "ahmedabad": "hot_dry",
    "chennai": "warm_humid",
    "mumbai": "warm_humid",
    "kolkata": "warm_humid",
    "kochi": "warm_humid",
    "bengaluru": "temperate",
    "bangalore": "temperate",
    "pune": "temperate",
    "shimla": "cold",
    "srinagar": "cold",
    "leh": "ladakh",
    "ladakh": "ladakh",
    "kargil": "ladakh",
    "nubra": "ladakh",
    "dras": "ladakh",
    "diskit": "ladakh",
    "pangong": "ladakh",
    "spiti": "ladakh",
}


def get_climate_profile(zone_or_city: str) -> ClimateProfile:
    key = zone_or_city.lower().strip().replace("-", "_").replace(" ", "_")
    if key in CLIMATE_DATABASE:
        return CLIMATE_DATABASE[key]
    if key in CITY_TO_ZONE:
        return CLIMATE_DATABASE[CITY_TO_ZONE[key]]
    return CLIMATE_DATABASE["composite"]


def generate_diurnal_weather(zone_or_city: str, day_of_year: int = 140) -> Dict[str, Any]:
    """
    Generates realistic 24-hour diurnal weather dataset based on ASHRAE thermal sinusoidal model.
    Day 140 represents mid-May (peak summer in northern hemisphere).
    """
    profile = get_climate_profile(zone_or_city)
    lat_rad = math.radians(profile.latitude)
    
    # Solar declination delta in radians
    declination = math.radians(23.45 * math.sin(math.radians(360 / 365 * (284 + day_of_year))))
    
    hourly_data: List[Dict[str, float]] = []
    
    for h in range(24):
        # Solar hour angle omega (0 at 12:00 PM, -15 deg per hour before noon)
        hour_angle = math.radians((h - 12) * 15.0)
        
        # Solar elevation angle (altitude) alpha
        sin_alpha = (math.sin(lat_rad) * math.sin(declination) +
                     math.cos(lat_rad) * math.cos(declination) * math.cos(hour_angle))
        alpha_rad = math.asin(max(-1.0, min(1.0, sin_alpha)))
        elevation_deg = math.degrees(alpha_rad)
        
        # Solar azimuth psi
        if elevation_deg > 0:
            cos_psi = (math.sin(declination) - math.sin(lat_rad) * math.sin(alpha_rad)) / (
                math.cos(lat_rad) * math.cos(alpha_rad) + 1e-6
            )
            azimuth_deg = math.degrees(math.acos(max(-1.0, min(1.0, cos_psi))))
            if hour_angle > 0:
                azimuth_deg = 360.0 - azimuth_deg
        else:
            azimuth_deg = 0.0
            
        # Solar Irradiance (GHI, DNI, DHI)
        if elevation_deg > 0:
            air_mass = 1.0 / (math.sin(alpha_rad) + 0.50572 * math.pow(max(0.1, elevation_deg + 6.07995), -1.6364))
            dni = profile.solar_irradiance_peak_wm2 * math.pow(0.7, math.pow(air_mass, 0.678))
            dhi = 0.18 * dni * math.sin(alpha_rad)
            ghi = dni * math.sin(alpha_rad) + dhi
        else:
            dni = 0.0
            dhi = 0.0
            ghi = 0.0
            
        # ASHRAE Diurnal dry-bulb temperature curve (peak around 15:00, min around 05:00)
        # Fraction f varies between 0.0 and 1.0
        time_lagged = (h - 15) % 24
        temp_fraction = 0.5 * (1.0 + math.cos(math.radians(time_lagged * 15.0)))
        t_db = profile.design_temp_summer_c - (profile.diurnal_range_c * (1.0 - temp_fraction))
        
        # Diurnal relative humidity (inversely proportional to temperature)
        rh = profile.design_rh_pct + (1.0 - temp_fraction) * 20.0
        rh = max(15.0, min(95.0, rh))
        
        # Wind variations
        wind_speed = profile.prevailing_wind_speed_ms * (0.8 + 0.4 * temp_fraction)
        
        hourly_data.append({
            "hour": h,
            "dry_bulb_temp_c": round(t_db, 2),
            "solar_elevation_deg": round(max(0.0, elevation_deg), 1),
            "solar_azimuth_deg": round(azimuth_deg, 1),
            "dni_wm2": round(dni, 1),
            "dhi_wm2": round(dhi, 1),
            "ghi_wm2": round(ghi, 1),
            "relative_humidity_pct": round(rh, 1),
            "wind_speed_ms": round(wind_speed, 2),
            "wind_direction": profile.prevailing_wind_dir,
        })
        
    return {
        "climate_profile": {
            "zone": profile.zone,
            "city": profile.city,
            "latitude": profile.latitude,
            "longitude": profile.longitude,
            "design_temp_summer_c": profile.design_temp_summer_c,
            "diurnal_range_c": profile.diurnal_range_c,
            "cdd": profile.cdd_base18,
            "hdd": profile.hdd_base18,
            "prevailing_wind": f"{profile.prevailing_wind_dir} @ {profile.prevailing_wind_speed_ms} m/s",
        },
        "hourly_weather": hourly_data,
    }


if __name__ == "__main__":
    import json
    res = generate_diurnal_weather("composite")
    print(f"Climate: {res['climate_profile']['city']} ({res['climate_profile']['zone']})")
    print(f"Peak Hour 15 Temp: {res['hourly_weather'][15]['dry_bulb_temp_c']} °C")
    print(f"Noon GHI: {res['hourly_weather'][12]['ghi_wm2']} W/m2")
