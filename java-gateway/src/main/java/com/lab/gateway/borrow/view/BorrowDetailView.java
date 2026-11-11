package com.lab.gateway.borrow.view;

import com.lab.gateway.borrow.dto.BorrowDto;
import com.lab.gateway.common.enums.PersonRole;

public record BorrowDetailView(
        BorrowDto borrow,
        PersonSummary person,
        MaterialSummary material,
        long overdueDays) {

    public record PersonSummary(Long id, String name, PersonRole role, boolean deleted) {
    }

    public record MaterialSummary(Long id, String name, boolean deleted) {
    }
}
