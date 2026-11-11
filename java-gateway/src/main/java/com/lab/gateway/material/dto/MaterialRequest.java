package com.lab.gateway.material.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MaterialRequest(
        @NotBlank String name,
        @NotNull @Min(0) Integer quantity) {
}
