
import razorpay

from django.conf import settings


def get_razorpay_client():

    if not settings.RAZORPAY_KEY_ID:
        raise ValueError("Razorpay Key ID is not configured.")

    if not settings.RAZORPAY_KEY_SECRET:
        raise ValueError("Razorpay Key Secret is not configured.")

    return razorpay.Client(
        auth=(
            settings.RAZORPAY_KEY_ID,
            settings.RAZORPAY_KEY_SECRET
        )
    )


def create_razorpay_order(amount, receipt):

    client = get_razorpay_client()

    razorpay_order = client.order.create(
        data={
            "amount": int(amount * 100),
            "currency": "INR",
            "receipt": str(receipt)
        }
    )

    return razorpay_order


def fetch_razorpay_order_payments(razorpay_order_id):

    client = get_razorpay_client()

    return client.order.payments(razorpay_order_id)


    
def verify_razorpay_payment_signature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
):

    client = get_razorpay_client()

    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature
        })

        return True

    except razorpay.errors.SignatureVerificationError:
        return False
