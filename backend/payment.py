import os
import razorpay
from dotenv import load_dotenv

load_dotenv()

razorpay_client = razorpay.Client(
    auth=(
        os.getenv("RAZORPAY_KEY_ID"),
        os.getenv("RAZORPAY_KEY_SECRET")
    )
)


def create_order(amount_rupees):
    amount_paise = amount_rupees * 100

    order = razorpay_client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "payment_capture": 1
    })

    return order
