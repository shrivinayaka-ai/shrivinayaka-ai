import swisseph as swe
from datetime import datetime, timedelta

from astrology_engine.location import get_coordinates
from astrology_engine.dasha import generate_dasha

# IMPORTANT: set ayanamsa once
swe.set_sid_mode(swe.SIDM_LAHIRI)


SIGNS = [
    "Aries","Taurus","Gemini","Cancer",
    "Leo","Virgo","Libra","Scorpio",
    "Sagittarius","Capricorn","Aquarius","Pisces"
]

NAKSHATRAS = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira",
    "Ardra","Punarvasu","Pushya","Ashlesha",
    "Magha","Purva Phalguni","Uttara Phalguni",
    "Hasta","Chitra","Swati","Vishakha",
    "Anuradha","Jyeshtha",
    "Mula","Purva Ashadha","Uttara Ashadha",
    "Shravana","Dhanishta","Shatabhisha",
    "Purva Bhadrapada","Uttara Bhadrapada","Revati"
]


def degree_to_sign(deg):
    return SIGNS[int(deg / 30) % 12]


def get_nakshatra(deg):
    index = int(deg / (360 / 27))
    pada = int(((deg % (360 / 27)) / (360 / 27)) * 4) + 1

    return {
        "nakshatra": NAKSHATRAS[index],
        "pada": pada
    }


def set_lahiri_mode():
    swe.set_sid_mode(swe.SIDM_LAHIRI)


def generate_chart(birth_date, birth_time, birth_place):

    set_lahiri_mode()

    # ---------------- LOCATION ----------------
    loc = get_coordinates(birth_place)

    if "error" in loc:
        return loc

    loc_lat = loc["latitude"]
    loc_lon = loc["longitude"]

    # ---------------- TIME ----------------
    dt = datetime.strptime(
        f"{birth_date} {birth_time}",
        "%Y-%m-%d %H:%M"
    )

    utc_dt = dt - timedelta(hours=5, minutes=30)

    dasha_dt = dt.replace(second=0, microsecond=0)
    rounded_minutes = round(dasha_dt.minute / 5) * 5
    dasha_dt = dasha_dt.replace(minute=0) + timedelta(minutes=rounded_minutes)
    dasha_utc_dt = dasha_dt - timedelta(hours=5, minutes=30)

    jd = swe.julday(
        utc_dt.year,
        utc_dt.month,
        utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60.0
    )

    dasha_jd = swe.julday(
        dasha_utc_dt.year,
        dasha_utc_dt.month,
        dasha_utc_dt.day,
        dasha_utc_dt.hour + dasha_utc_dt.minute / 60.0
    )

    set_lahiri_mode()
    houses, ascmc = swe.houses_ex(
        jd,
        loc_lat,
        loc_lon,
        b'P',
        swe.FLG_SIDEREAL
    )

    asc_deg = ascmc[0]
    asc_sign = int(asc_deg / 30)

    # ---------------- PLANETS ----------------
    planets = {
        "Sun": swe.SUN,
        "Moon": swe.MOON,
        "Mars": swe.MARS,
        "Mercury": swe.MERCURY,
        "Jupiter": swe.JUPITER,
        "Venus": swe.VENUS,
        "Saturn": swe.SATURN,
        "Rahu": swe.MEAN_NODE
    }

    chart = {
        "Ascendant": {
            "degree": round(asc_deg, 2),
            "raw_degree": asc_deg,
            "sign": degree_to_sign(asc_deg),
            "house": 1
        }
    }

    # ---------------- PLANET LOOP ----------------
    for name, pid in planets.items():

        set_lahiri_mode()
        pos = swe.calc_ut(
            jd,
            pid,
            swe.FLG_SWIEPH | swe.FLG_SIDEREAL
        )

        planet_lon = pos[0][0]

        sign = int(planet_lon / 30)
        house = ((sign - asc_sign) % 12) + 1

        chart[name] = {
            "degree": round(planet_lon, 2),
            "raw_degree": planet_lon,
            "sign": SIGNS[sign],
            "house": house
        }

        # ---------------- MOON SPECIAL ----------------
        if name == "Moon":
            moon_data = get_nakshatra(planet_lon)
            chart[name]["nakshatra"] = moon_data["nakshatra"]
            chart[name]["pada"] = moon_data["pada"]

        # ---------------- RAHU / KETU ----------------
        if name == "Rahu":
            ketu_lon = (planet_lon + 180) % 360
            ketu_sign = int(ketu_lon / 30)
            ketu_house = ((ketu_sign - asc_sign) % 12) + 1

            chart["Ketu"] = {
                "degree": round(ketu_lon, 2),
                "raw_degree": ketu_lon,
                "sign": SIGNS[ketu_sign],
                "house": ketu_house
            }

    # ---------------- DASHA ----------------
    set_lahiri_mode()
    dasha_moon_raw = swe.calc_ut(
        dasha_jd,
        swe.MOON,
        swe.FLG_SWIEPH | swe.FLG_SIDEREAL
    )[0][0]
    ayanamsa_degree = swe.get_ayanamsa_ut(dasha_jd)

    dasha = generate_dasha(dasha_moon_raw, dt)

    # ---------------- FINAL OUTPUT ----------------
    return {
        "birth_date": birth_date,
        "birth_time": birth_time,
        "birth_place": birth_place,
        "latitude": loc_lat,
        "longitude": loc_lon,
        "calculation": {
            "timezone": "Asia/Kolkata",
            "utc_datetime": utc_dt.strftime("%Y-%m-%d %H:%M"),
            "dasha_birth_time_used": dasha_dt.strftime("%H:%M"),
            "dasha_utc_datetime": dasha_utc_dt.strftime("%Y-%m-%d %H:%M"),
            "dasha_moon_degree": dasha_moon_raw,
            "ayanamsa": "Lahiri",
            "ayanamsa_degree": ayanamsa_degree
        },
        "chart": chart,
        "dasha": dasha
    }
