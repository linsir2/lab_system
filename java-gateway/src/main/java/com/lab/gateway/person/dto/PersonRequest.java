package com.lab.gateway.person.dto;

import com.lab.gateway.common.enums.PersonRole;
import com.lab.gateway.common.enums.PersonStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PersonRequest(
        @NotBlank String name,
        @NotNull PersonRole role,
        @NotNull PersonStatus status) {
}
