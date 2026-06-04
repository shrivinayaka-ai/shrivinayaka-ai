import os
import razorpay
import requests
import traceback
import uuid
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from astrology_engine.chart import generate_chart
from ai_engine.prediction import generate_full_prediction
from ai_engine.prediction import get_current_dasha as get_current_mahadasha
from backend.database import init_db, save_report, get_all_reports, get_report_by_id
from backend.payment import create_order, razorpay_client


app = FastAPI()

init_db()

verified_payment_tokens = set()
pending_payment_orders = {}

COMMON_INDIAN_PLACES = [
    {
        "name": "Delhi",
        "display_name": "Delhi, National Capital Territory of Delhi, India",
        "lat": 28.6139,
        "lon": 77.2090,
        "country": "India",
        "type": "city",
    },
    {
        "name": "New Delhi",
        "display_name": "New Delhi, Delhi, India",
        "lat": 28.6139,
        "lon": 77.2090,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Mumbai",
        "display_name": "Mumbai, Maharashtra, India",
        "lat": 19.0760,
        "lon": 72.8777,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Kolkata",
        "display_name": "Kolkata, West Bengal, India",
        "lat": 22.5726,
        "lon": 88.3639,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Chennai",
        "display_name": "Chennai, Tamil Nadu, India",
        "lat": 13.0827,
        "lon": 80.2707,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Bengaluru",
        "display_name": "Bengaluru, Karnataka, India",
        "lat": 12.9716,
        "lon": 77.5946,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Bangalore",
        "display_name": "Bangalore, Karnataka, India",
        "lat": 12.9716,
        "lon": 77.5946,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Hyderabad",
        "display_name": "Hyderabad, Telangana, India",
        "lat": 17.3850,
        "lon": 78.4867,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Pune",
        "display_name": "Pune, Maharashtra, India",
        "lat": 18.5204,
        "lon": 73.8567,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Ahmedabad",
        "display_name": "Ahmedabad, Gujarat, India",
        "lat": 23.0225,
        "lon": 72.5714,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Jaipur",
        "display_name": "Jaipur, Rajasthan, India",
        "lat": 26.9124,
        "lon": 75.7873,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Lucknow",
        "display_name": "Lucknow, Uttar Pradesh, India",
        "lat": 26.8467,
        "lon": 80.9462,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Varanasi",
        "display_name": "Varanasi, Uttar Pradesh, India",
        "lat": 25.3176,
        "lon": 82.9739,
        "country": "India",
        "type": "city",
    },
    {
        "name": "Chandigarh",
        "display_name": "Chandigarh, India",
        "lat": 30.7333,
        "lon": 76.7794,
        "country": "India",
        "type": "city",
    },
]


def nominatim_search(q, countrycodes=None):
    params = {
        "q": q,
        "format": "json",
        "addressdetails": 1,
        "limit": 10,
        "accept-language": "en",
    }

    if countrycodes:
        params["countrycodes"] = countrycodes

    response = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params=params,
        headers={"User-Agent": "ShrivinayakaAstrology/1.0"},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def dedupe_places(places):
    seen = set()
    results = []

    for place in places:
        key = (
            place.get("place_id")
            or place.get("display_name")
            or f"{place.get('name')}:{place.get('lat')}:{place.get('lon')}"
        )

        if key in seen:
            continue

        seen.add(key)
        results.append(place)

    return results


NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
    "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha",
    "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
    "Uttara Bhadrapada", "Revati"
]

NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu",
    "Jupiter", "Saturn", "Mercury"
]

DASHA_YEARS = {
    "Ketu": 7,
    "Venus": 20,
    "Sun": 6,
    "Moon": 10,
    "Mars": 7,
    "Rahu": 18,
    "Jupiter": 16,
    "Saturn": 19,
    "Mercury": 17,
}

DASHA_SEQUENCE = [
    "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury"
]


