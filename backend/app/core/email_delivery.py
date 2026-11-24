from urllib.parse import urlencode

from app.core.config import get_email_delivery_mode, get_frontend_url


def build_email_verification_url(token: str) -> str:
    query = urlencode({"token": token})
    return f"{get_frontend_url()}/#/verify-email?{query}"


def build_password_reset_url(token: str) -> str:
    query = urlencode({"token": token})
    return f"{get_frontend_url()}/#/reset-password?{query}"


def send_email_verification(recipient: str, token: str) -> None:
    mode = get_email_delivery_mode()
    if mode == "console":
        print(
            "\n[email verification]"
            f"\nTo: {recipient}"
            f"\nOpen: {build_email_verification_url(token)}\n",
            flush=True,
        )


def send_password_reset(recipient: str, token: str) -> None:
    mode = get_email_delivery_mode()
    if mode == "console":
        print(
            "\n[password reset]"
            f"\nTo: {recipient}"
            f"\nOpen: {build_password_reset_url(token)}\n",
            flush=True,
        )


def send_password_changed_notice(recipient: str) -> None:
    mode = get_email_delivery_mode()
    if mode == "console":
        print(
            "\n[password changed]"
            f"\nTo: {recipient}"
            "\nYour Liftoff password was reset.\n",
            flush=True,
        )
