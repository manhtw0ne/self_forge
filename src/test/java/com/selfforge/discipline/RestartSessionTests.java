package com.selfforge.discipline;
import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.restart.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.LocalDate;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class RestartSessionTests {
 @Test void revokedSessionAfterLockCannotSavePlan(){
  var current=mock(CurrentUserService.class);var users=mock(AppUserRepository.class);var plans=mock(RestartPlanRepository.class);
  var user=mock(AppUser.class);var request=new MockHttpServletRequest();when(user.getId()).thenReturn(1L);
  when(current.requireUser(request)).thenReturn(user).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));when(users.lockById(1L)).thenReturn(Optional.of(user));
  var controller=new RestartPlanController(current,users,plans,mock(com.selfforge.discipline.restart.RestartArchiveService.class));ReflectionTestUtils.setField(controller,"manager",mock(EntityManager.class));
  assertThrows(ResponseStatusException.class,()->controller.save(new RestartPlanController.Request("Read","BUSY",LocalDate.of(2026,10,14),List.of("one","two","three"),0L),request));
  verifyNoInteractions(plans);
 }
}
