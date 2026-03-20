"""Email service for sending verification and notification emails.

Story 1.2: Đăng ký Tài khoản Khách hàng & Xác thực OTP
Story 5.4: Thong bao nhac nho tra do tu dong (Automatic Return Reminders)
Uses aiosmtplib for async SMTP email sending with Heritage branding.
"""

import logging
from datetime import date
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


def create_reset_password_email_html(full_name: str, otp_code: str) -> str:
    """Create HTML email template for password recovery with Heritage branding.
    
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
    <title>Khôi phục mật khẩu Tailor Project</title>
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
                                Khôi phục mật khẩu
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
                                Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản tại <strong>Tailor Project</strong>. 
                                Vui lòng sử dụng mã OTP bên dưới để đặt lại mật khẩu của mình:
                            </p>
                            
                            <!-- OTP Code Box with Amber accent -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <div style="display: inline-block; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px 40px; border-radius: 8px; border: 2px solid #f59e0b;">
                                            <p style="margin: 0; color: #78350f; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                                Mã khôi phục của bạn
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
                                <li>Mã này có hiệu lực trong <strong>{settings.OTP_EXPIRY_MINUTES} phút</strong></li>
                                <li>Nếu bạn không yêu cầu điều này, tài khoản của bạn vẫn an toàn và bạn có thể bỏ qua email này</li>
                                <li>Không chia sẻ mã này với bất kỳ ai</li>
                            </ul>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; text-align: center;">
                                © 2026 Tailor Project - Hệ thống May Đo Thông Minh
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


async def send_reset_password_email(email: str, full_name: str, otp_code: str) -> bool:
    """Send password recovery OTP email to user.
    
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
        message["Subject"] = f"Khôi phục mật khẩu Tailor Project - Mã OTP của bạn"
        message["From"] = settings.FROM_EMAIL
        message["To"] = email
        
        # Plain text fallback
        text_content = f"""
Xin chào {full_name},

Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản tại Tailor Project.

Mã khôi phục của bạn là: {otp_code}

Mã này có hiệu lực trong {settings.OTP_EXPIRY_MINUTES} phút.

Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.

---
Tailor Project - Hệ thống May Đo Thông Minh
© 2026
        """.strip()
        
        # HTML content with Heritage branding
        html_content = create_reset_password_email_html(full_name, otp_code)
        
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
        
        logger.info(f"Reset password email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send reset password email to {email}: {e}")
        return False


async def send_account_invitation_email(email: str, customer_name: str) -> bool:
    """Send account invitation email to customer.

    Args:
        email: Customer email address
        customer_name: Customer's full name

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Lời mời kích hoạt tài khoản Tailor Project"
        message["From"] = settings.FROM_EMAIL
        message["To"] = email

        # Plain text fallback
        text_content = f"""
Xin chào {customer_name},

Chúng tôi đã tạo một tài khoản cho bạn tại Tailor Project.

Để kích hoạt tài khoản và đăng nhập, vui lòng truy cập:
{settings.NEXTAUTH_URL}/activate-account

Bạn sẽ cần sử dụng email này ({email}) và thiết lập mật khẩu mới.

