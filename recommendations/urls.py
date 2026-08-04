from django.urls import path
from . import views

urlpatterns = [
    path('recommendations/', views.harmonic_recommendations, name='harmonic_recommendations'),
]
