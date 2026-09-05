import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def _build_booking_confirmation_html(booking_reference: str, flight_number: str, 
                                      origin: str, destination: str,
                                      departure_at: str, seat_class: str,
                                      fare_type: str, total_amount: str,
                                      currency: str, passenger_names: list[str]) -> str:
    passengers_html = "".join(f"<li>{name}</li>" for name in passenger_names)
    return f"""
    <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1a73e8;">✈ Booking Confirmed!</h2>
    <p>Your booking has been confirmed. Here are your details:</p>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Booking Reference</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{booking_reference}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Flight</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{flight_number}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Route</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{origin} → {destination}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Departure</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{departure_at}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Class</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{seat_class} ({fare_type})</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Amount</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{currency} {total_amount}</td></tr>
    </table>
    <h4>Passengers:</h4>
    <ul>{passengers_html}</ul>
    <p style="color: #666; font-size: 12px;">Please keep your booking reference safe. This is your ticket.</p>
    </body></html>
    """

def _build_cancellation_html(booking_reference: str, refund_type: str,
                              refund_amount: str, currency: str,
                              credit_expires_at: Optional[str] = None) -> str:
    refund_info = ""
    if refund_type == "CASH":
        refund_info = f"<p><strong>Refund Amount:</strong> {currency} {refund_amount}</p><p>Your refund will be processed within 5-7 business days.</p>"
    elif refund_type == "TRAVEL_CREDIT":
        refund_info = f"<p><strong>Travel Credit:</strong> {currency} {refund_amount}</p><p>Credit expires: {credit_expires_at or 'N/A'}</p>"
    else:
        refund_info = "<p>This booking was non-refundable. No refund will be issued.</p>"
    
    return f"""
    <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #d93025;">Booking Cancelled</h2>
    <p>Your booking <strong>{booking_reference}</strong> has been cancelled.</p>
    {refund_info}
    <p style="color: #666; font-size: 12px;">Contact support if you have questions.</p>
    </body></html>
    """

def _send_smtp(to_email: str, subject: str, html_body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))
    
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, to_email, msg.as_string())

def _send_gmail_api(to_email: str, subject: str, html_body: str) -> None:
    """Send via Gmail API using service account."""
    import base64
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    
    SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
    creds = service_account.Credentials.from_service_account_file(
        settings.gmail_service_account_file, scopes=SCOPES
    ).with_subject(settings.gmail_sender_email)
    
    service = build("gmail", "v1", credentials=creds)
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.gmail_sender_email
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))
    
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    service.users().messages().send(userId="me", body={"raw": raw}).execute()

def _send_email(to_email: str, subject: str, html_body: str) -> None:
    try:
        if settings.email_provider == "gmail_api":
            _send_gmail_api(to_email, subject, html_body)
        else:
            _send_smtp(to_email, subject, html_body)
        logger.info(f"Email sent to {to_email}: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        # Don't raise — email failure should not fail the booking transaction

async def send_booking_confirmation(
    to_email: str,
    booking_reference: str,
    flight_number: str,
    origin: str,
    destination: str,
    departure_at: str,
    seat_class: str,
    fare_type: str,
    total_amount: str,
    currency: str,
    passenger_names: list[str]
) -> None:
    html = _build_booking_confirmation_html(
        booking_reference, flight_number, origin, destination,
        departure_at, seat_class, fare_type, total_amount, currency, passenger_names
    )
    _send_email(to_email, f"Booking Confirmed — {booking_reference}", html)

async def send_cancellation_receipt(
    to_email: str,
    booking_reference: str,
    refund_type: str,
    refund_amount: str,
    currency: str,
    credit_expires_at: Optional[str] = None
) -> None:
    html = _build_cancellation_html(booking_reference, refund_type, refund_amount, currency, credit_expires_at)
    _send_email(to_email, f"Booking Cancelled — {booking_reference}", html)
