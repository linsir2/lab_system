package com.lab.gateway.borrow.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.lab.gateway.common.enums.BorrowStatus;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record BorrowPatchRequest(BorrowStatus status, Instant returnTime) {
}
