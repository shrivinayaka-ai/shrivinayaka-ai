import swisseph as swe
from datetime import datetime, timedelta

from astrology_engine.location import get_coordinates
from astrology_engine.dasha import generate_dasha
from astrology_engine.transits import generate_transits

# IMPORTANT: set ayanamsa once
swe.set_sid_mode(swe.SIDM_LAHIRI)


SIGNS = [
    "Aries","Taurus","Gemini","Cancer",
    "Leo","Virgo","Libra","Scorpio",
    "Sagittarius","Capricorn","Aquarius","Pisces"
]

LIFE_AREAS = {
    1: {"title": "Self & Body", "meaning": "personality, body, confidence"},
    2: {"title": "Wealth & Speech", "meaning": "income, savings, speech"},
    3: {"title": "Courage & Siblings", "meaning": "effort, communication, siblings"},
    4: {"title": "Home & Happiness", "meaning": "home, mother, peace"},
    5: {"title": "Intelligence & Children", "meaning": "education, creativity, children"},
    6: {"title": "Health & Challenges", "meaning": "disease, debt, competition"},
    7: {"title": "Marriage & Partnerships", "meaning": "marriage, spouse, partnerships"},
    8: {"title": "Longevity & Hidden Matters", "meaning": "sudden events, secrets, transformation"},
    9: {"title": "Fortune & Dharma", "meaning": "luck, father, higher wisdom"},
    10: {"title": "Career & Fame", "meaning": "career, karma, public image"},
    11: {"title": "Gains & Income", "meaning": "profits, network, desires"},
    12: {"title": "Losses & Spirituality", "meaning": "expenses, sleep, foreign, moksha"},
}

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


def get_sign_index_from_name(sign_name):
    return SIGNS.index(sign_name)


def get_navamsa_sign_index(longitude):
    sign_index = int(longitude / 30)
    degree_in_sign = longitude % 30

    # Each Navamsha is 3 degrees 20 minutes.
    navamsa_part = int(degree_in_sign / (30 / 9))

    movable = [0, 3, 6, 9]
    fixed = [1, 4, 7, 10]

    if sign_index in movable:
        start = sign_index
    elif sign_index in fixed:
        start = (sign_index + 8) % 12
    else:
        start = (sign_index + 4) % 12

    return (start + navamsa_part) % 12


def degree_in_sign_dms(deg):
    sign_degree = deg % 30

    d = int(sign_degree)
    minutes_float = (sign_degree - d) * 60
    m = int(minutes_float)
    seconds_float = (minutes_float - m) * 60
    s = int(round(seconds_float))

    if s == 60:
        s = 0
        m += 1

    if m == 60:
        m = 0
        d += 1

    return f"{d:02d}:{m:02d}:{s:02d}"


def get_nakshatra(deg):
    index = int(deg / (360 / 27))
    pada = int(((deg % (360 / 27)) / (360 / 27)) * 4) + 1

    return {
        "nakshatra": NAKSHATRAS[index],
        "pada": pada
    }


def get_life_area_strengths(chart):
    scores = {}

    for house in range(1, 13):
        scores[house] = 50

    planet_effects = {
        "Jupiter": 14,
        "Venus": 12,
        "Mercury": 8,
        "Moon": 7,
        "Sun": -4,
        "Mars": -6,
        "Saturn": -8,
        "Rahu": -10,
        "Ketu": -8,
    }

    for planet, data in chart.items():
        if planet == "Ascendant":
            continue

        house = data.get("house")
        if not house:
            continue

        scores[house] += planet_effects.get(planet, 0)

    for planet, data in chart.items():
        if data.get("house") == 10 and planet in ["Saturn", "Mars", "Sun"]:
            scores[10] += 10

    for planet, data in chart.items():
        if data.get("house") == 6 and planet in ["Mars", "Saturn", "Rahu", "Ketu"]:
            scores[6] += 8

    for planet, data in chart.items():
        if data.get("house") == 11 and planet in ["Rahu", "Saturn"]:
            scores[11] += 8

    final = []

    for house in range(1, 13):
        score = max(20, min(90, scores[house]))

        if score >= 70:
            level = "Strong"
        elif score >= 50:
            level = "Moderate"
        else:
            level = "Needs Attention"

        final.append({
            "house": house,
            "title": LIFE_AREAS[house]["title"],
            "meaning": LIFE_AREAS[house]["meaning"],
            "score": score,
            "level": level,
        })

    top_strong = sorted(final, key=lambda x: x["score"], reverse=True)[:3]
    top_attention = sorted(final, key=lambda x: x["score"])[:3]

    return {
        "areas": final,
        "top_strong": top_strong,
        "top_attention": top_attention,
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
        "Rahu": swe.TRUE_NODE
    }

    chart = {
        "Ascendant": {
            "degree": degree_in_sign_dms(asc_deg),
            "full_degree": round(asc_deg, 2),
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
            "degree": degree_in_sign_dms(planet_lon),
            "full_degree": round(planet_lon, 2),
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
                "degree": degree_in_sign_dms(ketu_lon),
                "full_degree": round(ketu_lon, 2),
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
    transits = generate_transits(chart)

    d1_chart = {}
    d9_chart = {}
    navamsa_asc_index = get_navamsa_sign_index(chart["Ascendant"]["raw_degree"])

    for planet_name, planet_data in chart.items():
        sign_index = get_sign_index_from_name(planet_data["sign"])
        d1_chart[planet_name] = {
            "sign": planet_data["sign"],
            "sign_index": sign_index,
            "house": planet_data["house"]
        }

        navamsa_sign_index = get_navamsa_sign_index(planet_data["raw_degree"])
        navamsa_house = ((navamsa_sign_index - navamsa_asc_index) % 12) + 1
        d9_chart[planet_name] = {
            "sign": SIGNS[navamsa_sign_index],
            "sign_index": navamsa_sign_index,
            "house": navamsa_house
        }

    life_area_scores = get_life_area_strengths(chart)

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
        "charts": {
            "d1": d1_chart,
            "d9": d9_chart
        },
        "life_area_scores": life_area_scores,
        "dasha": dasha,
        "transits": transits
    }
