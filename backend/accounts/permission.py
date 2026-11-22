from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    message = "You do not have permission to access this resource."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )