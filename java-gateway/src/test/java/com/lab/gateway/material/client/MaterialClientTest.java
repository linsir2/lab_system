package com.lab.gateway.material.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.lab.gateway.material.dto.MaterialDto;
import com.lab.gateway.material.dto.MaterialRequest;
import com.lab.gateway.support.RestClientTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class MaterialClientTest {

    private static final String BASE = "http://localhost:8082";

    private MockRestServiceServer server;
    private MaterialClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClientTestSupport.builder(BASE);
        server = MockRestServiceServer.bindTo(builder).build();
        client = new MaterialClient(builder.build());
    }

    @Test
    void listsMaterials() {
        server.expect(requestTo(BASE + "/materials"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("[{\"id\":1,\"name\":\"示波器\",\"quantity\":10}]", MediaType.APPLICATION_JSON));

        assertThat(client.list()).extracting(MaterialDto::name).containsExactly("示波器");
        server.verify();
    }

    @Test
    void getsMaterial() {
        server.expect(requestTo(BASE + "/materials/1"))
                .andRespond(withSuccess("{\"id\":1,\"name\":\"示波器\",\"quantity\":10}", MediaType.APPLICATION_JSON));

        MaterialDto material = client.get(1L);

        assertThat(material.id()).isEqualTo(1L);
        assertThat(material.quantity()).isEqualTo(10);
        server.verify();
    }

    @Test
    void createsAndUpdatesMaterial() {
        server.expect(requestTo(BASE + "/materials"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().json("{\"name\":\"示波器\",\"quantity\":10}"))
                .andRespond(withStatus(HttpStatus.CREATED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"id\":1,\"name\":\"示波器\",\"quantity\":10}"));
        server.expect(requestTo(BASE + "/materials/1"))
                .andExpect(method(HttpMethod.PUT))
                .andExpect(content().json("{\"name\":\"数字示波器\",\"quantity\":8}"))
                .andRespond(withSuccess("{\"id\":1,\"name\":\"数字示波器\",\"quantity\":8}", MediaType.APPLICATION_JSON));

        assertThat(client.create(new MaterialRequest("示波器", 10)).id()).isEqualTo(1L);
        assertThat(client.update(1L, new MaterialRequest("数字示波器", 8)).quantity()).isEqualTo(8);
        server.verify();
    }

    @Test
    void deletesMaterial() {
        server.expect(requestTo(BASE + "/materials/1"))
                .andExpect(method(HttpMethod.DELETE))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        client.delete(1L);

        server.verify();
    }

    @Test
    void deductsAndRestoresStock() {
        server.expect(requestTo(BASE + "/materials/1/deduct"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.quantity", is(2)))
                .andRespond(withSuccess("{\"id\":1,\"name\":\"示波器\",\"quantity\":8}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(BASE + "/materials/1/restore"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.quantity", is(2)))
                .andRespond(withSuccess("{\"id\":1,\"name\":\"示波器\",\"quantity\":10}", MediaType.APPLICATION_JSON));

        assertThat(client.deduct(1L, 2).quantity()).isEqualTo(8);
        assertThat(client.restore(1L, 2).quantity()).isEqualTo(10);
        server.verify();
    }
}
