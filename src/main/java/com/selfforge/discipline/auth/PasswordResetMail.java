package com.selfforge.discipline.auth;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class PasswordResetMail {
    private final ObjectProvider<JavaMailSender> sender;
    private final boolean enabled;
    private final String from;
    public PasswordResetMail(ObjectProvider<JavaMailSender> sender,
            @Value("${app.password-reset.enabled:false}") boolean enabled,
            @Value("${app.password-reset.from:}") String from) {
        this.sender = sender;
        this.enabled = enabled;
        this.from = from;
    }
    public boolean available() { return enabled && !from.isBlank() && sender.getIfAvailable() != null; }
    public void send(String email, String code) {
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("SelfForge — Mã đặt lại mật khẩu");
        message.setText("Mã đặt lại mật khẩu của bạn: " + code
                + "\nMã có hiệu lực 10 phút. Không chia sẻ mã này."
                + "\nNếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu chưa bị thay đổi.");
        sender.getObject().send(message);
    }

    public void sendRegistration(String email, String code) {
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("SelfForge — Xác nhận email đăng ký");
        message.setText("Mã xác nhận đăng ký: " + code
                + "\nMã có hiệu lực 10 phút. Không chia sẻ mã này."
                + "\nNếu bạn không yêu cầu đăng ký SelfForge, hãy bỏ qua email này.");
        sender.getObject().send(message);
    }
}
