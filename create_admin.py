#!/usr/bin/env python
"""Script to create an admin user"""
import os
import django
import sys

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyrealm.settings')
django.setup()

from django.contrib.auth.models import User
from apps.characters.models import Player

# Create superuser
if not User.objects.filter(username='admin').exists():
    user = User.objects.create_superuser(
        username='admin',
        email='admin@example.com', 
        password='admin123'
    )
    print("Superuser 'admin' created with password 'admin123'")
    
    # Create player profile for admin
    Player.objects.create(
        user=user,
        name='Admin Hero',
        level=10,  # Give admin a higher level
        max_hp=200,
        current_hp=200,
        max_mp=100,
        current_mp=100
    )
    print("Player profile created for admin")
else:
    print("Admin user already exists")
    
print("\nYou can now log in to:")
print("- Admin panel: http://127.0.0.1:8000/admin/")
print("- Game: http://127.0.0.1:8000/login/")
print("\nUsername: admin")
print("Password: admin123")