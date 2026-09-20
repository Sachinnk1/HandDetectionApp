from django.urls import path

from .views import GestureDetectionListCreateView, detect_hand

urlpatterns = [
    path('detections/', GestureDetectionListCreateView.as_view(), name='detection-list-create'),
    path('detect/', detect_hand, name='detect-hand'),
]