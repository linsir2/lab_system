package com.lab.gateway.borrow.controller;

import com.lab.gateway.borrow.client.BorrowClient;
import com.lab.gateway.borrow.dto.BorrowCreateRequest;
import com.lab.gateway.borrow.dto.BorrowDto;
import com.lab.gateway.borrow.service.BorrowOrchestrator;
import com.lab.gateway.borrow.view.BorrowDetailView;
import com.lab.gateway.borrow.view.BorrowDetailView.MaterialSummary;
import com.lab.gateway.borrow.view.BorrowDetailView.PersonSummary;
import com.lab.gateway.common.BusinessException;
import com.lab.gateway.common.Result;
import com.lab.gateway.common.enums.BorrowStatus;
import com.lab.gateway.material.client.MaterialClient;
import com.lab.gateway.material.dto.MaterialDto;
import com.lab.gateway.person.entity.Person;
import com.lab.gateway.person.service.PersonService;
import jakarta.validation.Valid;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientResponseException;

@RestController
@RequestMapping("/api/borrows")
public class BorrowGatewayController {

    private final BorrowClient borrowClient;
    private final BorrowOrchestrator orchestrator;
    private final PersonService personService;
    private final MaterialClient materialClient;

    public BorrowGatewayController(
            BorrowClient borrowClient,
            BorrowOrchestrator orchestrator,
            PersonService personService,
            MaterialClient materialClient) {
        this.borrowClient = borrowClient;
        this.orchestrator = orchestrator;
        this.personService = personService;
        this.materialClient = materialClient;
    }

    @GetMapping
    public Result<List<BorrowDto>> list(
            @RequestParam(required = false) Long personId,
            @RequestParam(required = false) Long materialId,
            @RequestParam(required = false) BorrowStatus status) {
        return Result.success(borrowClient.list(personId, materialId, status));
    }

    @GetMapping("/{id}")
    public Result<BorrowDto> get(@PathVariable Long id) {
        return Result.success(borrowClient.get(id));
    }

    @GetMapping("/{id}/detail")
    public Result<BorrowDetailView> detail(@PathVariable Long id) {
        BorrowDto borrow = borrowClient.get(id);
        PersonSummary person = personSummary(borrow.personId());
        MaterialSummary material = materialSummary(borrow.materialId());
        return Result.success(new BorrowDetailView(borrow, person, material, overdueDays(borrow)));
    }

    @PostMapping
    public ResponseEntity<Result<BorrowDto>> create(@Valid @RequestBody BorrowCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Result.created(orchestrator.create(request)));
    }

    @PutMapping("/{id}/return")
    public Result<BorrowDto> returnBorrow(@PathVariable Long id) {
        return Result.success(orchestrator.returnBorrow(id));
    }

    @DeleteMapping("/{id}")
    public Result<BorrowDto> cancel(@PathVariable Long id) {
        return Result.success(orchestrator.cancel(id));
    }

    private PersonSummary personSummary(Long id) {
        try {
            Person person = personService.get(id);
            return new PersonSummary(person.getId(), person.getName(), person.getRole(), false);
        } catch (BusinessException exception) {
            if (exception.getStatus() == 404) {
                return new PersonSummary(id, null, null, true);
            }
            throw exception;
        }
    }

    private MaterialSummary materialSummary(Long id) {
        try {
            MaterialDto material = materialClient.get(id);
            return new MaterialSummary(material.id(), material.name(), false);
        } catch (BusinessException exception) {
            if (exception.getStatus() == 404) {
                return new MaterialSummary(id, null, true);
            }
            throw exception;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                return new MaterialSummary(id, null, true);
            }
            throw exception;
        }
    }

    private long overdueDays(BorrowDto borrow) {
        Instant end = borrow.returnTime() != null ? borrow.returnTime() : Instant.now();
        return Math.max(0, Duration.between(borrow.dueTime(), end).toDays());
    }
}
