package com.lab.gateway.borrow.service;

import com.lab.gateway.borrow.client.BorrowClient;
import com.lab.gateway.borrow.dto.BorrowCreateRequest;
import com.lab.gateway.borrow.dto.BorrowDto;
import com.lab.gateway.borrow.dto.BorrowPatchRequest;
import com.lab.gateway.common.BusinessException;
import com.lab.gateway.common.enums.BorrowStatus;
import com.lab.gateway.common.enums.PersonStatus;
import com.lab.gateway.material.client.MaterialClient;
import com.lab.gateway.material.dto.MaterialDto;
import com.lab.gateway.person.entity.Person;
import com.lab.gateway.person.service.PersonService;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class BorrowOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(BorrowOrchestrator.class);

    private final PersonService personService;
    private final MaterialClient materialClient;
    private final BorrowClient borrowClient;
    private final ConcurrentHashMap<Long, Object> locks = new ConcurrentHashMap<>();

    public BorrowOrchestrator(
            PersonService personService,
            MaterialClient materialClient,
            BorrowClient borrowClient) {
        this.personService = personService;
        this.materialClient = materialClient;
        this.borrowClient = borrowClient;
    }

    public BorrowDto create(BorrowCreateRequest request) {
        Person person = personService.get(request.personId());
        if (person.getStatus() == PersonStatus.INACTIVE) {
            throw new BusinessException(409, "person is inactive");
        }
        if (request.quantity() == null || request.quantity() < 1) {
            throw new BusinessException(400, "quantity must be >= 1");
        }
        if (request.dueTime() == null || !request.dueTime().isAfter(Instant.now())) {
            throw new BusinessException(400, "dueTime must be in the future");
        }

        MaterialDto material = materialClient.get(request.materialId());
        if (material.quantity() < request.quantity()) {
            throw new BusinessException(409, "insufficient stock");
        }

        BorrowDto borrow = borrowClient.create(request);
        try {
            materialClient.deduct(request.materialId(), request.quantity());
        } catch (RuntimeException exception) {
            compensateCreate(borrow);
            throw new BusinessException(502, "failed to deduct stock");
        }
        return borrow;
    }

    public BorrowDto returnBorrow(Long id) {
        synchronized (lockFor(id)) {
            BorrowDto borrow = borrowClient.get(id);
            requireActive(borrow);

            materialClient.restore(borrow.materialId(), borrow.quantity());
            try {
                return borrowClient.update(id, new BorrowPatchRequest(BorrowStatus.RETURNED, Instant.now()));
            } catch (RuntimeException exception) {
                compensateRestore(borrow);
                throw new BusinessException(502, "failed to update borrow");
            }
        }
    }

    public BorrowDto cancel(Long id) {
        synchronized (lockFor(id)) {
            BorrowDto borrow = borrowClient.get(id);
            requireActive(borrow);

            materialClient.restore(borrow.materialId(), borrow.quantity());
            try {
                return borrowClient.update(id, new BorrowPatchRequest(BorrowStatus.CANCELLED, null));
            } catch (RuntimeException exception) {
                compensateRestore(borrow);
                throw new BusinessException(502, "failed to update borrow");
            }
        }
    }

    Object lockFor(Long id) {
        return locks.computeIfAbsent(id, key -> new Object());
    }

    private void requireActive(BorrowDto borrow) {
        if (borrow.status() != BorrowStatus.BORROWED) {
            throw new BusinessException(409, "borrow is not active");
        }
    }

    private void compensateCreate(BorrowDto borrow) {
        try {
            borrowClient.delete(borrow.id());
        } catch (RuntimeException exception) {
            log.warn("failed to compensate borrow {} after stock deduction failure", borrow.id(), exception);
        }
    }

    private void compensateRestore(BorrowDto borrow) {
        try {
            materialClient.deduct(borrow.materialId(), borrow.quantity());
        } catch (RuntimeException exception) {
            log.warn("failed to compensate material {} after borrow update failure", borrow.materialId(), exception);
        }
    }
}
