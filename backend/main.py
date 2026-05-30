import os
import razorpay
import uuid
from datetime import datetime

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from astrology_engine.chart import generate_chart
from ai_engine.prediction import generate_full_prediction
from ai_engine.prediction import get_current_dasha
from backend.database import init_db, save_report, get_all_reports, get_report_by_id
from backend.payment import create_order, razorpay_client


app = FastAPI()

init_db()

verified_payment_tokens = set()

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
            "report_type_label": "Personal Consultation",
            "price": 75,
        }

    if style == "full_plus_consultation":
        return {
            "cover_title": "Complete Astrology Report + Personal Consultation",
            "report_type_label": "Complete + Consultation",
            "price": 199,
        }

    return {
        "cover_title": "Complete Astrology Report",
        "report_type_label": "Complete Astrology",
        "price": 125,
    }


def normalize_birth_date_for_chart(birth_date: str):
    value = birth_date.strip()

    try:
        if "/" in value:
            return datetime.strptime(value, "%d/%m/%Y").strftime("%Y-%m-%d")

        return datetime.strptime(value, "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Birth date must be in DD/MM/YYYY format."
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


def build_chart_response(data: BirthData):
    birth_date_for_chart = normalize_birth_date_for_chart(data.birth_date)

    print(
        "BIRTH INPUT USED:",
        {
            "birth_date": data.birth_date,
            "birth_date_for_chart": birth_date_for_chart,
            "birth_time": data.birth_time,
            "birth_place": data.birth_place
        }
    )

    chart = generate_chart(
        birth_date=birth_date_for_chart,
        birth_time=data.birth_time,
        birth_place=data.birth_place
    )

    if "error" in chart:
        return chart

    current_dasha = get_current_dasha(chart["dasha"])

    print("CURRENT DASHA FROM API:", current_dasha)
    print("DASHA CALCULATION:", chart.get("calculation"))

    return {
        "name": data.name,
        "input": {
            "birth_date": data.birth_date,
            "birth_time": data.birth_time,
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

    birth_date_for_chart = normalize_birth_date_for_chart(data.birth_date)

    if data.report_type.lower().strip() == "premium":
        if not data.payment_token or data.payment_token not in verified_payment_tokens:
            raise HTTPException(
                status_code=403,
                detail="Premium report requires verified payment."
            )

        verified_payment_tokens.remove(data.payment_token)

    chart = generate_chart(
        birth_date=birth_date_for_chart,
        birth_time=data.birth_time,
        birth_place=data.birth_place
    )

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
        birth_time=data.birth_time,
        birth_place=data.birth_place,
        report_type=data.report_type,
        current_mahadasha=current_dasha,
        chart=chart,
        report_text=report,
        payment_status=payment_status
    )

    if data.report_type.lower().strip() == "premium":
        response = {
            "report_id": report_id,
            "name": data.name,
            "report_type": data.report_type,
            "report_style": data.report_style,
            "cover_title": display["cover_title"],
            "report_type_label": display["report_type_label"],
            "language": data.language,
            "input": {
                "birth_date": data.birth_date,
                "birth_time": data.birth_time,
                "birth_place": data.birth_place
            },
            "current_mahadasha": current_dasha,
            "calculation": chart["calculation"],
            "chart": chart["chart"],
            "transits": chart.get("transits"),
            "dasha_timeline": chart["dasha"]["timeline"],
            "report": report
        }
    else:
        response = {
            "report_id": report_id,
            "name": data.name,
            "report_type": data.report_type,
            "report_style": data.report_style,
            "cover_title": display["cover_title"],
            "report_type_label": display["report_type_label"],
            "language": data.language,
            "input": {
                "birth_date": data.birth_date,
                "birth_time": data.birth_time,
                "birth_place": data.birth_place
            },
            "current_mahadasha": current_dasha,
            "transits": chart.get("transits"),
            "report": report
        }

    return response
