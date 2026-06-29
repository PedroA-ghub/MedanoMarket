from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.shortcuts import render

class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def get_connect_redirect_url(self, request, socialaccount):
        return "/accounts/google/login-success/"

    def pre_social_login(self, request, sociallogin):
        pass

def google_login_success(request):
    return render(request, "allauth/socialaccount/login_success.html")
