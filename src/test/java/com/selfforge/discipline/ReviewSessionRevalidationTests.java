package com.selfforge.discipline;
import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.review.*;
import com.selfforge.discipline.common.UserTime;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class ReviewSessionRevalidationTests {
 @Test void revokedSessionOrExpiredPremiumCannotSaveAfterWaitingForLock() {
  for(boolean revoked:new boolean[]{true,false}) {
   var current=mock(CurrentUserService.class); var users=mock(AppUserRepository.class);
   var reviews=mock(WeeklyReviewRepository.class); var time=mock(UserTime.class);
   var user=mock(AppUser.class); var request=new MockHttpServletRequest();
   when(user.getId()).thenReturn(1L); when(users.lockById(1L)).thenReturn(Optional.of(user));
   if(revoked) when(current.requireUser(request)).thenReturn(user).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));
   else when(current.requireUser(request)).thenReturn(user);
   var controller=new WeeklyReviewController(reviews,current,time,users);
   var manager=mock(EntityManager.class); ReflectionTestUtils.setField(controller,"entityManager",manager);
   var failure=assertThrows(ResponseStatusException.class,()->controller.save(
     new WeeklyReviewController.ReviewRequest("win","improvement","plan",3,null,null),request));
   assertEquals(revoked?401:403,failure.getStatusCode().value());
   verify(manager).refresh(user); verify(current,times(2)).requireUser(request);
   verifyNoInteractions(reviews,time);
  }
 }
}