def get_nakshatra_details(moon_longitude):
    moon_longitude = moon_longitude % 360
    nakshatra_size = 360 / 27
    pada_size = nakshatra_size / 4

    nak_index = int(moon_longitude // nakshatra_size)
    nak_name = NAKSHATRAS[nak_index]

    pada = int((moon_longitude % nakshatra_size) // pada_size) + 1

    lord_index = nak_index % 9
    nak_lord = NAKSHATRA_LORDS[lord_index]

    degrees_in_nakshatra = moon_longitude % nakshatra_size

    return {
        "moon_longitude": round(moon_longitude, 4),
        "nakshatra": nak_name,
        "pada": pada,
        "nakshatra_lord": nak_lord,
        "degree_in_nakshatra": round(degrees_in_nakshatra, 4),
        "degrees_in_nakshatra": round(degrees_in_nakshatra, 4),
    }


def years_to_days(years):
    return years * 365.25


def calculate_vimshottari_dasha(birth_date, moon_longitude):
    nak = get_nakshatra_details(moon_longitude)

    birth_dt = datetime.strptime(birth_date, "%Y-%m-%d")

    birth_nak_lord = nak["nakshatra_lord"]
    degrees_in_nak = nak["degrees_in_nakshatra"]

    nakshatra_size = 360 / 27
    remaining_fraction = (nakshatra_size - degrees_in_nak) / nakshatra_size

    starting_dasha_years = DASHA_YEARS[birth_nak_lord] * remaining_fraction

    start_index = DASHA_SEQUENCE.index(birth_nak_lord)

    dashas = []
    current_start = birth_dt
    first = True

    for i in range(9):
        planet = DASHA_SEQUENCE[(start_index + i) % 9]

        if first:
            duration_years = starting_dasha_years
            first = False
        else:
            duration_years = DASHA_YEARS[planet]

        current_end = current_start + timedelta(days=years_to_days(duration_years))

        antardashas = calculate_antardashas(
            mahadasha_planet=planet,
            md_start=current_start,
            md_years=duration_years
        )

        dashas.append({
            "mahadasha": planet,
            "start": current_start.strftime("%Y-%m-%d"),
            "end": current_end.strftime("%Y-%m-%d"),
            "antardashas": antardashas
        })

        current_start = current_end

    return dashas


def calculate_antardashas(mahadasha_planet, md_start, md_years):
    antardashas = []

    start_index = DASHA_SEQUENCE.index(mahadasha_planet)
    current_start = md_start

    for i in range(9):
        antardasha_planet = DASHA_SEQUENCE[(start_index + i) % 9]

        ad_years = (md_years * DASHA_YEARS[antardasha_planet]) / 120
        current_end = current_start + timedelta(days=years_to_days(ad_years))

        antardashas.append({
            "antardasha": antardasha_planet,
            "start": current_start.strftime("%Y-%m-%d"),
            "end": current_end.strftime("%Y-%m-%d"),
        })

        current_start = current_end

    return antardashas


def get_current_and_next_antardasha(dashas):
    today = datetime.today()

    for dasha in dashas:
        md_start = datetime.strptime(dasha["start"], "%Y-%m-%d")
        md_end = datetime.strptime(dasha["end"], "%Y-%m-%d")

        if md_start <= today <= md_end:
            antardashas = dasha["antardashas"]

            for index, ad in enumerate(antardashas):
                ad_start = datetime.strptime(ad["start"], "%Y-%m-%d")
                ad_end = datetime.strptime(ad["end"], "%Y-%m-%d")

                if ad_start <= today <= ad_end:
                    next_ad = (
                        antardashas[index + 1]
                        if index + 1 < len(antardashas)
                        else None
                    )

                    return {
                        "current_mahadasha": dasha["mahadasha"],
                        "mahadasha_start": dasha["start"],
                        "mahadasha_end": dasha["end"],
                        "current_antardasha": ad,
                        "next_antardasha": next_ad,
                    }

    return None


def get_antardasha_timeline(dashas, limit=5):
    today = datetime.today()
    timeline = []

    for dasha in dashas:
        md_start = datetime.strptime(dasha["start"], "%Y-%m-%d")
        md_end = datetime.strptime(dasha["end"], "%Y-%m-%d")

        if md_start <= today <= md_end:
            for ad in dasha["antardashas"]:
                ad_end = datetime.strptime(ad["end"], "%Y-%m-%d")

                if ad_end >= today:
                    timeline.append({
                        "period": f'{dasha["mahadasha"]}/{ad["antardasha"]}',
                        "start": ad["start"],
                        "end": ad["end"],
                    })

                if len(timeline) >= limit:
                    return timeline

    return timeline


def add_dasha_enrichment(chart_data, birth_date):
    chart_data = chart_data or {}
    chart = chart_data.get("chart") or {}
    moon_data = chart.get("Moon") or {}

    moon_longitude = (
        chart_data.get("calculation", {}).get("dasha_moon_degree")
        or moon_data.get("raw_degree")
    )
    moon_sign = moon_data.get("sign", "")

    if moon_longitude is None:
        nakshatra_details = {}
        dashas = []
        current_dasha_details = {}
        antardasha_timeline = []
    else:
        nakshatra_details = get_nakshatra_details(moon_longitude)
        dashas = calculate_vimshottari_dasha(
            birth_date=birth_date,
            moon_longitude=moon_longitude
        )
        current_dasha_details = get_current_and_next_antardasha(dashas) or {}
        antardasha_timeline = get_antardasha_timeline(dashas)

    nakshatra_summary_card = {
        "Moon Sign": moon_sign or "Not available",
        "Nakshatra": nakshatra_details.get("nakshatra", "Not available"),
        "Pada": nakshatra_details.get("pada", "Not available"),
        "Nakshatra Lord": nakshatra_details.get("nakshatra_lord", "Not available"),
    }

    chart_data["nakshatra"] = nakshatra_details
    chart_data["nakshatra_summary_card"] = nakshatra_summary_card
    chart_data["current_dasha"] = current_dasha_details
    chart_data["current_dasha_details"] = current_dasha_details
    chart_data["antardasha_timeline"] = antardasha_timeline
    chart_data["dashas"] = dashas

    return chart_data

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://shrivinayaka-ai.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_report_display_names(report_style: str):
    style = (report_style or "full").lower().strip()

    if style == "consultation":
        return {
            "cover_title": "Personal Consultation Report",
            "report_type_label": "Personal Consultation Report",
            "price": 49,
        }

    if style == "full_plus_consultation":
        return {
            "cover_title": "Complete Astrology + Consultation Report",
            "report_type_label": "Complete Astrology + Consultation Report",
            "price": 149,
        }

    return {
        "cover_title": "Complete Astrology Report",
        "report_type_label": "Complete Astrology Report",
        "price": 99,
    }


def normalize_birth_date(birth_date: str):
    value = birth_date.strip()

    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass

    raise HTTPException(
        status_code=400,
        detail="Invalid Date of Birth. Please use a valid date."
    )


def validate_birth_time(birth_time: str):
    try:
        return datetime.strptime(birth_time.strip(), "%H:%M").strftime("%H:%M")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid Time of Birth. Please use HH:MM format."
        )


def validate_birth_data(data: "BirthData"):
    if not data.name or not data.name.strip():
        raise HTTPException(
            status_code=400,
            detail="Name is required"
        )

    if not data.birth_date or not data.birth_date.strip():
        raise HTTPException(
            status_code=400,
            detail="Date of Birth is required"
        )

    if not data.birth_time or not data.birth_time.strip():
        raise HTTPException(
            status_code=400,
            detail="Time of Birth is required"
        )

    validate_birth_time(data.birth_time)

    if not data.birth_place or not data.birth_place.strip():
        raise HTTPException(
            status_code=400,
            detail="Place of Birth is required"
        )

    if data.use_manual_coordinates:
        if data.latitude is None or data.longitude is None:
            raise HTTPException(
                status_code=400,
                detail="Latitude and longitude are required."
            )

        if data.latitude < -90 or data.latitude > 90:
            raise HTTPException(
                status_code=400,
                detail="Latitude must be between -90 and 90."
            )

        if data.longitude < -180 or data.longitude > 180:
            raise HTTPException(
                status_code=400,
                detail="Longitude must be between -180 and 180."
            )

    if (
        not data.employment_status
        or data.employment_status.strip() == ""
        or data.employment_status == "not_selected"
    ):
        raise HTTPException(
            status_code=400,
            detail="Employment Status is required"
        )

    if (
        not data.relationship_status
        or data.relationship_status.strip() == ""
        or data.relationship_status == "not_selected"
    ):
        raise HTTPException(
            status_code=400,
            detail="Relationship Status is required"
        )


class BirthData(BaseModel):
    name: str
    birth_date: str
    birth_time: str
    birth_place: str
    report_type: str = "free"
    report_style: str = "full"
    language: str = "english"
    payment_token: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    use_manual_coordinates: bool = False
    current_concern: str | None = None
    employment_status: str | None = None
    relationship_status: str | None = None
    main_question: str | None = None


class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentOrderRequest(BaseModel):
    report_style: str = "full"
    payload: dict | None = None


def verify_admin(x_admin_key: str | None):
    admin_secret = os.getenv("ADMIN_SECRET")

    if not x_admin_key or x_admin_key != admin_secret:
        raise HTTPException(
            status_code=403,
            detail="Admin access denied"
        )


@app.get("/")
def home():
    return {"message": "Shrivinayaka AI Astrology Running"}


@app.get("/reports")
def reports_history(x_admin_key: str | None = Header(default=None)):
    verify_admin(x_admin_key)

    return {
        "reports": get_all_reports()
    }


@app.get("/search-place")
def search_place(q: str):
    query = q.strip()

    if len(query) < 2:
        return []

    query_lower = query.lower()
    local_india_results = [
        place
        for place in COMMON_INDIAN_PLACES
        if place["name"].lower().startswith(query_lower)
    ]

    india_results = []
    global_results = []
    errors = []

    try:
        india_results = nominatim_search(query, "in")
    except Exception as e:
        print("SEARCH PLACE INDIA ERROR:")
        traceback.print_exc()
        errors.append(str(e))

    try:
        global_results = nominatim_search(query)
    except Exception as e:
        print("SEARCH PLACE GLOBAL ERROR:")
        traceback.print_exc()
        errors.append(str(e))

    results = dedupe_places(
        local_india_results + india_results + global_results
    )

    if results:
        return results[:12]

    return {"error": "; ".join(errors) or "No places found"}


@app.get("/report/{report_id}")
def get_single_report(
    report_id: int,
    x_admin_key: str | None = Header(default=None)
):
    verify_admin(x_admin_key)

    report = get_report_by_id(report_id)

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    return report


@app.post("/create-payment-order")
def create_payment_order(data: PaymentOrderRequest):
    display = get_report_display_names(data.report_style)
    order = create_order(display["price"])
    pending_payment_orders[order["id"]] = data.payload or {}

    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key": os.getenv("RAZORPAY_KEY_ID")
    }


