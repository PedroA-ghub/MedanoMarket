import os
from urllib.parse import urlencode

from django.shortcuts import redirect
from django.conf import settings
from django.utils.crypto import get_random_string
from django.contrib.auth import login
from django.utils import timezone

from allauth.socialaccount.models import SocialApp, SocialAccount
from ventas.models import User

FRONTEND_URL = settings.BASE_URL


def google_login(request):
    try:
        app = SocialApp.objects.filter(provider="google").first()
        if not app:
            return redirect(f"{FRONTEND_URL}/login?auth=error&reason=no_app")

        callback_url = request.build_absolute_uri("/accounts/google/login-callback/")
        state = get_random_string(32)

        params = urlencode({
            "client_id": app.client_id,
            "redirect_uri": callback_url,
            "scope": "openid profile email",
            "response_type": "code",
            "state": state,
            "access_type": "online",
        })

        return redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")
    except Exception as e:
        print(f"Google login error: {e}")
        return redirect(f"{FRONTEND_URL}/login?auth=error&reason=login_error")


def google_callback(request):
    error = request.GET.get("error")
    code = request.GET.get("code")

    if error or not code:
        reason = error or "no_code"
        return redirect(f"{FRONTEND_URL}/login?auth=error&reason={reason}")

    try:
        app = SocialApp.objects.filter(provider="google").first()
        if not app:
            return redirect(f"{FRONTEND_URL}/login?auth=error&reason=no_app")

        # Exchange code for token
        import requests
        callback_url = request.build_absolute_uri("/accounts/google/login-callback/")
        token_response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": app.client_id,
                "client_secret": app.secret,
                "redirect_uri": callback_url,
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code != 200:
            print(f"Token error: {token_response.text}")
            return redirect(f"{FRONTEND_URL}/login?auth=error&reason=token_error")

        tokens = token_response.json()
        access_token = tokens.get("access_token")

        # Get user info
        userinfo_response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if userinfo_response.status_code != 200:
            return redirect(f"{FRONTEND_URL}/login?auth=error&reason=userinfo_error")

        userinfo = userinfo_response.json()
        google_id = userinfo.get("sub")
        email = userinfo.get("email", "")

        # Find or create user
        try:
            social_account = SocialAccount.objects.get(provider="google", uid=google_id)
            user = social_account.user
        except SocialAccount.DoesNotExist:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                username = email.split("@")[0] if "@" in email else f"user_{google_id[:8]}"
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    needs_onboarding=True,
                )

            SocialAccount.objects.create(
                user=user,
                provider="google",
                uid=google_id,
                extra_data=userinfo,
            )

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        login(request, user)

        return redirect(f"{FRONTEND_URL}/?auth=success")

    except Exception as e:
        print(f"Google callback error: {e}")
        import traceback
        traceback.print_exc()
        return redirect(f"{FRONTEND_URL}/login?auth=error&reason=callback_error")
