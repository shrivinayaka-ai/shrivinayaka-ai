from datetime import timedelta

DASHA_ORDER = [
    ("Ketu", 7),
    ("Venus", 20),
    ("Sun", 6),
    ("Moon", 10),
    ("Mars", 7),
    ("Rahu", 18),
    ("Jupiter", 16),
    ("Saturn", 19),
    ("Mercury", 17)
]

NAKSHATRA_LORDS = [
    "Ketu","Venus","Sun",
    "Moon","Mars","Rahu",
    "Jupiter","Saturn","Mercury"
]

AVG_YEAR = 365.2422
NAKSHATRA_SIZE = 360 / 27


def add_calendar_years(value, years):
    try:
        return value.replace(year=value.year + years)
    except ValueError:
        return value.replace(month=2, day=28, year=value.year + years)


def get_nakshatra_data(moon_lon):

    moon_lon = moon_lon % 360

    nak_index = int(moon_lon / NAKSHATRA_SIZE)

    start = nak_index * NAKSHATRA_SIZE
    progress = (moon_lon - start) / NAKSHATRA_SIZE

    return nak_index, progress


def get_balance(progress):
    return max(0, min(1, 1 - progress))


def generate_dasha(moon_lon, birth_datetime):

    moon_lon = moon_lon % 360

    nak_index, progress = get_nakshatra_data(moon_lon)

    balance = get_balance(progress)

    start_lord = NAKSHATRA_LORDS[nak_index % 9]

    order = [d[0] for d in DASHA_ORDER]
    start_index = order.index(start_lord)

    timeline = []
    current = birth_datetime.replace(hour=0, minute=0, second=0, microsecond=0)

    for i in range(9):

        planet, years = DASHA_ORDER[(start_index + i) % 9]

        if i == 0:
            years = years * balance
            end = current + timedelta(days=years * AVG_YEAR)
        else:
            end = add_calendar_years(current, years)

        timeline.append({
            "planet": planet,
            "start": current.strftime("%Y-%m-%d"),
            "end": end.strftime("%Y-%m-%d"),
            "years": round(years, 3)
        })

        current = end

    return {
        "starting_lord": start_lord,
        "balance": round(balance, 4),
        "timeline": timeline
    }
