
import os

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create Render admin account if it does not exist."

    def handle(self, *args, **options):
        User = get_user_model()

        email = os.environ.get("RENDER_ADMIN_EMAIL")
        password = os.environ.get("RENDER_ADMIN_PASSWORD")
        full_name = os.environ.get("RENDER_ADMIN_FULL_NAME", "HomeNest Admin")

        if not email or not password:
            self.stdout.write(
                self.style.WARNING("Render admin environment variables are not set.")
            )
            return

        user = User.objects.filter(email=email).first()

        if user:
            self.stdout.write(
                self.style.SUCCESS("Admin account already exists. No changes made.")
            )
            return

        User.objects.create_superuser(
            email=email,
            password=password,
            full_name=full_name,
        )

        self.stdout.write(
            self.style.SUCCESS("Render admin account created successfully.")
        )

