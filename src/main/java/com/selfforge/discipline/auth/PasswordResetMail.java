package com.selfforge.discipline.auth;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import java.util.Locale;

@Component
public class PasswordResetMail {
    private final ObjectProvider<JavaMailSender> sender;
    private final boolean enabled;
    private final String from;
    private final String provider;
    private final ResendMailTransport resend;
    public PasswordResetMail(ObjectProvider<JavaMailSender> sender,
            @Value("${app.password-reset.enabled:false}") boolean enabled,
            @Value("${app.password-reset.from:}") String from,
            @Value("${app.email.provider:smtp}") String provider, ResendMailTransport resend) {
        this.sender = sender;
        this.enabled = enabled;
        this.from = from;
        this.provider = provider == null ? "smtp" : provider.trim().toLowerCase(Locale.ROOT);
        if (!"smtp".equals(this.provider) && !"resend".equals(this.provider)) {
            throw new IllegalArgumentException("Unsupported email provider configuration");
        }
        this.resend = resend;
    }
    public boolean available() { return enabled && !from.isBlank() && ("resend".equals(provider) ? resend.available()
            : "smtp".equals(provider) && sender.getIfAvailable() != null); }

    /** Allows optional operational notices without exposing password-reset UI. */
    public boolean operationalAvailable() { return !from.isBlank() && ("resend".equals(provider) ? resend.available()
            : "smtp".equals(provider) && sender.getIfAvailable() != null); }
    private void deliver(SimpleMailMessage message) {
        if (!available()) throw new org.springframework.mail.MailSendException("Email provider is not configured.");
        deliverConfigured(message);
    }

    private void deliverConfigured(SimpleMailMessage message) {
        if ("resend".equals(provider)) {
            resend.send(from, message.getTo()[0], message.getSubject(), message.getText());
        } else {
            sender.getObject().send(message);
        }
    }

    /** Sends an internal, user-approved operational notification when mail transport is configured. */
    public void sendOperational(String recipient, String subject, String text) {
        if (!operationalAvailable()) throw new org.springframework.mail.MailSendException("Email provider is not configured.");
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(text);
        deliverConfigured(message);
    }
    public void send(String email, String code) {
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("SelfForge — Mã đặt lại mật khẩu / Password reset");
        message.setText("Mã đặt lại mật khẩu của bạn: " + code
                + "\nMã có hiệu lực 10 phút. Không chia sẻ mã này."
                + "\nNếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu chưa bị thay đổi."
                + "\n\nYour password reset code: " + code
                + "\nValid for 10 minutes. Do not share this code."
                + "\nIf you did not request this, ignore this email. Your password has not changed.");
        deliver(message);
    }

    public void sendRegistration(String email, String code) {
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("SelfForge — Xác nhận email / Verify your email");
        message.setText("Mã xác nhận đăng ký: " + code
                + "\nMã có hiệu lực 10 phút. Không chia sẻ mã này."
                + "\nNếu bạn không yêu cầu đăng ký SelfForge, hãy bỏ qua email này."
                + "\n\nYour registration verification code: " + code
                + "\nValid for 10 minutes. Do not share this code."
                + "\nIf you did not request a SelfForge account, ignore this email.");
        deliver(message);
    }

    public void sendAccountEmailVerification(String email, String code) {
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("SelfForge — Xác nhận email tài khoản / Verify your account email");
        message.setText("Mã xác nhận email tài khoản của bạn: " + code
                + "\nMã có hiệu lực 10 phút. Không chia sẻ mã này."
                + "\nNếu bạn không yêu cầu, hãy bỏ qua email này."
                + "\n\nYour account email verification code: " + code
                + "\nValid for 10 minutes. Do not share this code."
                + "\nIf you did not request this, ignore this email.");
        deliver(message);
    }

    public void sendEmailChange(String email, String code) {
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("SelfForge — Xác nhận email mới / Verify your new email");
        message.setText("Mã xác nhận đổi email: " + code
                + "\nMã có hiệu lực 10 phút. Không chia sẻ mã này."
                + "\nNếu bạn không yêu cầu đổi email, hãy bỏ qua email này. Email tài khoản chưa thay đổi."
                + "\n\nYour email-change verification code: " + code
                + "\nValid for 10 minutes. Do not share this code."
                + "\nIf you did not request this change, ignore this email. Your account email has not changed.");
        deliver(message);
    }

    /**
     * Security notice sent to the address that was previously on the account.
     * The new address is deliberately omitted: an old mailbox should not learn
     * more account data than is needed to detect an unexpected takeover.
     */
    public void sendEmailChangedNotice(String previousEmail, String recoveryUrl) {
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(previousEmail);
        message.setSubject("SelfForge — Email tài khoản đã thay đổi / Account email changed");
        String recovery = recoveryUrl == null ? ""
                : "\nNếu không phải bạn, trong vòng 24 giờ hãy mở liên kết khôi phục này: " + recoveryUrl
                + "\nIf you did not make this change, open this recovery link within 24 hours: " + recoveryUrl;
        message.setText("Email đăng nhập SelfForge của bạn vừa được thay đổi. Mọi phiên đăng nhập đã được đăng xuất."
                + "\nNếu chính bạn thực hiện việc này, bạn không cần làm gì thêm."
                + (recoveryUrl == null ? "\nNếu không phải bạn, hãy liên hệ hỗ trợ SelfForge sớm nhất có thể." : "")
                + "\n\nYour SelfForge sign-in email was just changed. All signed-in sessions were signed out."
                + "\nIf you made this change, no further action is needed."
                + (recoveryUrl == null ? "\nIf you did not make it, please contact SelfForge support as soon as possible." : "")
                + recovery);
        deliver(message);
    }

    public void sendEmailRestoredNotice(String changedEmail) {
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(changedEmail);
        message.setSubject("SelfForge — Email tài khoản đã được khôi phục / Account email restored");
        message.setText("Email đăng nhập SelfForge vừa được khôi phục về địa chỉ trước đó. Mọi phiên đăng nhập đã được đăng xuất."
                + "\nNếu bạn không thực hiện việc này, hãy liên hệ hỗ trợ SelfForge sớm nhất có thể."
                + "\n\nYour SelfForge sign-in email was restored to its previous address. All signed-in sessions were signed out."
                + "\nIf you did not make this change, please contact SelfForge support as soon as possible.");
        deliver(message);
    }
}
