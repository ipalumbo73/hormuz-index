"""Tests for event classifier."""
import pytest
from app.services.parsing.classifier import classify_event


def test_classify_nuclear_verification():
    result = classify_event(
        "IAEA says it cannot verify whether Iran suspended enrichment",
        "The agency said it could not verify suspension and lacked access."
    )
    assert result["category"] == "nuclear_verification_gap"
    assert result["confidence"] > 0.4


def test_classify_hormuz_threat():
    result = classify_event(
        "Iran threatens to close Strait of Hormuz",
        "Iranian navy warns of blocking the strait in response to sanctions."
    )
    assert result["category"] == "hormuz_threat"


def test_classify_proxy_activity():
    result = classify_event(
        "Hezbollah fires rockets at northern Israel",
        "Hezbollah launched attack from southern Lebanon."
    )
    assert result["category"] == "proxy_activity"


def test_classify_diplomatic():
    result = classify_event(
        "Oman mediates new talks between Iran and US",
        "Diplomatic channel resumed through Oman mediation."
    )
    assert result["category"] == "diplomatic_contact"


def test_classify_strategic_rhetoric():
    result = classify_event(
        "Iran warns of devastating consequences if red line crossed",
        "Senior official says all options on the table."
    )
    assert result["category"] == "strategic_rhetoric"


def test_classify_unclassified():
    result = classify_event(
        "Weather forecast for tomorrow",
        "Sunny skies expected across the region."
    )
    assert result["category"] == "unclassified"
    assert result["confidence"] < 0.5


def test_classify_enrichment():
    result = classify_event(
        "Iran enriches uranium to 60 percent purity",
        "New centrifuges enriching uranium to near weapons-grade levels."
    )
    assert result["category"] == "enrichment_signal"


def test_classify_military_strike():
    result = classify_event(
        "Israel launches airstrike on targets in Syria",
        "IDF confirms bombing of military installations."
    )
    assert result["category"] == "military_strike"
