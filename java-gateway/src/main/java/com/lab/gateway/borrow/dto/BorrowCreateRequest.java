package com.lab.gateway.borrow.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record BorrowCreateRequest(
        @NotNull Long personId,
        @NotNull Long materialId,
        @NotNull @Min(1) Integer quantity,
        @NotNull @Future Instant dueTime) {
}
