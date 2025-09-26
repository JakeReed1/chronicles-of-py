from django.shortcuts import render
from django.views.generic import TemplateView

from django.shortcuts import render, redirect
from django.views.generic import TemplateView
from django.contrib.auth import login, authenticate
from django.contrib.auth.views import LoginView, LogoutView
from django.views.generic.edit import CreateView
from django.urls import reverse_lazy
from django.contrib import messages
from django.contrib.auth.decorators import login_required

from .forms import SignUpForm
from apps.characters.models import Player


class HomeView(TemplateView):
    """Home page view"""
    template_name = 'home.html'


@login_required
def game_view(request):
    """Game view for playing the Phaser game"""
    return render(request, 'game.html')


class SignUpView(CreateView):
    """User registration view"""
    form_class = SignUpForm
    template_name = 'registration/signup.html'
    success_url = reverse_lazy('login')
    
    def form_valid(self, form):
        response = super().form_valid(form)
        # Create player profile for new user
        Player.objects.create(
            user=self.object,
            name=self.object.username,
            level=1,
            max_hp=100,
            current_hp=100,
            max_mp=50,
            current_mp=50
        )
        messages.success(self.request, 'Account created successfully! You can now log in.')
        return response


class CustomLoginView(LoginView):
    """Custom login view with redirect logic"""
    template_name = 'registration/login.html'
    
    def get_success_url(self):
        # Redirect to battles page after login
        return reverse_lazy('battles:battle')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['game_title'] = 'Chronicles of Py'
        return context
