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
from datetime import datetime
from django.utils.dateparse import parse_date
from collections import Counter


class ToolViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing tool instances.
    """
    queryset = Tool.objects.all()  # Fetch all tools from the database
    serializer_class = ToolSerializer  # Use the serializer to format the response
    filter_backends = [DjangoFilterBackend, SearchFilter]  # Add filter backends
    filterset_fields = ['equip_id']  # Allow filtering by equip_id
    search_fields = ['equip_id']  # Allow searching by equip_id

    def get_queryset(self):
        queryset = Tool.objects.all()
        
        # Get date filter parameters
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        equip_id = self.request.query_params.get('equip_id')
        
        print(f"ToolViewSet - equip_id: {equip_id}, start_date: {start_date}, end_date: {end_date}")
        
        # Apply equipment filter if provided
        if equip_id:
            queryset = queryset.filter(equip_id=equip_id)
            print(f"Applied equipment filter: {equip_id}")
        
        # Apply date filters if provided
        if start_date:
            try:
                start_date_obj = parse_date(start_date)
                if start_date_obj:
                    queryset = queryset.filter(state_in_date__date__gte=start_date_obj)
                    print(f"Applied start date filter: {start_date_obj}")
            except ValueError:
                print(f"Invalid start date format: {start_date}")
                pass
        
        if end_date:
            try:
                end_date_obj = parse_date(end_date)
                if end_date_obj:
                    queryset = queryset.filter(state_in_date__date__lte=end_date_obj)
                    print(f"Applied end date filter: {end_date_obj}")
            except ValueError:
                print(f"Invalid end date format: {end_date}")
                pass
        
        print(f"ToolViewSet final queryset count: {queryset.count()}")
        if queryset.count() > 0:
            print(f"Sample tool data: {queryset.first().__dict__}")
        
        return queryset


def equipment_statistics(request, equip_id):
    print(f"Equipment statistics called for equip_id: {equip_id}")
    print(f"Request method: {request.method}")
    print(f"Request GET params: {request.GET}")
    
    # Check if the equipment exists
    if not Tool.objects.filter(equip_id=equip_id).exists():
        print(f"Equipment {equip_id} not found")
        return JsonResponse({"error": "Equipment not found"}, status=404)

    # Get date filter parameters
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    print(f"Date filters - start_date: {start_date}, end_date: {end_date}")
    
    # Base queryset for unfiltered data (for trend charts)
    base_queryset = Tool.objects.filter(equip_id=equip_id)
    
    # Filtered queryset for cards and distribution chart
    filtered_queryset = base_queryset
    if start_date and start_date.strip():
        try:
            start_date_obj = parse_date(start_date)
            if start_date_obj:
                filtered_queryset = filtered_queryset.filter(state_in_date__date__gte=start_date_obj)
        except ValueError:
            pass
    
    if end_date and end_date.strip():
        try:
            end_date_obj = parse_date(end_date)
            if end_date_obj:
                filtered_queryset = filtered_queryset.filter(state_in_date__date__lte=end_date_obj)
        except ValueError:
            pass

    # --- Calculations for FILTERED data (cards, pie chart) ---
    distinct_events_filtered_qs = filtered_queryset.values(
        'state_in_date', 'error_name'
    ).distinct()
    
    error_name_counts_filtered = Counter(
        item['error_name'] for item in distinct_events_filtered_qs if item['error_name'] != 'Unknown'
    )
    most_common_error_name_tuple = error_name_counts_filtered.most_common(1)
    most_common_error_name = most_common_error_name_tuple[0][0] if most_common_error_name_tuple else None

    event_code_counts_filtered = Counter()
    for item in distinct_events_filtered_qs:
        if item['error_name'] != 'Unknown':
            matching_tool = filtered_queryset.filter(
                state_in_date=item['state_in_date'], error_name=item['error_name']
            ).first()
            if matching_tool and matching_tool.event_code != 'Unknown':
                event_code_counts_filtered[matching_tool.event_code] += 1
    most_common_event_code_tuple = event_code_counts_filtered.most_common(1)
    most_common_event_code = most_common_event_code_tuple[0][0] if most_common_event_code_tuple else None

    total_distinct_errors_filtered = distinct_events_filtered_qs.count()
    
    agg_data_filtered = filtered_queryset.aggregate(
        earliest_error_date=Min('state_in_date'),
        latest_error_date=Max('state_in_date'),
    )

    # Use FILTERED data for error notes (this affects the pie chart)
    error_notes_counts = {k: v for k, v in error_name_counts_filtered.items()}
    formatted_error_notes = {}
    for error_name, count in error_notes_counts.items():
        sample_tool = filtered_queryset.filter(error_name=error_name).first()
        if sample_tool:
            formatted_error_notes[error_name] = {
                'count': count,
                'description': sample_tool.error_description
            }

    # --- Calculations for UNFILTERED data (trend charts) ---
    distinct_events_unfiltered_qs = base_queryset.values(
        'state_in_date', 'error_name'
    ).distinct()

    error_frequency_dict = {}
    for item in distinct_events_unfiltered_qs:
        if item['error_name'] != 'Unknown':
            date_str = item['state_in_date'].strftime('%Y-%m-%d')
            if date_str not in error_frequency_dict:
                error_frequency_dict[date_str] = {'date': date_str, 'count': 0, 'errors': {}}
            
            error_name = item['error_name']
            if error_name not in error_frequency_dict[date_str]['errors']:
                error_frequency_dict[date_str]['errors'][error_name] = 0
            error_frequency_dict[date_str]['errors'][error_name] += 1
    
    formatted_error_frequency = []
    for date_str, data in error_frequency_dict.items():
        for error_name, count in data['errors'].items():
            formatted_error_frequency.append({
                'date': date_str,
                'error_name': error_name,
                'count': count
            })

    # --- Assemble the response ---
    data_response = {
        "total_errors": total_distinct_errors_filtered,
        "most_common_event_code": most_common_event_code,
        "most_common_error_name": most_common_error_name,
        "error_notes": formatted_error_notes,  # This now uses filtered data
        "error_frequency": formatted_error_frequency,  # This uses unfiltered data for trends
        **agg_data_filtered
    }
    
    if data_response['earliest_error_date']:
        data_response['earliest_error_date'] = data_response['earliest_error_date'].strftime('%Y-%m-%d %H:%M:%S')
    if data_response['latest_error_date']:
        data_response['latest_error_date'] = data_response['latest_error_date'].strftime('%Y-%m-%d %H:%M:%S')

    return JsonResponse(data_response)