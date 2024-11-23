from django.contrib import admin
from .models import Tool

@admin.register(Tool)
class ToolAdmin(admin.ModelAdmin):
    list_display = ('name', 'top_alarms', 'last_maintenance', 'recent_errors')  # Fields to display in the admin panel
