package com.lab.gateway.material.client;

import com.lab.gateway.material.dto.MaterialDto;
import com.lab.gateway.material.dto.MaterialRequest;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class MaterialClient {

    private static final ParameterizedTypeReference<List<MaterialDto>> MATERIAL_LIST =
            new ParameterizedTypeReference<>() {
            };

    private final RestClient restClient;

    public MaterialClient(@Qualifier("materialRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public List<MaterialDto> list() {
        return restClient.get().uri("/materials").retrieve().body(MATERIAL_LIST);
    }

    public MaterialDto get(Long id) {
        return restClient.get().uri("/materials/{id}", id).retrieve().body(MaterialDto.class);
    }

    public MaterialDto create(MaterialRequest request) {
        return restClient.post().uri("/materials").body(request).retrieve().body(MaterialDto.class);
    }

    public MaterialDto update(Long id, MaterialRequest request) {
        return restClient.put().uri("/materials/{id}", id).body(request).retrieve().body(MaterialDto.class);
    }

    public void delete(Long id) {
        restClient.delete().uri("/materials/{id}", id).retrieve().toBodilessEntity();
    }

    public MaterialDto deduct(Long id, int quantity) {
        return restClient.post().uri("/materials/{id}/deduct", id)
                .body(Map.of("quantity", quantity))
                .retrieve()
                .body(MaterialDto.class);
    }

    public MaterialDto restore(Long id, int quantity) {
        return restClient.post().uri("/materials/{id}/restore", id)
                .body(Map.of("quantity", quantity))
                .retrieve()
                .body(MaterialDto.class);
    }
}
