package com.lab.gateway.person.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.lab.gateway.borrow.client.BorrowClient;
import com.lab.gateway.borrow.dto.BorrowDto;
import com.lab.gateway.common.BusinessException;
import com.lab.gateway.common.enums.BorrowStatus;
import com.lab.gateway.common.enums.PersonRole;
import com.lab.gateway.common.enums.PersonStatus;
import com.lab.gateway.person.entity.Person;
import com.lab.gateway.person.service.PersonService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PersonController.class)
class PersonControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PersonService service;

    @MockBean
    private BorrowClient borrowClient;

    @Test
    void createsPerson() throws Exception {
        when(service.create(any())).thenReturn(person(1L, "张三"));

        mockMvc.perform(post("/api/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"张三\",\"role\":\"STUDENT\",\"status\":\"ACTIVE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(201))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("张三"))
                .andExpect(jsonPath("$.data.role").value("STUDENT"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void rejectsBlankName() throws Exception {
        mockMvc.perform(post("/api/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \",\"role\":\"STUDENT\",\"status\":\"ACTIVE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void returns404WhenPersonMissing() throws Exception {
        when(service.get(9L)).thenThrow(new BusinessException(404, "person not found"));

        mockMvc.perform(get("/api/persons/9"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value("person not found"));
    }

    @Test
    void filtersByRoleAndStatus() throws Exception {
        when(service.list(PersonRole.STUDENT, PersonStatus.ACTIVE))
                .thenReturn(List.of(person(1L, "张三")));

        mockMvc.perform(get("/api/persons?role=STUDENT&status=ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].name").value("张三"));

        verify(service).list(PersonRole.STUDENT, PersonStatus.ACTIVE);
    }


    @Test
    void rejectsDeleteWhenPersonHasActiveBorrow() throws Exception {
        when(borrowClient.list(1L, null, BorrowStatus.BORROWED))
                .thenReturn(List.of(activeBorrow()));

        mockMvc.perform(delete("/api/persons/1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(409));

        verify(service, never()).delete(1L);
    }

    @Test
    void deletesPersonWithoutActiveBorrow() throws Exception {
        when(borrowClient.list(1L, null, BorrowStatus.BORROWED)).thenReturn(List.of());

        mockMvc.perform(delete("/api/persons/1"))
                .andExpect(status().isNoContent());

        verify(service).delete(1L);
    }

    private BorrowDto activeBorrow() {
        return new BorrowDto(1L, 1L, 1L, 2,
                Instant.parse("2026-11-04T02:00:00Z"),
                Instant.parse("2026-11-11T02:00:00Z"),
                null, BorrowStatus.BORROWED);
    }

    private Person person(Long id, String name) {
        Person person = new Person();
        person.setId(id);
        person.setName(name);
        person.setRole(PersonRole.STUDENT);
        person.setStatus(PersonStatus.ACTIVE);
        return person;
    }
}