Trân trọng,
Tailor Project Team
        """.strip()

        # HTML content
        html_content = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lời mời kích hoạt tài khoản</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 30px 40px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; text-align: center;">
                                Tailor Project
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px; text-align: center;">
                                Lời mời kích hoạt tài khoản
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; color: #312e81; font-size: 16px;">
                                Xin chào <strong>{customer_name}</strong>,
                            </p>
                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                Chúng tôi đã tạo một tài khoản cho bạn tại <strong>Tailor Project</strong>. 
                                Bạn có thể kích hoạt tài khoản để:
                            </p>
                            <ul style="margin: 0 0 20px 20px; padding: 0; color: #4b5563; font-size: 14px; line-height: 1.8;">
                                <li>Xem lịch sử đơn hàng và thiết kế của bạn</li>
                                <li>Quản lý thông tin cá nhân và số đo</li>
                                <li>Theo dõi tiến độ đơn hàng trực tuyến</li>
                            </ul>
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{settings.NEXTAUTH_URL}/activate-account" 
                                           style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                            Kích hoạt tài khoản
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                Email đăng nhập: <strong>{email}</strong>
                            </p>
                            <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 13px;">
                                Bạn sẽ cần thiết lập mật khẩu mới khi kích hoạt.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; text-align: center;">
                                © 2026 Tailor Project - Hệ thống May Đo Thông Minh
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

        # Attach both parts
        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part1)
        message.attach(part2)

        # Send email
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )

        logger.info(f"Account invitation email sent successfully to {email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send invitation email to {email}: {e}")
        return False


def create_return_reminder_email_html(
    renter_name: str,
    garment_name: str,
    return_date: date,
    shop_address: str,
) -> str:
    """Create HTML email template for return reminder with Heritage branding.

    Story 5.4: Automatic Return Reminders (AC #1).

    Args:
        renter_name: Renter's full name
        garment_name: Name of the rented garment
        return_date: Expected return date
        shop_address: Shop address for return

    Returns:
        str: HTML email content
    """
    formatted_date = return_date.strftime("%d/%m/%Y")
    shop_address_display = shop_address if shop_address else "Vui lòng liên hệ tiệm để biết địa chỉ"

    return f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nhắc nhở trả đồ - Tailor Project</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header with Heritage Indigo background -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px; background: linear-gradient(135deg, #1A2B4C 0%, #2d3f65 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #F9F7F2; font-size: 28px; font-weight: 600; text-align: center; font-family: 'Cormorant Garamond', Georgia, serif;">
                                Tailor Project
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #D4AF37; font-size: 14px; text-align: center;">
                                Nhắc nhở trả đồ thuê
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; color: #1A2B4C; font-size: 16px;">
                                Xin chào <strong>{renter_name}</strong>,
                            </p>

                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                Đây là thư nhắc nhở rằng thời hạn trả đồ thuê của bạn sắp đến.
                                Vui lòng trả đồ đúng hạn để tránh phát sinh phí trễ hạn.
                            </p>

                            <!-- Garment Info Box with Heritage Gold accent -->
                            <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 20px 30px; border-radius: 8px; border: 2px solid #D4AF37;">
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="margin: 0; color: #78350f; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                                        Tên bộ đồ
                                                    </p>
                                                    <p style="margin: 4px 0 0 0; color: #1A2B4C; font-size: 18px; font-weight: 700; font-family: 'Cormorant Garamond', Georgia, serif;">
                                                        {garment_name}
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-top: 1px solid #D4AF37;">
                                                    <p style="margin: 0; color: #78350f; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                                        Thời hạn trả đồ
                                                    </p>
                                                    <p style="margin: 4px 0 0 0; color: #1A2B4C; font-size: 18px; font-weight: 700;">
                                                        {formatted_date}
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-top: 1px solid #D4AF37;">
                                                    <p style="margin: 0; color: #78350f; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                                        Địa chỉ trả đồ
                                                    </p>
                                                    <p style="margin: 4px 0 0 0; color: #1A2B4C; font-size: 16px; font-weight: 600;">
                                                        {shop_address_display}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                                Nếu bạn đã trả đồ, vui lòng bỏ qua email này.
                                Mọi thắc mắc xin liên hệ tiệm để được hỗ trợ.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #F9F7F2; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; text-align: center;">
                                &copy; 2026 Tailor Project - Hệ thống May Đo Thông Minh
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


async def send_return_reminder_email(
    email: str,
    renter_name: str,
    garment_name: str,
    return_date: date,
    shop_address: str,
) -> bool:
    """Send return reminder email to renter.

    Story 5.4: AC #1 - Automatic return reminder email.
    Reuses existing SMTP sending pattern from send_otp_email.

    Args:
        email: Renter's email address
        renter_name: Renter's full name
        garment_name: Name of the rented garment
        return_date: Expected return date
        shop_address: Shop address for return

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        formatted_date = return_date.strftime("%d/%m/%Y")

        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Nhắc nhở trả đồ: {garment_name} - Hạn {formatted_date}"
        message["From"] = settings.FROM_EMAIL
        message["To"] = email

        # Plain text fallback
        shop_addr_text = shop_address if shop_address else "Vui lòng liên hệ tiệm"
        text_content = f"""
Xin chào {renter_name},

Đây là thư nhắc nhở rằng thời hạn trả đồ thuê của bạn sắp đến.

Tên bộ đồ: {garment_name}
Thời hạn trả đồ: {formatted_date}
Địa chỉ trả đồ: {shop_addr_text}

Vui lòng trả đồ đúng hạn để tránh phát sinh phí trễ hạn.

Nếu bạn đã trả đồ, vui lòng bỏ qua email này.

---
Tailor Project - Hệ thống May Đo Thông Minh
© 2026
        """.strip()

        # HTML content with Heritage branding
        html_content = create_return_reminder_email_html(
            renter_name, garment_name, return_date, shop_address
        )

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

        logger.info(f"Return reminder email sent successfully to {email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send return reminder email to {email}: {e}")
        return False


# ---------------------------------------------------------------------------
# Story 3.4: Booking Confirmation & Reminder Emails
# ---------------------------------------------------------------------------

def _slot_label(slot: str) -> str:
    """Convert slot key to Vietnamese display label."""
    return "Buổi Sáng (9:00 - 12:00)" if slot == "morning" else "Buổi Chiều (13:00 - 17:00)"


async def send_booking_confirmation_email(
    email: str,
    customer_name: str,
    appointment_date: "date",
    slot: str,
) -> bool:
    """Send booking confirmation email to customer after successful appointment creation.

    Story 3.4 AC #4-5 — FR44: Send Booking Confirmation (Email).

    Args:
        email: Customer email address
        customer_name: Customer's full name
        appointment_date: The booked appointment date
        slot: 'morning' or 'afternoon'

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        formatted_date = appointment_date.strftime("%d/%m/%Y")
        slot_display = _slot_label(slot)

        message = MIMEMultipart("alternative")
        message["Subject"] = f"Xác nhận đặt lịch tư vấn - {formatted_date} {slot_display}"
        message["From"] = settings.FROM_EMAIL
        message["To"] = email

        text_content = f"""
Xin chào {customer_name},

Chúng tôi xác nhận đã nhận được yêu cầu đặt lịch tư vấn Bespoke của bạn.

Ngày hẹn: {formatted_date}
Khung giờ: {slot_display}
Địa chỉ tiệm: {settings.SHOP_ADDRESS or "Vui lòng liên hệ tiệm để biết địa chỉ"}

Chúng tôi sẽ liên hệ xác nhận lịch hẹn trong thời gian sớm nhất.
Nếu cần thay đổi, vui lòng liên hệ tiệm trước 24 giờ.

Trân trọng,
Tailor Project Team
        """.strip()

        html_content = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Xác nhận đặt lịch</title>
</head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background-color:#F9F7F2;">
    <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr>
            <td align="center" style="padding:40px 0;">
                <table role="presentation" style="width:600px;border-collapse:collapse;background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding:40px 40px 30px 40px;background:linear-gradient(135deg,#1A2B4C 0%,#2d4a7a 100%);border-radius:8px 8px 0 0;">
                            <h1 style="margin:0;color:#D4AF37;font-size:28px;font-weight:600;text-align:center;">Tailor Project</h1>
                            <p style="margin:10px 0 0 0;color:#e0e7ff;font-size:14px;text-align:center;">Xác nhận đặt lịch tư vấn Bespoke</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px;">
                            <p style="margin:0 0 20px 0;color:#1A1A2E;font-size:16px;">Xin chào <strong>{customer_name}</strong>,</p>
                            <p style="margin:0 0 20px 0;color:#4b5563;font-size:15px;line-height:1.6;">
                                Chúng tôi xác nhận đã nhận được yêu cầu đặt lịch tư vấn Bespoke của bạn.
                            </p>
                            <table role="presentation" style="width:100%;border-collapse:collapse;background:#F9F7F2;border-radius:6px;padding:20px;margin:20px 0;">
                                <tr><td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;">
                                    <span style="color:#6B7280;font-size:13px;">Ngày hẹn</span><br>
                                    <strong style="color:#1A1A2E;font-size:16px;">{formatted_date}</strong>
                                </td></tr>
                                <tr><td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;">
                                    <span style="color:#6B7280;font-size:13px;">Khung giờ</span><br>
                                    <strong style="color:#1A1A2E;font-size:16px;">{slot_display}</strong>
                                </td></tr>
                                <tr><td style="padding:12px 20px;">
                                    <span style="color:#6B7280;font-size:13px;">Địa chỉ tiệm</span><br>
                                    <strong style="color:#1A1A2E;font-size:15px;">{settings.SHOP_ADDRESS or "Liên hệ tiệm để biết địa chỉ"}</strong>
                                </td></tr>
                            </table>
                            <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">
                                Chúng tôi sẽ liên hệ xác nhận lịch hẹn. Nếu cần thay đổi, vui lòng liên hệ trước 24 giờ.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px 40px;background-color:#F9F7F2;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;color:#6b7280;font-size:13px;text-align:center;">
                                &copy; 2026 Tailor Project - Hệ thống May Đo Thông Minh
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

        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part1)
        message.attach(part2)

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )

        logger.info("Booking confirmation email sent to %s", email)
        return True

    except Exception as e:
        logger.error("Failed to send booking confirmation email to %s: %s", email, e)
        return False


async def send_booking_reminder_email(
    email: str,
    customer_name: str,
    appointment_date: "date",
    slot: str,
) -> bool:
    """Send 1-day-before reminder email for upcoming appointment.

    Story 3.4 AC #6 — FR44: Automated booking reminder.

    Args:
        email: Customer email address
        customer_name: Customer's full name
        appointment_date: The appointment date (tomorrow)
        slot: 'morning' or 'afternoon'

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        formatted_date = appointment_date.strftime("%d/%m/%Y")
        slot_display = _slot_label(slot)

        message = MIMEMultipart("alternative")
        message["Subject"] = f"Nhắc nhở lịch hẹn ngày mai - {formatted_date}"
        message["From"] = settings.FROM_EMAIL
        message["To"] = email

        text_content = f"""
Xin chào {customer_name},

Đây là thư nhắc nhở lịch hẹn tư vấn Bespoke vào ngày mai.

Ngày hẹn: {formatted_date}
Khung giờ: {slot_display}
Địa chỉ tiệm: {settings.SHOP_ADDRESS or "Vui lòng liên hệ tiệm để biết địa chỉ"}

Chúng tôi mong được gặp bạn. Nếu có sự cố, vui lòng liên hệ tiệm sớm.

Trân trọng,
Tailor Project Team
        """.strip()

        html_content = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Nhắc nhở lịch hẹn</title>
</head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background-color:#F9F7F2;">
    <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr>
            <td align="center" style="padding:40px 0;">
                <table role="presentation" style="width:600px;border-collapse:collapse;background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding:40px 40px 30px 40px;background:linear-gradient(135deg,#1A2B4C 0%,#2d4a7a 100%);border-radius:8px 8px 0 0;">
                            <h1 style="margin:0;color:#D4AF37;font-size:28px;font-weight:600;text-align:center;">Tailor Project</h1>
                            <p style="margin:10px 0 0 0;color:#e0e7ff;font-size:14px;text-align:center;">Nhắc nhở lịch hẹn ngày mai</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px;">
                            <p style="margin:0 0 20px 0;color:#1A1A2E;font-size:16px;">Xin chào <strong>{customer_name}</strong>,</p>
                            <p style="margin:0 0 20px 0;color:#4b5563;font-size:15px;line-height:1.6;">
                                Bạn có lịch hẹn tư vấn Bespoke vào <strong>ngày mai</strong>. Chúng tôi mong được gặp bạn!
                            </p>
                            <table role="presentation" style="width:100%;border-collapse:collapse;background:#F9F7F2;border-radius:6px;padding:20px;margin:20px 0;">
                                <tr><td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;">
                                    <span style="color:#6B7280;font-size:13px;">Ngày hẹn</span><br>
                                    <strong style="color:#D4AF37;font-size:18px;">{formatted_date}</strong>
                                </td></tr>
                                <tr><td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;">
                                    <span style="color:#6B7280;font-size:13px;">Khung giờ</span><br>
                                    <strong style="color:#1A1A2E;font-size:16px;">{slot_display}</strong>
                                </td></tr>
                                <tr><td style="padding:12px 20px;">
                                    <span style="color:#6B7280;font-size:13px;">Địa chỉ tiệm</span><br>
                                    <strong style="color:#1A1A2E;font-size:15px;">{settings.SHOP_ADDRESS or "Liên hệ tiệm để biết địa chỉ"}</strong>
                                </td></tr>
                            </table>
                            <p style="margin:0;color:#6B7280;font-size:13px;">
                                Nếu có sự cố, vui lòng liên hệ tiệm sớm để điều chỉnh lịch hẹn.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px 40px;background-color:#F9F7F2;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;color:#6b7280;font-size:13px;text-align:center;">
                                &copy; 2026 Tailor Project - Hệ thống May Đo Thông Minh
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

        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part1)
        message.attach(part2)

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )

        logger.info("Booking reminder email sent to %s", email)
        return True

    except Exception as e:
        logger.error("Failed to send booking reminder email to %s: %s", email, e)
        return False


