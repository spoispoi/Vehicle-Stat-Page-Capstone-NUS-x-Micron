from django.db import models

class Tool(models.Model):
    name = models.CharField(max_length=100)
    top_alarms = models.IntegerField(default=0)
    last_maintenance = models.DateField()
    recent_errors = models.IntegerField(default=0)

    def __str__(self):
        return self.name
