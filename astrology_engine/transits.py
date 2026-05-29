import swisseph as swe
from datetime import datetime, timedelta

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

TRANSIT_PLANETS = {
    "Saturn": swe.SATURN,
    "Jupiter": swe.JUPITER,
    "Rahu": swe.MEAN_NODE
}


def degree_to_sign(deg):
    return SIGNS[int(deg / 30) % 12]


def get_house_from(base_sign, transit_sign):
    return ((transit_sign - base_sign) % 12) + 1


def generate_transits(natal_chart):
    swe.set_sid_mode(swe.SIDM_LAHIRI)

    now_utc = datetime.utcnow()

    jd = swe.julday(
        now_utc.year,
        now_utc.month,
        now_utc.day,
        now_utc.hour + now_utc.minute / 60.0
    )

    asc_sign = int(natal_chart["Ascendant"]["raw_degree"] / 30)
    moon_sign = int(natal_chart["Moon"]["raw_degree"] / 30)

    transits = {}

    for name, pid in TRANSIT_PLANETS.items():

        pos = swe.calc_ut(
            jd,
            pid,
            swe.FLG_SWIEPH | swe.FLG_SIDEREAL
        )

        planet_lon = pos[0][0]
        sign_index = int(planet_lon / 30)

        transits[name] = {
            "degree": round(planet_lon, 2),
            "raw_degree": planet_lon,
            "sign": degree_to_sign(planet_lon),
            "house_from_ascendant": get_house_from(asc_sign, sign_index),
            "house_from_moon": get_house_from(moon_sign, sign_index)
        }

        if name == "Rahu":
            ketu_lon = (planet_lon + 180) % 360
            ketu_sign_index = int(ketu_lon / 30)

            transits["Ketu"] = {
                "degree": round(ketu_lon, 2),
                "raw_degree": ketu_lon,
                "sign": degree_to_sign(ketu_lon),
                "house_from_ascendant": get_house_from(asc_sign, ketu_sign_index),
                "house_from_moon": get_house_from(moon_sign, ketu_sign_index)
            }

    return {
        "date": now_utc.strftime("%Y-%m-%d"),
        "ayanamsa": "Lahiri",
        "transits": transits
    }
