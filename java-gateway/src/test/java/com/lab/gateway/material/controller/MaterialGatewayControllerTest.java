package com.lab.gateway.material.controller;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.lab.gateway.borrow.client.BorrowClient;
import com.lab.gateway.borrow.dto.BorrowDto;
import com.lab.gateway.common.enums.BorrowStatus;
import com.lab.gateway.material.client.MaterialClient;
import com.lab.gateway.material.dto.MaterialDto;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MaterialGatewayController.class)
class MaterialGatewayControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MaterialClient materialClient;

    @MockBean
    private BorrowClient borrowClient;

    @Test
    void listsMaterials() throws Exception {
        when(materialClient.list()).thenReturn(List.of(new MaterialDto(1L, "示波器", 10)));

        mockMvc.perform(get("/api/materials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].name").value("示波器"));
    }

    @Test
    void rejectsDeleteWhenMaterialHasActiveBorrow() throws Exception {
        when(borrowClient.list(null, 1L, BorrowStatus.BORROWED)).thenReturn(List.of(activeBorrow()));

        mockMvc.perform(delete("/api/materials/1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(409));

        verify(materialClient, never()).delete(1L);
    }

    @Test
    void deletesMaterialWithoutActiveBorrow() throws Exception {
        when(borrowClient.list(null, 1L, BorrowStatus.BORROWED)).thenReturn(List.of());

        mockMvc.perform(delete("/api/materials/1"))
                .andExpect(status().isNoContent());

        verify(materialClient).delete(1L);
    }

    private BorrowDto activeBorrow() {
        return new BorrowDto(1L, 1L, 1L, 2,
                Instant.parse("2026-11-04T02:00:00Z"),
                Instant.parse("2026-11-11T02:00:00Z"),
                null, BorrowStatus.BORROWED);
    }
}
