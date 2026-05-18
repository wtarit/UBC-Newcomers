import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings


async def send_otp_email(to_email: str, otp_code: str) -> bool:
    msg = MIMEMultipart("alternative")
    msg["From"] = settings.smtp_sender_email
    msg["To"] = to_email
    msg["Subject"] = f"Your UBC Newcomers verification code: {otp_code}"

    text = f"Your verification code is: {otp_code}\n\nThis code expires in {settings.otp_expiry_minutes} minutes."
    html = f"""\
<html>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
  <h2 style="color: #007AFF; margin-bottom: 8px;">UBC Newcomers</h2>
  <p style="color: #333; font-size: 16px;">Your verification code is:</p>
  <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007AFF;">{otp_code}</span>
  </div>
  <p style="color: #666; font-size: 14px;">This code expires in {settings.otp_expiry_minutes} minutes.</p>
  <p style="color: #999; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
</body>
</html>"""

    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
            start_tls=True,
        )
        return True
    except aiosmtplib.SMTPException:
        return False
