# from rest_framework import viewsets
# from .models import Tool
# from .serializer import ToolSerializer
# from rest_framework.viewsets import ModelViewSet
# from rest_framework.filters import SearchFilter
# from django_filters.rest_framework import DjangoFilterBackend
# from tools.models import Tool

# ##

# from django.db.models import Count, F, Max, Min
# from django.db.models.functions import TruncDay
# from rest_framework.decorators import api_view
# from rest_framework.response import Response
# from .models import Tool
# from django.db.models import Count, Max, Min, F
# from django.http import JsonResponse
# from .models import Tool

# class ToolViewSet(viewsets.ModelViewSet):
#     """
#     A viewset for viewing and editing tool instances.
#     """
#     queryset = Tool.objects.all()  # Fetch all tools from the database
#     serializer_class = ToolSerializer  # Use the serializer to format the response
#     filter_backends = [DjangoFilterBackend, SearchFilter]  # Add filter backends
#     filterset_fields = ['equip_id']  # Allow filtering by equip_id
#     search_fields = ['equip_id']  # Allow searching by equip_id

# def equipment_statistics(request, equip_id):
#     # Check if the equipment exists
#     if not Tool.objects.filter(equip_id=equip_id).exists():
#         return JsonResponse({"error": "Equipment not found"}, status=404)

#     # Get the most common event code and error name
#     most_common_event_code = (
#         Tool.objects.filter(equip_id=equip_id)
#         .values('event_code')
#         .annotate(count=Count('event_code'))
#         .order_by('-count')
#         .first()
#     )

#     most_common_error_name = (
#         Tool.objects.filter(equip_id=equip_id)
#         .values('error_name')
#         .annotate(count=Count('error_name'))
#         .order_by('-count')
#         .first()
#     )

#     # Aggregate statistics
#     data = Tool.objects.filter(equip_id=equip_id).aggregate(
#         total_errors=Count('id'),
#         earliest_error_date=Min('state_in_date'),
#         latest_error_date=Max('state_in_date'),
#     )

#     # Add most common event code and error name to the response
#     data.update({
#         "most_common_event_code": most_common_event_code['event_code'] if most_common_event_code else None,
#         "most_common_error_name": most_common_error_name['error_name'] if most_common_error_name else None,
#     })


#     return JsonResponse(data)


from rest_framework import viewsets
from .models import Tool
from .serializer import ToolSerializer
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, F, Max, Min
from django.http import JsonResponse


class ToolViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing tool instances.
    """
    queryset = Tool.objects.all()  # Fetch all tools from the database
    serializer_class = ToolSerializer  # Use the serializer to format the response
    filter_backends = [DjangoFilterBackend, SearchFilter]  # Add filter backends
    filterset_fields = ['equip_id']  # Allow filtering by equip_id
    search_fields = ['equip_id']  # Allow searching by equip_id

def equipment_statistics(request, equip_id):
    # Check if the equipment exists
    if not Tool.objects.filter(equip_id=equip_id).exists():
        return JsonResponse({"error": "Equipment not found"}, status=404)

    # Get the most common event code and error name
    most_common_event_code = (
        Tool.objects.filter(equip_id=equip_id)
        .values('event_code')
        .annotate(count=Count('event_code'))
        .order_by('-count')
        .first()
    )

    most_common_error_name = (
        Tool.objects.filter(equip_id=equip_id)
        .values('error_name')
        .annotate(count=Count('error_name'))
        .order_by('-count')
        .first()
    )

    # Aggregate general statistics
    data = Tool.objects.filter(equip_id=equip_id).aggregate(
        total_errors=Count('id'),
        earliest_error_date=Min('state_in_date'),
        latest_error_date=Max('state_in_date'),
    )

    # Collect error notes grouped by error name
    error_notes = (
        Tool.objects.filter(equip_id=equip_id)
        .values('error_name', 'error_description')
        .annotate(note_count=Count('error_description'))
    )

    # Format the error notes to group by error name
    formatted_error_notes = {}
    for item in error_notes:
        error_name = item['error_name']
        if error_name not in formatted_error_notes:
            formatted_error_notes[error_name] = []
        formatted_error_notes[error_name].append(item['error_description'])

    # Add detailed statistics to the response
    data.update({
        "most_common_event_code": most_common_event_code['event_code'] if most_common_event_code else None,
        "most_common_error_name": most_common_error_name['error_name'] if most_common_error_name else None,
        "error_notes": formatted_error_notes,
    })

    return JsonResponse(data)

