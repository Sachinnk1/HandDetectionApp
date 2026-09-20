import os
import threading

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from rest_framework import generics
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import GestureDetection
from .serializers import GestureDetectionSerializer


class GestureDetectionListCreateView(generics.ListCreateAPIView):
    queryset = GestureDetection.objects.all()
    serializer_class = GestureDetectionSerializer



# Set True if your RIGHT hand is reported as LEFT
FLIP_HANDS = False

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'hand_landmarker.task')

_landmarker = vision.HandLandmarker.create_from_options(
    vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=vision.RunningMode.IMAGE,
        num_hands=1,
        min_hand_detection_confidence=0.6,
    )
)
_lock = threading.Lock()  # the dev server is multi-threaded


@api_view(['POST'])
@parser_classes([MultiPartParser])
def detect_hand(request):
    file = request.FILES.get('image')
    if file is None:
        return Response({'error': 'No image'}, status=400)

    img = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return Response({'error': 'Bad image'}, status=400)

    rgb = np.ascontiguousarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    with _lock:
        result = _landmarker.detect(mp_image)

    if not result.handedness:
        return Response({'detected': False})

    cat = result.handedness[0][0]
    label = cat.category_name.upper()
    if FLIP_HANDS:
        label = 'LEFT' if label == 'RIGHT' else 'RIGHT'

    return Response({
        'detected': True,
        'hand_type': label,
        'confidence': round(cat.score, 2),
    })