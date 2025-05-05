from django.contrib import admin
from .models import Tool

@admin.register(Tool)
class ToolAdmin(admin.ModelAdmin):
    list_display = ('equip_id', 'state_in_date', 'event_code', 'error_name', 'error_description')  # Fields to display in the admin panel

#  equip_id = models.CharField(max_length=50)
#     state_in_date = models.DateField()
#     event_code = models.CharField(max_length=20)
#     error_name = models.CharField(max_length=255)
#     error_description = models.TextField()