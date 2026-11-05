package com.selfforge.discipline.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile/account")
public class AccountDeletionController {
    private final AccountDeletionService deletion;
    public AccountDeletionController(AccountDeletionService deletion) { this.deletion = deletion; }

    public record DeleteRequest(@NotBlank @Size(max = 128) String currentPassword,
            @NotBlank @Email @Size(max = 254) String confirmationEmail) {}

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@Valid @RequestBody DeleteRequest body, HttpServletRequest request) {
        deletion.delete(request, body.currentPassword(), body.confirmationEmail());
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> conflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).header("Cache-Control", "no-store").body(
                ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                        "Chưa thể xóa tài khoản do dữ liệu liên quan. Dữ liệu vẫn được giữ; hãy liên hệ hỗ trợ."));
    }
}
