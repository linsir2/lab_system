package com.lab.gateway.borrow.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.lab.gateway.borrow.client.BorrowClient;
import com.lab.gateway.borrow.dto.BorrowDto;
import com.lab.gateway.borrow.service.BorrowOrchestrator;
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
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(BorrowGatewayController.class)
class BorrowGatewayControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BorrowClient borrowClient;

    @MockBean
    private BorrowOrchestrator orchestrator;

    @MockBean
    private PersonService personService;

    @MockBean
    private MaterialClient materialClient;

    @Test
    void listsBorrows() throws Exception {
        when(borrowClient.list(1L, null, BorrowStatus.BORROWED)).thenReturn(List.of(activeBorrow()));

        mockMvc.perform(get("/api/borrows?personId=1&status=BORROWED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].id").value(1));
    }

    @Test
    void createsBorrow() throws Exception {
        when(orchestrator.create(any())).thenReturn(activeBorrow());

        mockMvc.perform(post("/api/borrows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"personId\":1,\"materialId\":1,\"quantity\":2,"
                                + "\"dueTime\":\"2099-01-01T00:00:00Z\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(201))
                .andExpect(jsonPath("$.data.status").value("BORROWED"));
    }

    @Test
    void rejectsPastDueTimeAtTheBoundary() throws Exception {
        mockMvc.perform(post("/api/borrows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"personId\":1,\"materialId\":1,\"quantity\":2,"
                                + "\"dueTime\":\"2000-01-01T00:00:00Z\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void returnsBorrow() throws Exception {
        when(orchestrator.returnBorrow(1L)).thenReturn(returnedBorrow());

        mockMvc.perform(put("/api/borrows/1/return"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RETURNED"));
    }

    @Test
    void cancelsBorrow() throws Exception {
        when(orchestrator.cancel(1L)).thenReturn(cancelledBorrow());

        mockMvc.perform(delete("/api/borrows/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    }

    @Test
    void aggregatesDetailWithOverdueDays() throws Exception {
        BorrowDto overdue = new BorrowDto(1L, 1L, 1L, 2,
                Instant.now().minus(10, ChronoUnit.DAYS),
                Instant.now().minus(3, ChronoUnit.DAYS).minus(2, ChronoUnit.HOURS),
                null, BorrowStatus.BORROWED);
        when(borrowClient.get(1L)).thenReturn(overdue);
        when(personService.get(1L)).thenReturn(person());
        when(materialClient.get(1L)).thenReturn(new MaterialDto(1L, "示波器", 8));

        mockMvc.perform(get("/api/borrows/1/detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.person.name").value("张三"))
                .andExpect(jsonPath("$.data.person.deleted").value(false))
                .andExpect(jsonPath("$.data.material.name").value("示波器"))
                .andExpect(jsonPath("$.data.material.deleted").value(false))
                .andExpect(jsonPath("$.data.overdueDays").value(3));
    }

    @Test
    void detailMarksDeletedPerson() throws Exception {
        when(borrowClient.get(1L)).thenReturn(activeBorrow());
        when(personService.get(1L)).thenThrow(new BusinessException(404, "person not found"));
        when(materialClient.get(1L)).thenReturn(new MaterialDto(1L, "示波器", 8));

        mockMvc.perform(get("/api/borrows/1/detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.person.deleted").value(true))
                .andExpect(jsonPath("$.data.person.name").isEmpty());
    }

    @Test
    void detailMarksDeletedMaterial() throws Exception {
        when(borrowClient.get(1L)).thenReturn(activeBorrow());
        when(personService.get(1L)).thenReturn(person());
        when(materialClient.get(1L)).thenThrow(new BusinessException(404, "material not found"));

        mockMvc.perform(get("/api/borrows/1/detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.material.deleted").value(true))
                .andExpect(jsonPath("$.data.material.name").isEmpty());
    }

    private BorrowDto activeBorrow() {
        return new BorrowDto(1L, 1L, 1L, 2,
                Instant.parse("2026-11-04T02:00:00Z"),
                Instant.parse("2026-11-11T02:00:00Z"),
                null, BorrowStatus.BORROWED);
    }

    private BorrowDto returnedBorrow() {
        return new BorrowDto(1L, 1L, 1L, 2,
                Instant.parse("2026-11-04T02:00:00Z"),
                Instant.parse("2026-11-11T02:00:00Z"),
                Instant.parse("2026-11-05T00:00:00Z"), BorrowStatus.RETURNED);
    }

    private BorrowDto cancelledBorrow() {
        return new BorrowDto(1L, 1L, 1L, 2,
                Instant.parse("2026-11-04T02:00:00Z"),
                Instant.parse("2026-11-11T02:00:00Z"),
                null, BorrowStatus.CANCELLED);
    }

    private Person person() {
        Person person = new Person();
        person.setId(1L);
        person.setName("张三");
        person.setRole(PersonRole.STUDENT);
        person.setStatus(PersonStatus.ACTIVE);
        return person;
    }
}
