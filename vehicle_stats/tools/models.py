from django.db import models
from django.utils import timezone

class Tool(models.Model):
    equip_id = models.CharField(max_length=50)
    state_in_date = models.DateTimeField(null=True, blank=True)
    event_code = models.CharField(max_length=20)
    error_name = models.CharField(max_length=255)
    error_description = models.TextField()
    recent_errors = models.CharField(max_length=255, null=True, blank=True)

    def save(self, *args, **kwargs):
        # Ensure state_in_date is timezone-aware if it exists
        if self.state_in_date and timezone.is_naive(self.state_in_date):
            self.state_in_date = timezone.make_aware(self.state_in_date)
        super(Tool, self).save(*args, **kwargs)

    def __str__(self):
        formatted_date = self.state_in_date.strftime('%Y-%m-%d %H:%M:%S') if self.state_in_date else 'N/A'
        return f"Tool(equip_id={self.equip_id}, state_in_date={formatted_date}, event_code={self.event_code}, error_name={self.error_name}, error_description={self.error_description})"