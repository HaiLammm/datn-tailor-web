"""Email service for sending OTP verification emails.

Story 1.2: Đăng ký Tài khoản Khách hàng & Xác thực OTP
Uses aiosmtplib for async SMTP email sending with Heritage branding.
"""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from src.core.config import settings

logger = logging.getLogger(__name__)


def create_otp_email_html(full_name: str, otp_code: str) -> str:
    """Create HTML email template with Heritage branding.
    
    Args:
        full_name: User's full name
        otp_code: 6-digit OTP code
        
    Returns:
        str: HTML email content
    """
    return f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác thực tài khoản Tailor Project</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header with Indigo background -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; text-align: center;">
                                Tailor Project
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px; text-align: center;">
                                Hệ thống May Đo Thông Minh
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; color: #312e81; font-size: 16px;">
                                Xin chào <strong>{full_name}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                Cảm ơn bạn đã đăng ký tài khoản tại <strong>Tailor Project</strong>. 
                                Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã OTP bên dưới:
                            </p>
                            
                            <!-- OTP Code Box with Amber accent -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <div style="display: inline-block; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px 40px; border-radius: 8px; border: 2px solid #f59e0b;">
                                            <p style="margin: 0; color: #78350f; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                                Mã OTP của bạn
                                            </p>
                                            <p style="margin: 10px 0 0 0; color: #78350f; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                                {otp_code}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                <strong>Lưu ý quan trọng:</strong>
                            </p>
                            <ul style="margin: 0 0 20px 20px; padding: 0; color: #4b5563; font-size: 14px; line-height: 1.8;">
                                <li>Mã OTP này có hiệu lực trong <strong>{settings.OTP_EXPIRY_MINUTES} phút</strong></li>
                                <li>Mã chỉ có thể sử dụng <strong>một lần duy nhất</strong></li>
                                <li>Không chia sẻ mã này với bất kỳ ai</li>
                            </ul>
                            
                            <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; text-align: center;">
                                © 2026 Tailor Project - Hệ thống May Đo Thông Minh
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                                Email tự động - Vui lòng không trả lời email này
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """.strip()


async def send_otp_email(email: str, full_name: str, otp_code: str) -> bool:
    """Send OTP verification email to user.
    
    Args:
        email: Recipient email address
        full_name: User's full name for personalization
        otp_code: 6-digit OTP code
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Xác thực tài khoản Tailor Project - Mã OTP của bạn"
        message["From"] = settings.FROM_EMAIL
        message["To"] = email
        
        # Plain text fallback
        text_content = f"""
Xin chào {full_name},

Cảm ơn bạn đã đăng ký tài khoản tại Tailor Project.

Mã OTP của bạn là: {otp_code}

Mã này có hiệu lực trong {settings.OTP_EXPIRY_MINUTES} phút và chỉ có thể sử dụng một lần duy nhất.

Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.

---
Tailor Project - Hệ thống May Đo Thông Minh
© 2026
        """.strip()
        
        # HTML content with Heritage branding
        html_content = create_otp_email_html(full_name, otp_code)
        
        # Attach both parts
        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part1)
        message.attach(part2)
        
        # Send email via SMTP
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        
        logger.info(f"OTP email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {e}")
        return False
