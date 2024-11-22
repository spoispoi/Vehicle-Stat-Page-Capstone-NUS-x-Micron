from rest_framework import viewsets
from .models import Tool
from .serializer import ToolSerializer

class ToolViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing tool instances.
    """
    queryset = Tool.objects.all()  # Fetch all tools from the database
    serializer_class = ToolSerializer  # Use the serializer to format the response
