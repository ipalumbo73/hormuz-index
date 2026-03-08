"""Tests for entity extraction."""
import pytest
from app.services.parsing.entity_extractor import extract_entities


def test_extract_iran_actors():
    result = extract_entities("Iran's IRGC commander met with Khamenei in Tehran")
    assert "Iran" in result["actor_tags"]
    assert "Tehran" in result["location_tags"]


def test_extract_israel_actors():
    result = extract_entities("IDF forces deployed near the Lebanon border after Netanyahu's statement")
    assert "Israel" in result["actor_tags"]
    assert "Lebanon border" in result["location_tags"]


def test_extract_us_actors():
    result = extract_entities("Pentagon confirms CENTCOM operations in the Gulf")
    assert "United States" in result["actor_tags"]


def test_extract_proxy_actors():
    result = extract_entities("Hezbollah and Houthi forces coordinate attacks in Red Sea")
    assert "Hezbollah" in result["actor_tags"]
    assert "Houthis" in result["actor_tags"]
    assert "Red Sea" in result["location_tags"]


def test_extract_nuclear_locations():
    result = extract_entities("IAEA inspectors denied access to Natanz and Fordow facilities")
    assert "Natanz" in result["location_tags"]
    assert "Fordow" in result["location_tags"]
    assert "IAEA" in result["actor_tags"]


def test_extract_no_entities():
    result = extract_entities("The weather is nice today")
    assert result["actor_tags"] == []
    assert result["location_tags"] == []
