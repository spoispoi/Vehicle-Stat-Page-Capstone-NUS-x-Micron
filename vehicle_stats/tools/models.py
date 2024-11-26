from django.db import models

class Tool(models.Model):
    equip_id = models.CharField(max_length=50)
    state_in_date = models.DateField(null=True, blank=True)
    event_code = models.CharField(max_length=20)
    error_name = models.CharField(max_length=255)
    error_description = models.TextField()

    def __str__(self):
        return f"Tool(equip_id={self.equip_id}, state_in_date={self.state_in_date}, event_code={self.event_code}, error_name={self.error_name}, error_description={self.error_description})"