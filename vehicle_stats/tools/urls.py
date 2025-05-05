from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ToolViewSet
from django.urls import path
from django.urls import path
from . import views

router = DefaultRouter()
router.register('tools', ToolViewSet)  # Register ToolViewSet with the router

urlpatterns = [
    path('', include(router.urls)),  # Include all router-generated URLs
    path('statistics/<str:equip_id>/', views.equipment_statistics, name='equipment_statistics'),
    
]
    

