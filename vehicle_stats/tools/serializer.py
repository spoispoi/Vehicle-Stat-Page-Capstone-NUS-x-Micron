from rest_framework import serializers
from .models import Tool

class ToolSerializer(serializers.ModelSerializer):
    state_in_date = serializers.SerializerMethodField()
    
    def get_state_in_date(self, obj):
        if obj.state_in_date:
            # Format as YYYY-MM-DD HH:MM:SS without timezone info
            return obj.state_in_date.strftime('%Y-%m-%d %H:%M:%S')
        return None
    
    class Meta:
        model = Tool
        fields = '__all__'