@app.post("/verify-payment")
def verify_payment(data: PaymentVerification):

    try:
        params_dict = {
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature
        }

        razorpay_client.utility.verify_payment_signature(params_dict)

        token = str(uuid.uuid4())
        verified_payment_tokens.add(token)

        return {
            "success": True,
            "payment_token": token
        }

    except:
        raise HTTPException(
            status_code=400,
            detail="Payment verification failed"
        )


@app.post("/complete-payment-order")
def complete_payment_order(data: PaymentVerification):

    try:
        params_dict = {
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature
        }

        razorpay_client.utility.verify_payment_signature(params_dict)

    except:
        raise HTTPException(
            status_code=400,
            detail="Payment verification failed"
        )

    payload = pending_payment_orders.pop(data.razorpay_order_id, None)

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="Payment details found, but report form data was not found."
        )

    token = str(uuid.uuid4())
    verified_payment_tokens.add(token)

    payload = dict(payload)
    payload["report_type"] = "premium"
    payload["payment_token"] = token

    report_data = BirthData(**payload)

    return generate_report(report_data)


def build_chart_response(data: BirthData):
    validate_birth_data(data)
    birth_date_for_chart = normalize_birth_date(data.birth_date)
    birth_time_for_chart = validate_birth_time(data.birth_time)

    print(
        "BIRTH INPUT USED:",
        {
            "birth_date": data.birth_date,
            "birth_date_for_chart": birth_date_for_chart,
            "birth_time": birth_time_for_chart,
            "birth_place": data.birth_place
        }
    )

    chart = generate_chart(
        birth_date=birth_date_for_chart,
        birth_time=birth_time_for_chart,
        birth_place=data.birth_place,
        latitude=data.latitude,
        longitude=data.longitude,
        use_manual_coordinates=data.use_manual_coordinates
    )

    if "error" in chart:
        return chart

    chart = add_dasha_enrichment(chart, birth_date_for_chart)
    current_dasha = get_current_mahadasha(chart["dasha"])

    print("CURRENT DASHA FROM API:", current_dasha)
    print("DASHA CALCULATION:", chart.get("calculation"))

    return {
        "name": data.name,
        "input": {
            "birth_date": data.birth_date,
            "birth_time": birth_time_for_chart,
            "birth_place": data.birth_place
        },
        "current_mahadasha": current_dasha,
        "chart": chart
    }


