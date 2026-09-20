from rest_framework import serializers

from .models import GestureDetection


class GestureDetectionSerializer(serializers.ModelSerializer):

    class Meta:
        model = GestureDetection
        fields = [
            'id',
            'user',
            'hand_type',
            'confidence',
            'detected_at',
        ]

        read_only_fields = [
            'id',
            'detected_at',
        ]