async def send_appointment_cancellation_email(
    email: str,
    customer_name: str,
    appointment_date: "date",
    slot: str,
) -> bool:
    """Send cancellation notification email to customer when owner cancels appointment.

    Args:
        email: Customer email address
        customer_name: Customer's full name
        appointment_date: The cancelled appointment date
        slot: 'morning' or 'afternoon'

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        formatted_date = appointment_date.strftime("%d/%m/%Y")
        slot_display = _slot_label(slot)

        message = MIMEMultipart("alternative")
        message["Subject"] = f"Thông báo hủy lịch hẹn - {formatted_date} {slot_display}"
        message["From"] = settings.FROM_EMAIL
        message["To"] = email

        text_content = f"""
Xin chào {customer_name},

Chúng tôi rất tiếc phải thông báo rằng lịch hẹn tư vấn của bạn đã bị hủy.Chúng tôi sẽ liên lạc lại với bạn sớm nhất có thể.

Ngày hẹn: {formatted_date}
Khung giờ: {slot_display}

Nếu bạn muốn đặt lại lịch hẹn, vui lòng truy cập trang đặt lịch hoặc liên hệ tiệm theo số điện thoại 0823120701.

Xin lỗi vì sự bất tiện này.

Trân trọng,
Tailor Project Team
        """.strip()

        html_content = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Thông báo hủy lịch hẹn</title>
</head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background-color:#F9F7F2;">
    <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr>
            <td align="center" style="padding:40px 0;">
                <table role="presentation" style="width:600px;border-collapse:collapse;background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding:40px 40px 30px 40px;background:linear-gradient(135deg,#1A2B4C 0%,#2d4a7a 100%);border-radius:8px 8px 0 0;">
                            <h1 style="margin:0;color:#D4AF37;font-size:28px;font-weight:600;text-align:center;">Tailor Project</h1>
                            <p style="margin:10px 0 0 0;color:#e0e7ff;font-size:14px;text-align:center;">Thông báo hủy lịch hẹn</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px;">
                            <p style="margin:0 0 20px 0;color:#1A1A2E;font-size:16px;">Xin chào <strong>{customer_name}</strong>,</p>
                            <p style="margin:0 0 20px 0;color:#4b5563;font-size:15px;line-height:1.6;">
                                Chúng tôi rất tiếc phải thông báo rằng lịch hẹn tư vấn Bespoke của bạn đã bị hủy.
                            </p>
                            <table role="presentation" style="width:100%;border-collapse:collapse;background:#FEF2F2;border:1px solid #FECACA;border-radius:6px;padding:20px;margin:20px 0;">
                                <tr><td style="padding:12px 20px;border-bottom:1px solid #FECACA;">
                                    <span style="color:#6B7280;font-size:13px;">Ngày hẹn</span><br>
                                    <strong style="color:#DC2626;font-size:16px;text-decoration:line-through;">{formatted_date}</strong>
                                </td></tr>
                                <tr><td style="padding:12px 20px;">
                                    <span style="color:#6B7280;font-size:13px;">Khung giờ</span><br>
                                    <strong style="color:#DC2626;font-size:16px;text-decoration:line-through;">{slot_display}</strong>
                                </td></tr>
                            </table>
                            <p style="margin:0 0 20px 0;color:#4b5563;font-size:15px;line-height:1.6;">
                                Nếu bạn muốn đặt lại lịch hẹn, vui lòng truy cập trang đặt lịch hoặc liên hệ tiệm.
                            </p>
                            <p style="margin:0;color:#6B7280;font-size:13px;">
                                Xin lỗi vì sự bất tiện này.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px 40px;background-color:#F9F7F2;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;color:#6b7280;font-size:13px;text-align:center;">
                                &copy; 2026 Tailor Project - Hệ thống May Đo Thông Minh
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

        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part1)
        message.attach(part2)

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )

        logger.info("Appointment cancellation email sent to %s", email)
        return True

    except Exception as e:
        logger.error("Failed to send appointment cancellation email to %s: %s", email, e)
        return False


def _create_order_confirmation_email_html(order) -> str:
    """Generate HTML email template for order confirmation (Story 4.1).

    Heritage branding: Indigo #4f46e5, Gold #D4AF37.
    """
    # Build items table rows
    items_html = ""
    if hasattr(order, "items") and order.items:
        for item in order.items:
            garment_name = item.garment.name if hasattr(item, "garment") and item.garment else "San pham"
            items_html += f"""
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">{garment_name}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">{item.transaction_type}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">{item.size or '-'}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">{item.total_price:,.0f}₫</td>
            </tr>"""

    # Build shipping address
    shipping = ""
    if hasattr(order, "shipping_address") and order.shipping_address:
        addr = order.shipping_address
        if isinstance(addr, dict):
            shipping = f"{addr.get('address_detail', '')}, {addr.get('ward', '')}, {addr.get('district', '')}, {addr.get('province', '')}"
        else:
            shipping = str(addr)

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0; padding:0; background-color:#F9F7F2; font-family: 'Segoe UI', Arial, sans-serif;">
        <div style="max-width:600px; margin:0 auto; padding:20px;">
            <div style="background-color:#1A2B4C; padding:24px; text-align:center; border-radius:8px 8px 0 0;">
                <h1 style="color:#D4AF37; margin:0; font-size:24px;">Tailor Project</h1>
                <p style="color:#ffffff; margin:8px 0 0; font-size:14px;">Xác Nhận Đơn Hàng</p>
            </div>
            <div style="background-color:#ffffff; padding:32px; border-radius:0 0 8px 8px;">
                <h2 style="color:#1A2B4C; margin:0 0 16px;">Cảm ơn bạn đã đặt hàng!</h2>
                <p style="color:#374151; font-size:14px;">
                    Xin chào <strong>{order.customer_name}</strong>, đơn hàng của bạn đã được xác nhận thành công.
                </p>

                <div style="background-color:#F9F7F2; padding:16px; border-radius:8px; margin:16px 0;">
                    <p style="margin:0 0 8px; font-size:14px;"><strong>Mã đơn hàng:</strong> {str(order.id)[:8].upper()}</p>
                    <p style="margin:0 0 8px; font-size:14px;"><strong>Phương thức:</strong> {order.payment_method.upper()}</p>
                    <p style="margin:0; font-size:14px;"><strong>Địa chỉ giao:</strong> {shipping}</p>
                </div>

                <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                    <thead>
                        <tr style="background-color:#1A2B4C;">
                            <th style="padding:8px 12px; color:#fff; text-align:left; font-size:13px;">Sản phẩm</th>
                            <th style="padding:8px 12px; color:#fff; text-align:center; font-size:13px;">Loại</th>
                            <th style="padding:8px 12px; color:#fff; text-align:center; font-size:13px;">Size</th>
                            <th style="padding:8px 12px; color:#fff; text-align:right; font-size:13px;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>{items_html}</tbody>
                </table>

                <div style="text-align:right; padding:12px 0; border-top:2px solid #D4AF37;">
                    <p style="font-size:18px; color:#1A2B4C; margin:0;">
                        <strong>Tổng cộng: {order.total_amount:,.0f}₫</strong>
                    </p>
                </div>

                <p style="color:#6b7280; font-size:12px; margin:24px 0 0; text-align:center;">
                    Tailor Project - Hệ thống May Đo Thông Minh © 2026
                </p>
            </div>
        </div>
    </body>
    </html>"""