@app.post("/generate-chart")
def generate_chart_only(data: BirthData):
    return build_chart_response(data)


@app.post("/generate-report")
def generate_report(data: BirthData):

    validate_birth_data(data)
    birth_date_for_chart = normalize_birth_date(data.birth_date)
    birth_time_for_chart = validate_birth_time(data.birth_time)

    if data.report_type.lower().strip() == "premium":
        if not data.payment_token or data.payment_token not in verified_payment_tokens:
            raise HTTPException(
                status_code=403,
                detail="Premium report requires verified payment."
            )

        verified_payment_tokens.remove(data.payment_token)

    chart = generate_chart(
        birth_date=birth_date_for_chart,
        birth_time=birth_time_for_chart,
        birth_place=data.birth_place,
        latitude=data.latitude,
        longitude=data.longitude,
        use_manual_coordinates=data.use_manual_coordinates
    )

    if "error" in chart:
        return chart

    chart = add_dasha_enrichment(chart, birth_date_for_chart)

    question = data.main_question.strip() if data.main_question else None

    if question and len(question) > 250:
        question = question[:250]

    report = generate_full_prediction(
        chart_data=chart,
        report_type=data.report_type,
        language=data.language,
        report_style=data.report_style,
        user_context={
            "current_concern": data.current_concern,
            "employment_status": data.employment_status,
            "relationship_status": data.relationship_status,
            "main_question": question
        }
    )

    current_dasha = None
    today = datetime.today().strftime("%Y-%m-%d")

    for period in chart["dasha"]["timeline"]:
        if period["start"] <= today < period["end"]:
            current_dasha = period
            break

    payment_status = "paid" if data.report_type.lower().strip() == "premium" else "free"
    display = get_report_display_names(data.report_style)

    report_id = save_report(
        name=data.name,
        birth_date=data.birth_date,
        birth_time=birth_time_for_chart,
        birth_place=data.birth_place,
        report_type=data.report_type,
        current_mahadasha=current_dasha,
        chart=chart,
        report_text=report,
        payment_status=payment_status
    )
    display_report_id = f"SK{datetime.now().strftime('%Y%m%d%H%M%S')}"
    generated_on = datetime.now().strftime("%d/%m/%Y")

    if data.report_type.lower().strip() == "premium":
        response = {
            "report_id": report_id,
            "display_report_id": display_report_id,
            "generated_on": generated_on,
            "name": data.name,
            "report_type": data.report_type,
            "report_style": data.report_style,
            "cover_title": display["cover_title"],
            "report_type_label": display["report_type_label"],
            "language": data.language,
            "latitude": chart.get("latitude"),
            "longitude": chart.get("longitude"),
            "input": {
                "birth_date": data.birth_date,
                "birth_time": birth_time_for_chart,
                "birth_place": data.birth_place,
                "employment_status": data.employment_status,
                "relationship_status": data.relationship_status
            },
            "current_mahadasha": current_dasha,
            "nakshatra": chart.get("nakshatra"),
            "nakshatra_summary_card": chart.get("nakshatra_summary_card"),
            "current_dasha": chart.get("current_dasha"),
            "current_dasha_details": chart.get("current_dasha_details"),
            "calculation": chart["calculation"],
            "chart": chart["chart"],
            "charts": chart.get("charts"),
            "life_area_scores": chart.get("life_area_scores"),
            "transits": chart.get("transits"),
            "dashas": chart.get("dashas"),
            "antardasha_timeline": chart.get("antardasha_timeline"),
            "dasha_timeline": chart["dasha"]["timeline"],
            "report": report
        }
    else:
        response = {
            "report_id": report_id,
            "display_report_id": display_report_id,
            "generated_on": generated_on,
            "name": data.name,
            "report_type": data.report_type,
            "report_style": data.report_style,
            "cover_title": display["cover_title"],
            "report_type_label": display["report_type_label"],
            "language": data.language,
            "latitude": chart.get("latitude"),
            "longitude": chart.get("longitude"),
            "input": {
                "birth_date": data.birth_date,
                "birth_time": birth_time_for_chart,
                "birth_place": data.birth_place,
                "employment_status": data.employment_status,
                "relationship_status": data.relationship_status
            },
            "current_mahadasha": current_dasha,
            "nakshatra": chart.get("nakshatra"),
            "nakshatra_summary_card": chart.get("nakshatra_summary_card"),
            "current_dasha": chart.get("current_dasha"),
            "current_dasha_details": chart.get("current_dasha_details"),
            "chart": chart.get("chart"),
            "charts": chart.get("charts"),
            "life_area_scores": chart.get("life_area_scores"),
            "transits": chart.get("transits"),
            "dashas": chart.get("dashas"),
            "antardasha_timeline": chart.get("antardasha_timeline"),
            "report": report
        }

    return response
