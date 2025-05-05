from django.db import models
from django.utils.dateformat import format

class Tool(models.Model):
    equip_id = models.CharField(max_length=50)
    state_in_date = models.DateTimeField(null=True, blank=True)
    event_code = models.CharField(max_length=20)
    error_name = models.CharField(max_length=255)
    error_description = models.TextField()
    recent_errors = models.CharField(max_length=255, null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.state_in_date:
            self.state_in_date = format(self.state_in_date, 'Y-m-d H:i:s')
        super(Tool, self).save(*args, **kwargs)

    def __str__(self):
        formatted_date = self.state_in_date if self.state_in_date else 'N/A'
        return f"Tool(equip_id={self.equip_id}, state_in_date={formatted_date}, event_code={self.event_code}, error_name={self.error_name}, error_description={self.error_description})"