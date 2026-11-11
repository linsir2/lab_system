package com.lab.gateway.person.controller;

import com.lab.gateway.borrow.client.BorrowClient;
import com.lab.gateway.common.BusinessException;
import com.lab.gateway.common.Result;
import com.lab.gateway.common.enums.BorrowStatus;
import com.lab.gateway.common.enums.PersonRole;
import com.lab.gateway.common.enums.PersonStatus;
import com.lab.gateway.person.dto.PersonRequest;
import com.lab.gateway.person.entity.Person;
import com.lab.gateway.person.service.PersonService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/persons")
public class PersonController {

    private final PersonService service;
    private final BorrowClient borrowClient;

    public PersonController(PersonService service, BorrowClient borrowClient) {
        this.service = service;
        this.borrowClient = borrowClient;
    }

    @GetMapping
    public Result<List<Person>> list(
            @RequestParam(required = false) PersonRole role,
            @RequestParam(required = false) PersonStatus status) {
        return Result.success(service.list(role, status));
    }

    @GetMapping("/{id}")
    public Result<Person> get(@PathVariable Long id) {
        return Result.success(service.get(id));
    }

    @PostMapping
    public ResponseEntity<Result<Person>> create(@Valid @RequestBody PersonRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Result.created(service.create(request)));
    }

    @PutMapping("/{id}")
    public Result<Person> update(@PathVariable Long id, @Valid @RequestBody PersonRequest request) {
        return Result.success(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!borrowClient.list(id, null, BorrowStatus.BORROWED).isEmpty()) {
            throw new BusinessException(409, "person has active borrows");
        }
        service.delete(id);
    }
}
