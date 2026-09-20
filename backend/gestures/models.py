from django.db import models


class GestureDetection(models.Model):

    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)
    
    HAND_CHOICES = [
        ('LEFT', 'Left Hand'),
        ('RIGHT', 'Right Hand'),
    ]

    hand_type = models.CharField(
        max_length=10,
        choices=HAND_CHOICES
    )

    confidence = models.FloatField()

    detected_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ['-detected_at']

    def __str__(self):
        return f"{self.hand_type} - {self.confidence}%"