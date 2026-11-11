package com.lab.gateway.borrow.dto;

import com.lab.gateway.common.enums.BorrowStatus;
import java.time.Instant;

public record BorrowDto(
        Long id,
        Long personId,
        Long materialId,
        Integer quantity,
        Instant borrowTime,
        Instant dueTime,
        Instant returnTime,
        BorrowStatus status) {
}
