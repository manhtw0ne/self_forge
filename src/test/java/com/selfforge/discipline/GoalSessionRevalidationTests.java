package com.selfforge.discipline;
import com.selfforge.discipline.auth.*;
import com.selfforge.discipline.goal.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class GoalSessionRevalidationTests {
 @Test void revocationWhileWaitingPreventsEveryGoalWrite() {
  for (int action=0; action<7; action++) {
   var current=mock(CurrentUserService.class); var users=mock(AppUserRepository.class);
   var goals=mock(GoalRepository.class); var receipts=mock(GoalProgressReceiptRepository.class); var createReceipts=mock(GoalCreateReceiptRepository.class);
   var user=mock(AppUser.class); var manager=mock(EntityManager.class);
   var request=new MockHttpServletRequest();
   when(user.getId()).thenReturn(1L); when(users.lockById(1L)).thenReturn(Optional.of(user));
   when(current.requireUser(request)).thenReturn(user).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));
   var controller=new GoalController(goals,current,users,receipts,mock(GoalProgressCorrectionRepository.class),createReceipts,new ObjectMapper());
   ReflectionTestUtils.setField(controller,"entityManager",manager);
   int operation=action;
   var failure=assertThrows(ResponseStatusException.class,()->invoke(controller,operation,request));
   assertEquals(401,failure.getStatusCode().value());
   verify(manager).refresh(user); verify(current,times(2)).requireUser(request);
   verifyNoInteractions(goals,receipts,createReceipts);
  }
 }
 @Test void removedAccountReturnsUnauthorizedWithoutWrites() {
  var current=mock(CurrentUserService.class); var users=mock(AppUserRepository.class);
  var goals=mock(GoalRepository.class); var receipts=mock(GoalProgressReceiptRepository.class); var createReceipts=mock(GoalCreateReceiptRepository.class);
  var user=mock(AppUser.class); var request=new MockHttpServletRequest();
  when(user.getId()).thenReturn(1L); when(current.requireUser(request)).thenReturn(user);
  when(users.lockById(1L)).thenReturn(Optional.empty());
  var controller=new GoalController(goals,current,users,receipts,mock(GoalProgressCorrectionRepository.class),createReceipts,new ObjectMapper()); var manager=mock(EntityManager.class);
  ReflectionTestUtils.setField(controller,"entityManager",manager);
  var failure=assertThrows(ResponseStatusException.class,()->invoke(controller,0,request));
  assertEquals(401,failure.getStatusCode().value()); verifyNoInteractions(manager,goals,receipts,createReceipts);
 }
 private static void invoke(GoalController c,int action,MockHttpServletRequest r) {
  switch(action) {
   case 0 -> c.create(new GoalController.CreateGoalRequest("Read","",12,"books","",null),r);
   case 1 -> c.update(1L,new GoalController.UpdateGoalRequest("Changed",null,null,null,null,null,null),r);
   case 2 -> c.restore(1L,null,r);
   case 3 -> c.addProgress(1L,new GoalController.AddProgressRequest(1,null),r);
   case 4 -> c.abandon(1L,null,r);
   case 5 -> c.delete(1L,null,r);
   case 6 -> c.correctProgress(1L,new GoalController.CorrectProgressRequest(0,null),r);
   default -> throw new AssertionError("Unknown operation");
  }
 }
}