async def send_order_confirmation_email(order, customer_email: str | None = None) -> bool:
    """Send order confirmation email after successful payment (Story 4.1).

    Non-blocking: caller wraps in try/except, never blocks main flow.

    Args:
        order: OrderDB instance with items loaded.
        customer_email: Recipient email address (looked up from UserDB by caller).

    Returns:
        bool: True if sent, False otherwise.
    """
    email = customer_email
    if not email:
        logger.info(
            "No email for order %s (guest checkout) — skipping confirmation email",
            order.id,
        )
        return False

    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Xác nhận đơn hàng #{str(order.id)[:8].upper()} - Tailor Project"
        message["From"] = settings.FROM_EMAIL
        message["To"] = email

        text_content = f"""
Xin chào {order.customer_name},

Đơn hàng #{str(order.id)[:8].upper()} đã được xác nhận thành công.

Tổng tiền: {order.total_amount:,.0f}₫
Phương thức thanh toán: {order.payment_method.upper()}

Cảm ơn bạn đã mua sắm tại Tailor Project!

---
Tailor Project - Hệ thống May Đo Thông Minh
© 2026
        """.strip()

        html_content = _create_order_confirmation_email_html(order)

        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part1)
        message.attach(part2)

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )

        logger.info("Order confirmation email sent for order %s to %s", order.id, email)
        return True

    except Exception as e:
        logger.error("Failed to send order confirmation email for order %s: %s", order.id, e)
        return False

