import hashlib


def sha256_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def content_hash(url: str, title: str) -> str:
    return sha256_hash(f"{url}|{title}")
