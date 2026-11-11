package com.lab.gateway.borrow.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.lab.gateway.borrow.client.BorrowClient;
import com.lab.gateway.borrow.dto.BorrowCreateRequest;
import com.lab.gateway.borrow.dto.BorrowDto;
import com.lab.gateway.borrow.dto.BorrowPatchRequest;
import com.lab.gateway.common.BusinessException;
import com.lab.gateway.common.enums.BorrowStatus;
import com.lab.gateway.common.enums.PersonRole;
import com.lab.gateway.common.enums.PersonStatus;
import com.lab.gateway.material.client.MaterialClient;
import com.lab.gateway.material.dto.MaterialDto;
import com.lab.gateway.person.entity.Person;
import com.lab.gateway.person.service.PersonService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BorrowOrchestratorTest {

    @Mock
    private PersonService personService;

    @Mock
    private MaterialClient materialClient;

    @Mock
    private BorrowClient borrowClient;

    private BorrowOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        orchestrator = new BorrowOrchestrator(personService, materialClient, borrowClient);
    }

    @Test
    void createReservesRecordThenDeductsStock() {
        Instant dueTime = Instant.now().plus(7, ChronoUnit.DAYS);
        when(personService.get(1L)).thenReturn(person(PersonStatus.ACTIVE));
        when(materialClient.get(1L)).thenReturn(new MaterialDto(1L, "示波器", 10));
        when(borrowClient.create(any())).thenReturn(borrow(BorrowStatus.BORROWED));
        when(materialClient.deduct(1L, 2)).thenReturn(new MaterialDto(1L, "示波器", 8));

        BorrowDto created = orchestrator.create(new BorrowCreateRequest(1L, 1L, 2, dueTime));

        assertThat(created.id()).isEqualTo(1L);
        InOrder inOrder = inOrder(borrowClient, materialClient);
        inOrder.verify(borrowClient).create(any());
        inOrder.verify(materialClient).deduct(1L, 2);
    }

    @Test
    void createRejectsInactivePerson() {
        when(personService.get(1L)).thenReturn(person(PersonStatus.INACTIVE));

        assertThatThrownBy(() -> orchestrator.create(
                new BorrowCreateRequest(1L, 1L, 2, Instant.now().plus(1, ChronoUnit.DAYS))))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(409);

        verifyNoInteractions(materialClient, borrowClient);
    }

    @Test
    void createRejectsInsufficientStockBeforeWritingBorrow() {
        when(personService.get(1L)).thenReturn(person(PersonStatus.ACTIVE));
        when(materialClient.get(1L)).thenReturn(new MaterialDto(1L, "示波器", 1));

        assertThatThrownBy(() -> orchestrator.create(
                new BorrowCreateRequest(1L, 1L, 2, Instant.now().plus(1, ChronoUnit.DAYS))))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(409);

        verify(borrowClient, never()).create(any());
    }

    @Test
    void createRejectsDueTimeInThePast() {
        when(personService.get(1L)).thenReturn(person(PersonStatus.ACTIVE));

        assertThatThrownBy(() -> orchestrator.create(
                new BorrowCreateRequest(1L, 1L, 2, Instant.now().minus(1, ChronoUnit.SECONDS))))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(400);

        verifyNoInteractions(materialClient, borrowClient);
    }

    @Test
    void createCompensatesWhenDeductFails() {
        when(personService.get(1L)).thenReturn(person(PersonStatus.ACTIVE));
        when(materialClient.get(1L)).thenReturn(new MaterialDto(1L, "示波器", 10));
        when(borrowClient.create(any())).thenReturn(borrow(BorrowStatus.BORROWED));
        when(materialClient.deduct(1L, 2)).thenThrow(new RuntimeException("go down"));

        assertThatThrownBy(() -> orchestrator.create(
                new BorrowCreateRequest(1L, 1L, 2, Instant.now().plus(1, ChronoUnit.DAYS))))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(502);

        verify(borrowClient).delete(1L);
    }

    @Test
    void returnBorrowRestoresStockThenClosesRecord() {
        when(borrowClient.get(1L)).thenReturn(borrow(BorrowStatus.BORROWED));
        when(materialClient.restore(1L, 2)).thenReturn(new MaterialDto(1L, "示波器", 10));
        when(borrowClient.update(eq(1L), any())).thenReturn(borrow(BorrowStatus.RETURNED));

        orchestrator.returnBorrow(1L);

        verify(materialClient).restore(1L, 2);
        ArgumentCaptor<BorrowPatchRequest> patch = ArgumentCaptor.forClass(BorrowPatchRequest.class);
        verify(borrowClient).update(eq(1L), patch.capture());
        assertThat(patch.getValue().status()).isEqualTo(BorrowStatus.RETURNED);
        assertThat(patch.getValue().returnTime()).isNotNull();
    }

    @Test
    void returnBorrowRejectsAlreadyClosedRecord() {
        when(borrowClient.get(1L)).thenReturn(borrow(BorrowStatus.RETURNED));

        assertThatThrownBy(() -> orchestrator.returnBorrow(1L))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(409);

        verify(materialClient, never()).restore(anyLong(), anyInt());
    }

    @Test
    void returnBorrowCompensatesWhenUpdateFails() {
        when(borrowClient.get(1L)).thenReturn(borrow(BorrowStatus.BORROWED));
        when(materialClient.restore(1L, 2)).thenReturn(new MaterialDto(1L, "示波器", 10));
        when(borrowClient.update(eq(1L), any())).thenThrow(new RuntimeException("python down"));

        assertThatThrownBy(() -> orchestrator.returnBorrow(1L))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(502);

        verify(materialClient).deduct(1L, 2);
    }

    @Test
    void cancelRestoresStockAndCancelsRecord() {
        when(borrowClient.get(1L)).thenReturn(borrow(BorrowStatus.BORROWED));
        when(materialClient.restore(1L, 2)).thenReturn(new MaterialDto(1L, "示波器", 10));
        when(borrowClient.update(eq(1L), any())).thenReturn(borrow(BorrowStatus.CANCELLED));

        orchestrator.cancel(1L);

        verify(materialClient).restore(1L, 2);
        ArgumentCaptor<BorrowPatchRequest> patch = ArgumentCaptor.forClass(BorrowPatchRequest.class);
        verify(borrowClient).update(eq(1L), patch.capture());
        assertThat(patch.getValue().status()).isEqualTo(BorrowStatus.CANCELLED);
        assertThat(patch.getValue().returnTime()).isNull();
    }

    @Test
    void cancelRejectsAlreadyClosedRecord() {
        when(borrowClient.get(1L)).thenReturn(borrow(BorrowStatus.CANCELLED));

        assertThatThrownBy(() -> orchestrator.cancel(1L))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(409);

        verify(materialClient, never()).restore(anyLong(), anyInt());
    }

    private Person person(PersonStatus status) {
        Person person = new Person();
        person.setId(1L);
        person.setName("张三");
        person.setRole(PersonRole.STUDENT);
        person.setStatus(status);
        return person;
    }

    private BorrowDto borrow(BorrowStatus status) {
        return new BorrowDto(
                1L,
                1L,
                1L,
                2,
                Instant.parse("2026-11-04T02:00:00Z"),
                Instant.parse("2026-11-11T02:00:00Z"),
                status == BorrowStatus.BORROWED ? null : Instant.parse("2026-11-05T00:00:00Z"),
                status);
    }
}
