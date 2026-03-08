"""Multi-channel alert dispatcher."""
import httpx
import structlog
from app.core.config import settings

logger = structlog.get_logger()

async def dispatch_alerts(alerts: list[dict]):
    """Send alerts to configured channels."""
    for alert in alerts:
        # Always log
        logger.info("alert_dispatched", level=alert["level"], title=alert["title"])

        # Telegram
        if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID:
            await _send_telegram(alert)

        # Slack
        if settings.SLACK_WEBHOOK_URL:
            await _send_slack(alert)


async def _send_telegram(alert: dict):
    level_emoji = {"info": "\u2139\ufe0f", "warning": "\u26a0\ufe0f", "high": "\U0001f534", "critical": "\U0001f6a8"}
    emoji = level_emoji.get(alert["level"], "\U0001f4e2")
    text = f"{emoji} *{alert['title']}*\n{alert['message']}"

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json={
                "chat_id": settings.TELEGRAM_CHAT_ID,
                "text": text,
                "parse_mode": "Markdown",
            })
    except Exception as e:
        logger.error("telegram_send_error", error=str(e))


async def _send_slack(alert: dict):
    level_emoji = {"info": "\u2139\ufe0f", "warning": "\u26a0\ufe0f", "high": "\U0001f534", "critical": "\U0001f6a8"}
    emoji = level_emoji.get(alert["level"], "\U0001f4e2")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(settings.SLACK_WEBHOOK_URL, json={
                "text": f"{emoji} *{alert['title']}*\n{alert['message']}",
            })
    except Exception as e:
        logger.error("slack_send_error", error=str(e))
