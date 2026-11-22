
import re
from rest_framework import serializers
from .models import User,Address


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    confirm_password = serializers.CharField(
        write_only=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "password",
            "confirm_password",
        ]
    def validate_full_name(self, value):
        name = value.replace(" ", "")

        if not name.isalpha():
            raise serializers.ValidationError(
                "Name must contain only letters."
            )

        return value    

    def validate_password(self, value):
        if not re.search(r"[0-9]", value):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )

        if not any(char in value for char in "!@#$%^&*(),.?"):
            raise serializers.ValidationError(
                "Password must contain at least one symbol."
            )

        return value

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })
        return data

    def create(self, validated_data):
        validated_data.pop("confirm_password")

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            is_active=False,
            auth_providers="email",
        )
        return user
    



class PasswordResetSerializer(serializers.Serializer):
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
    )
    confirm_password = serializers.CharField(
        write_only=True,
    )

    def validate_new_password(self, value):
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )

        if not any(not char.isalnum() for char in value):
            raise serializers.ValidationError(
                "Password must contain at least one symbol."
            )

        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        return attrs

class UserProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "image",
        ]
        read_only_fields = ["id", "email"]
        
        
    def validate_full_name(self, value):
        name = value.replace(" ", "")

        if not name.isalpha():
            raise serializers.ValidationError(
                "Name must contain only letters."
            )

        return value

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError(
                "Phone number must contain exactly 10 digits."
            )

        return value 
       
class AddressSerializer(serializers.ModelSerializer):

    class Meta:
        model = Address
        exclude = ["user"]

    def validate_full_name(self, value):
        name = value.replace(" ", "")

        if not name.isalpha():
            raise serializers.ValidationError(
                "Name must contain only letters."
            )

        return value

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError(
                "Phone number must contain exactly 10 digits."
            )

        return value

    def validate_address_line(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Address cannot be empty."
            )

        return value

    def validate_city(self, value):
        city = value.replace(" ", "")

        if not city.isalpha():
            raise serializers.ValidationError(
                "City must contain only letters."
            )

        return value

    def validate_district(self, value):
        district = value.replace(" ", "")

        if not district.isalpha():
            raise serializers.ValidationError(
                "District must contain only letters."
            )

        return value

    def validate_state(self, value):
        state = value.replace(" ", "")

        if not state.isalpha():
            raise serializers.ValidationError(
                "State must contain only letters."
            )

        return value

    def validate_pincode(self, value):
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError(
                "PIN code must contain exactly 6 digits."
            )

        return value
class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
    )
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )

        if not any(not char.isalnum() for char in value):
            raise serializers.ValidationError(
                "Password must contain at least one symbol."
            )

        return value

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        return data           
class EmailChangeSerializer(serializers.Serializer):
    new_email = serializers.EmailField()

    def validate_new_email(self, value):
        user = self.context["request"].user

        if value.lower() == user.email.lower():
            raise serializers.ValidationError(
                "This is already your current email."
            )

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "This email is already registered."
            )

        return value 
class CustomerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "image",
            "is_active",
            "created_at",
        ]       