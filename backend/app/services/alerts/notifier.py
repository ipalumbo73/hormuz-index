"""Multi-channel alert dispatcher."""
import httpx
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import structlog
from app.core.config import settings

logger = structlog.get_logger()

LEVEL_EMOJI = {"info": "\u2139\ufe0f", "warning": "\u26a0\ufe0f", "high": "\U0001f534", "critical": "\U0001f6a8"}


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

        # Email
        if settings.SMTP_HOST and settings.ALERT_EMAIL_TO:
            await _send_email(alert)


async def _send_telegram(alert: dict):
    emoji = LEVEL_EMOJI.get(alert["level"], "\U0001f4e2")
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
    emoji = LEVEL_EMOJI.get(alert["level"], "\U0001f4e2")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(settings.SLACK_WEBHOOK_URL, json={
                "text": f"{emoji} *{alert['title']}*\n{alert['message']}",
            })
    except Exception as e:
        logger.error("slack_send_error", error=str(e))


async def _send_email(alert: dict):
    """Send alert via SMTP email."""
    emoji = LEVEL_EMOJI.get(alert["level"], "\U0001f4e2")
    subject = f"{emoji} Hormuz Index Alert [{alert['level'].upper()}]: {alert['title']}"

    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 8px;">
            <h2 style="margin: 0 0 8px 0; color: {'#ef4444' if alert['level'] in ('high', 'critical') else '#f59e0b'};">
                {emoji} {alert['title']}
            </h2>
            <p style="margin: 0 0 16px 0; color: #94a3b8;">{alert['message']}</p>
            <div style="font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 12px;">
                Level: <strong>{alert['level'].upper()}</strong> &middot;
                Hormuz Index Early Warning System
            </div>
        </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_USER or f"hormuz-index@{settings.SMTP_HOST}"
    msg["To"] = settings.ALERT_EMAIL_TO
    msg.attach(MIMEText(alert["message"], "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], [settings.ALERT_EMAIL_TO], msg.as_string())
        logger.info("email_sent", to=settings.ALERT_EMAIL_TO, level=alert["level"])
    except Exception as e:
        logger.error("email_send_error", error=str(e))
