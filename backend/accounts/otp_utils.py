
import secrets
import hashlib
from datetime import timedelta

from django.utils import timezone

from .models import EmailOTP


def generate_email_otp(user, purpose="email_verification", email=None):
    otp = f"{secrets.randbelow(1000000):06d}"

    otp_hash = hashlib.sha256(otp.encode()).hexdigest()

    EmailOTP.objects.create(
        user=user,
        otp_hash=otp_hash,
        expires_at=timezone.now() + timedelta(minutes=5),
        attempts=0,
        email=email or user.email,
        purpose=purpose,
    )

    return otp

