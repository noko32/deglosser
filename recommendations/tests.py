from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

class RecommendationTests(APITestCase):
    def test_harmonic_recommendations_success(self):
        """
        Ensure we can calculate harmonic matches for a valid BPM and Key.
        """
        url = reverse('harmonic_recommendations')
        response = self.client.get(url, {'bpm': '120.0', 'key': '8A'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['input']['bpm'], 120.0)
        self.assertEqual(response.data['input']['key'], '8A')
        
        # 8A compatible keys: 8A, 7A, 9A, 8B
        expected_keys = ['8A', '7A', '9A', '8B']
        self.assertEqual(response.data['matching_criteria']['compatible_keys'], expected_keys)
        
        # BPM range: 120 * 0.95 = 114.0, 120 * 1.05 = 126.0
        self.assertEqual(response.data['matching_criteria']['bpm_range']['min'], 114.0)
        self.assertEqual(response.data['matching_criteria']['bpm_range']['max'], 126.0)

    def test_harmonic_recommendations_missing_params(self):
        """
        Ensure missing parameters return a 400 Bad Request.
        """
        url = reverse('harmonic_recommendations')
        response = self.client.get(url, {'bpm': '120.0'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_harmonic_recommendations_invalid_key(self):
        """
        Ensure invalid key format returns a 400 Bad Request.
        """
        url = reverse('harmonic_recommendations')
        response = self.client.get(url, {'bpm': '120.0', 'key': 'invalid'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
