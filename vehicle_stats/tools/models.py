from django.db import models

class Tool(models.Model):
    name = models.CharField(max_length=100)
    top_alarms = models.CharField(max_length=100)
    last_maintenance = models.DateField()
    recent_errors = models.CharField(max_length=100)

    def __str__(self):
        return self.name
