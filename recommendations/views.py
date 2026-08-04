from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import re

def get_compatible_camelot_keys(key):
    """
    Calculates compatible Camelot keys based on the Camelot Wheel.
    Compatible keys are:
    - Same key (e.g., 8A)
    - Adjacent keys (e.g., 7A, 9A)
    - Relative major/minor (e.g., 8B)
    """
    match = re.match(r'^(\d+)([AB])$', key.upper())
    if not match:
        return [key]
    
    number = int(match.group(1))
    letter = match.group(2)
    
    # Adjacent numbers on the 1-12 wheel
    prev_number = 12 if number == 1 else number - 1
    next_number = 1 if number == 12 else number + 1
    
    # Opposite letter (A <-> B)
    opposite_letter = 'B' if letter == 'A' else 'A'
    
    compatible = [
        f"{number}{letter}",                  # Same key
        f"{prev_number}{letter}",             # -1 step
        f"{next_number}{letter}",             # +1 step
        f"{number}{opposite_letter}"          # Mode shift (relative major/minor)
    ]
    return compatible

@api_view(['GET'])
def harmonic_recommendations(request):
    """
    Calculates harmonic compatibility matching for a given BPM and Camelot Key.
    Query parameters:
    - bpm: float (e.g., 120.0)
    - key: string (e.g., '8A')
    """
    bpm_param = request.query_params.get('bpm')
    key_param = request.query_params.get('key')
    
    if not bpm_param or not key_param:
        return Response(
            {"error": "Both 'bpm' and 'key' query parameters are required."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    try:
        bpm = float(bpm_param)
    except ValueError:
        return Response(
            {"error": "Invalid 'bpm' parameter. Must be a number."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    # Standardize key format (e.g., '8a' -> '8A')
    key = key_param.upper().strip()
    if not re.match(r'^\d+[AB]$', key):
        return Response(
            {"error": "Invalid Camelot Key format. Expected format like '8A' or '11B'."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    # Calculate harmonic matches
    compatible_keys = get_compatible_camelot_keys(key)
    
    # Calculate BPM range (standard ±5% for smooth transitions)
    min_bpm = round(bpm * 0.95, 2)
    max_bpm = round(bpm * 1.05, 2)
    
    # Return structured recommendation parameters
    return Response({
        "status": "success",
        "input": {
            "bpm": bpm,
            "key": key
        },
        "matching_criteria": {
            "compatible_keys": compatible_keys,
            "bpm_range": {
                "min": min_bpm,
                "max": max_bpm
            },
            "tolerance_percentage": 5.0
        },
        "harmonic_match_formula": "Camelot Wheel ±1 step or relative major/minor mode shift",
        "recommendation_engine": "Melomano Analytics Engine v1.0 (Django REST Framework)"
    })
