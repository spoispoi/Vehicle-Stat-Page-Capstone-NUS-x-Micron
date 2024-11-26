from rest_framework import viewsets
from .models import Tool
from .serializer import ToolSerializer
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from tools.models import Tool

class ToolViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing tool instances.
    """
    queryset = Tool.objects.all()  # Fetch all tools from the database
    serializer_class = ToolSerializer  # Use the serializer to format the response
    filter_backends = [DjangoFilterBackend, SearchFilter]  # Add filter backends
    filterset_fields = ['equip_id']  # Allow filtering by equip_id
    search_fields = ['equip_id']  # Allow searching by equip_id
