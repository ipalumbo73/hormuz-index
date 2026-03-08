"""Tests for deduplication."""
import pytest
from app.services.dedupe.fingerprint import compute_fingerprint, time_bucket
from app.services.dedupe.clustering import find_cluster_match


def test_fingerprint_same_event():
    fp1 = compute_fingerprint("Iran IAEA verification gap", ["Iran", "IAEA"], ["Natanz"], "nuclear_verification_gap", "2026-03-06-B0")
    fp2 = compute_fingerprint("Iran IAEA verification gap", ["Iran", "IAEA"], ["Natanz"], "nuclear_verification_gap", "2026-03-06-B0")
    assert fp1 == fp2


def test_fingerprint_different_events():
    fp1 = compute_fingerprint("Iran IAEA verification gap", ["Iran"], ["Natanz"], "nuclear_verification_gap", "2026-03-06-B0")
    fp2 = compute_fingerprint("Hezbollah rocket attack", ["Hezbollah"], ["Lebanon"], "proxy_activity", "2026-03-06-B0")
    assert fp1 != fp2


def test_time_bucket():
    assert time_bucket("2026-03-06T03:00:00+00:00", 6) == "2026-03-06-B0"
    assert time_bucket("2026-03-06T08:00:00+00:00", 6) == "2026-03-06-B1"
    assert time_bucket("2026-03-06T15:00:00+00:00", 6) == "2026-03-06-B2"


def test_cluster_match_similar():
    clusters = [
        {"id": "1", "canonical_title": "IAEA cannot verify Iran enrichment suspension", "actor_tags": ["IAEA", "Iran"]},
        {"id": "2", "canonical_title": "Hezbollah fires rockets at Israel", "actor_tags": ["Hezbollah", "Israel"]},
    ]
    match = find_cluster_match("IAEA says it cannot verify Iran's enrichment suspension", ["IAEA", "Iran"], clusters)
    assert match is not None
    assert match["id"] == "1"


def test_cluster_no_match():
    clusters = [
        {"id": "1", "canonical_title": "Hezbollah fires rockets at Israel", "actor_tags": ["Hezbollah", "Israel"]},
    ]
    match = find_cluster_match("Weather forecast for Riyadh tomorrow", [], clusters)
    assert match is None
