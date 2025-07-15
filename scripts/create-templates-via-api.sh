#!/bin/bash

# First, we need to get an authentication token
# This script assumes you have a running local server and can authenticate

BASE_URL="http://localhost:3000"

# Template 1: Site Establishment
echo "Creating Site Establishment template..."
curl -X POST "$BASE_URL/api/itp/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Site Establishment",
    "description": "Basic site establishment and preparation inspection template",
    "category": "Site Works",
    "structure": {
      "sections": [
        {
          "id": "section-1",
          "title": "Site Setup",
          "description": "Initial site setup and preparation",
          "items": [
            {
              "id": "item-1",
              "type": "checkbox",
              "label": "Site boundaries marked and secured",
              "required": true
            },
            {
              "id": "item-2", 
              "type": "checkbox",
              "label": "Safety signage installed",
              "required": true
            },
            {
              "id": "item-3",
              "type": "textarea",
              "label": "Additional notes",
              "required": false
            }
          ]
        }
      ]
    }
  }'

echo -e "\n"

# Template 2: Concrete Works
echo "Creating Concrete Works template..."
curl -X POST "$BASE_URL/api/itp/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Concrete Works",
    "description": "Concrete placement and finishing inspection template",
    "category": "Structural",
    "structure": {
      "sections": [
        {
          "id": "section-1",
          "title": "Pre-Pour Inspection",
          "description": "Checks before concrete placement",
          "items": [
            {
              "id": "item-1",
              "type": "checkbox",
              "label": "Formwork checked and approved",
              "required": true
            },
            {
              "id": "item-2",
              "type": "checkbox", 
              "label": "Reinforcement in place and tied",
              "required": true
            },
            {
              "id": "item-3",
              "type": "number",
              "label": "Concrete temperature (°C)",
              "required": true,
              "min": 5,
              "max": 35
            }
          ]
        }
      ]
    }
  }'

echo -e "\n"

# Template 3: Earthworks
echo "Creating Earthworks template..."
curl -X POST "$BASE_URL/api/itp/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Earthworks",
    "description": "Earthworks and compaction inspection template",
    "category": "Earthworks",
    "structure": {
      "sections": [
        {
          "id": "section-1",
          "title": "Compaction Testing",
          "description": "Soil compaction verification",
          "items": [
            {
              "id": "item-1",
              "type": "number",
              "label": "Compaction percentage (%)",
              "required": true,
              "min": 90,
              "max": 100
            },
            {
              "id": "item-2",
              "type": "select",
              "label": "Test method",
              "required": true,
              "options": ["Sand replacement", "Nuclear densometer", "Core cutter"]
            },
            {
              "id": "item-3",
              "type": "checkbox",
              "label": "Moisture content within specification",
              "required": true
            }
          ]
        }
      ]
    }
  }'

echo -e "\nDone creating templates!"