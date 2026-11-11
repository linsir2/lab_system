package com.lab.gateway.borrow.client;

import com.lab.gateway.borrow.dto.BorrowCreateRequest;
import com.lab.gateway.borrow.dto.BorrowDto;
import com.lab.gateway.borrow.dto.BorrowPatchRequest;
import com.lab.gateway.common.enums.BorrowStatus;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class BorrowClient {

    private static final ParameterizedTypeReference<List<BorrowDto>> BORROW_LIST =
            new ParameterizedTypeReference<>() {
            };

    private final RestClient restClient;

    public BorrowClient(@Qualifier("borrowRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public List<BorrowDto> list(Long personId, Long materialId, BorrowStatus status) {
        return restClient.get()
                .uri(uriBuilder -> {
                    uriBuilder.path("/borrows");
                    if (personId != null) {
                        uriBuilder.queryParam("personId", personId);
                    }
                    if (materialId != null) {
                        uriBuilder.queryParam("materialId", materialId);
                    }
                    if (status != null) {
                        uriBuilder.queryParam("status", status);
                    }
                    return uriBuilder.build();
                })
                .retrieve()
                .body(BORROW_LIST);
    }

    public BorrowDto get(Long id) {
        return restClient.get().uri("/borrows/{id}", id).retrieve().body(BorrowDto.class);
    }

    public BorrowDto create(BorrowCreateRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("personId", request.personId());
        body.put("materialId", request.materialId());
        body.put("quantity", request.quantity());
        body.put("borrowTime", Instant.now());
        body.put("dueTime", request.dueTime());
        return restClient.post().uri("/borrows").body(body).retrieve().body(BorrowDto.class);
    }

    public BorrowDto update(Long id, BorrowPatchRequest patch) {
        return restClient.put().uri("/borrows/{id}", id).body(patch).retrieve().body(BorrowDto.class);
    }

    public void delete(Long id) {
        restClient.delete().uri("/borrows/{id}", id).retrieve().toBodilessEntity();
    }
}
