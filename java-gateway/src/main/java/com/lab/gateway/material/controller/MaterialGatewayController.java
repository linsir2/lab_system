package com.lab.gateway.material.controller;

import com.lab.gateway.borrow.client.BorrowClient;
import com.lab.gateway.common.BusinessException;
import com.lab.gateway.common.Result;
import com.lab.gateway.common.enums.BorrowStatus;
import com.lab.gateway.material.client.MaterialClient;
import com.lab.gateway.material.dto.MaterialDto;
import com.lab.gateway.material.dto.MaterialRequest;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/materials")
public class MaterialGatewayController {

    private final MaterialClient materialClient;
    private final BorrowClient borrowClient;

    public MaterialGatewayController(MaterialClient materialClient, BorrowClient borrowClient) {
        this.materialClient = materialClient;
        this.borrowClient = borrowClient;
    }

    @GetMapping
    public Result<List<MaterialDto>> list() {
        return Result.success(materialClient.list());
    }

    @GetMapping("/{id}")
    public Result<MaterialDto> get(@PathVariable Long id) {
        return Result.success(materialClient.get(id));
    }

    @PostMapping
    public ResponseEntity<Result<MaterialDto>> create(@Valid @RequestBody MaterialRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Result.created(materialClient.create(request)));
    }

    @PutMapping("/{id}")
    public Result<MaterialDto> update(@PathVariable Long id, @Valid @RequestBody MaterialRequest request) {
        return Result.success(materialClient.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!borrowClient.list(null, id, BorrowStatus.BORROWED).isEmpty()) {
            throw new BusinessException(409, "material has active borrows");
        }
        materialClient.delete(id);
    }
}
