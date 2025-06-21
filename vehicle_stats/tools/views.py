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
    
    # Build base queryset
    queryset = Tool.objects.filter(equip_id=equip_id)
    print(f"Base queryset count: {queryset.count()}")
    
    # Apply date filters if provided
    if start_date and start_date.strip():
        try:
            start_date_obj = parse_date(start_date)
            if start_date_obj:
                queryset = queryset.filter(state_in_date__date__gte=start_date_obj)
                print(f"Applied start date filter: {start_date_obj}")
        except ValueError:
            print(f"Invalid start date format: {start_date}")
            pass
    
    if end_date and end_date.strip():
        try:
            end_date_obj = parse_date(end_date)
            if end_date_obj:
                queryset = queryset.filter(state_in_date__date__lte=end_date_obj)
                print(f"Applied end date filter: {end_date_obj}")
        except ValueError:
            print(f"Invalid end date format: {end_date}")
            pass

    print(f"Final queryset count: {queryset.count()}")

    # Get the most common event code and error name
    most_common_event_code = (
        queryset
        .exclude(event_code='Unknown')
        .values('event_code')
        .annotate(count=Count('event_code'))
        .order_by('-count')
        .first()
    )

    most_common_error_name = (
        queryset
        .exclude(error_name='Unknown')
        .values('error_name')
        .annotate(count=Count('error_name'))
        .order_by('-count')
        .first()
    )

    print(f"Most common event code: {most_common_event_code}")
    print(f"Most common error name: {most_common_error_name}")

    # Aggregate general statistics
    data = queryset.aggregate(
        total_errors=Count('id'),
        earliest_error_date=Min('state_in_date'),
        latest_error_date=Max('state_in_date'),
    )

    # Format the dates as strings
    if data['earliest_error_date']:
        data['earliest_error_date'] = data['earliest_error_date'].strftime('%Y-%m-%d %H:%M:%S')
    if data['latest_error_date']:
        data['latest_error_date'] = data['latest_error_date'].strftime('%Y-%m-%d %H:%M:%S')

    print(f"Aggregated data: {data}")

    # Collect error notes grouped by error name
    error_notes = (
        queryset
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

    # Get error frequency data along with error names occurring on the same date
    error_frequency = (
        queryset
        .values('state_in_date', 'error_name')
        .annotate(count=Count('id'))
        .order_by('state_in_date')
    )

    # Format the error frequency to group by date
    formatted_error_frequency = []
    for item in error_frequency:
        date = item['state_in_date'].strftime('%Y-%m-%d')
        formatted_error_frequency.append({
            'date': date,
            'error_name': item['error_name'],
            'count': item['count']
        })

    # Add detailed statistics to the response
    data.update({
        "most_common_event_code": most_common_event_code['event_code'] if most_common_event_code else None,
        "most_common_error_name": most_common_error_name['error_name'] if most_common_error_name else None,
        "error_notes": formatted_error_notes,
        "error_frequency": formatted_error_frequency,
        "date_filter": {
            "start_date": start_date,
            "end_date": end_date,
            "applied": bool(start_date and start_date.strip() or end_date and end_date.strip())
        }
    })

    print(f"Response data keys: {list(data.keys())}")
    print(f"Error frequency count: {len(formatted_error_frequency)}")
    print(f"Error notes count: {len(formatted_error_notes)}")
    print(f"Final response - most_common_event_code: {data.get('most_common_event_code')}")
    print(f"Final response - most_common_error_name: {data.get('most_common_error_name')}")
    print(f"Final response - latest_error_date: {data.get('latest_error_date')}")

    return JsonResponse(data)

