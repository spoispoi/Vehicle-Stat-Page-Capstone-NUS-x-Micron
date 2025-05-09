from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status
from datetime import datetime, timedelta
from tools.models import Tool
from django.utils import timezone
import json

class ToolViewTests(TestCase):
    def setUp(self):
        """Set up test data before each test method"""
        self.client = Client()
        self.tools_url = reverse('tool-list')
        
        # Create test data
        self.equip_id = "TEST-EQUIP-001"
        self.test_date = timezone.now()
        
        # Create multiple tools for testing
        self.tool1 = Tool.objects.create(
            equip_id=self.equip_id,
            state_in_date=self.test_date,
            event_code="E001",
            error_name="Test Error 1",
            error_description="First test error description"
        )
        
        self.tool2 = Tool.objects.create(
            equip_id=self.equip_id,
            state_in_date=self.test_date + timedelta(hours=1),
            event_code="E001",  # Same event code to test frequency
            error_name="Test Error 1",
            error_description="Second test error description"
        )
        
        self.tool3 = Tool.objects.create(
            equip_id=self.equip_id,
            state_in_date=self.test_date + timedelta(hours=2),
            event_code="E002",
            error_name="Test Error 2",
            error_description="Third test error description"
        )

    def test_get_tools_list(self):
        """Test that we can get the list of tools"""
        response = self.client.get(self.tools_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertIsInstance(response.json(), list)
        
        # Check if all created tools are in the response
        data = response.json()
        self.assertEqual(len(data), 3)
        
        # Verify tool data
        tool_data = data[0]
        self.assertIn('equip_id', tool_data)
        self.assertIn('state_in_date', tool_data)
        self.assertIn('event_code', tool_data)
        self.assertIn('error_name', tool_data)
        self.assertIn('error_description', tool_data)

    def test_filter_tools_by_equip_id(self):
        """Test filtering tools by equipment ID"""
        response = self.client.get(f"{self.tools_url}?equip_id={self.equip_id}")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 3)
        
        # Verify all returned tools have the correct equip_id
        for tool in data:
            self.assertEqual(tool['equip_id'], self.equip_id)

    def test_equipment_statistics(self):
        """Test equipment statistics endpoint"""
        # Updated URL to include api/ prefix
        response = self.client.get(f"/api/statistics/{self.equip_id}/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Check basic statistics
        self.assertEqual(data['total_errors'], 3)
        self.assertIn('earliest_error_date', data)
        self.assertIn('latest_error_date', data)
        
        # Check most common errors
        self.assertEqual(data['most_common_event_code'], 'E001')
        self.assertEqual(data['most_common_error_name'], 'Test Error 1')
        
        # Check error notes
        self.assertIn('error_notes', data)
        error_notes = data['error_notes']
        self.assertIn('Test Error 1', error_notes)
        self.assertIn('Test Error 2', error_notes)
        
        # Check error frequency
        self.assertIn('error_frequency', data)
        error_frequency = data['error_frequency']
        self.assertTrue(len(error_frequency) > 0)
        
        # Verify error frequency data structure
        frequency_item = error_frequency[0]
        self.assertIn('date', frequency_item)
        self.assertIn('error_name', frequency_item)
        self.assertIn('count', frequency_item)

    def test_nonexistent_equipment(self):
        """Test statistics for non-existent equipment"""
        # Updated URL to include api/ prefix
        response = self.client.get("/api/statistics/NONEXISTENT/")
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Check if response is JSON
        self.assertEqual(response['Content-Type'], 'application/json')
        data = response.json()
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Equipment not found')

    def test_tool_creation(self):
        """Test creating a new tool"""
        new_tool_data = {
            'equip_id': 'NEW-EQUIP-001',
            'state_in_date': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            'event_code': 'E003',
            'error_name': 'New Test Error',
            'error_description': 'New test error description'
        }
        
        response = self.client.post(
            self.tools_url, 
            json.dumps(new_tool_data),  # Convert to JSON string
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        
        # Verify created tool data
        self.assertEqual(data['equip_id'], new_tool_data['equip_id'])
        self.assertEqual(data['event_code'], new_tool_data['event_code'])
        self.assertEqual(data['error_name'], new_tool_data['error_name'])
        self.assertEqual(data['error_description'], new_tool_data['error_description'])

    def test_tool_update(self):
        """Test updating an existing tool"""
        update_data = {
            'error_description': 'Updated error description'
        }
        
        response = self.client.patch(
            f"{self.tools_url}{self.tool1.id}/",
            json.dumps(update_data),  # Convert to JSON string
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['error_description'], update_data['error_description'])

    def test_tool_deletion(self):
        """Test deleting a tool"""
        response = self.client.delete(f"{self.tools_url}{self.tool1.id}/")
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify tool is deleted
        response = self.client.get(f"{self.tools_url}{self.tool1.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) 