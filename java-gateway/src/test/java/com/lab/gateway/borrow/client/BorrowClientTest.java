package com.lab.gateway.borrow.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.lab.gateway.borrow.dto.BorrowCreateRequest;
import com.lab.gateway.borrow.dto.BorrowDto;
import com.lab.gateway.borrow.dto.BorrowPatchRequest;
import com.lab.gateway.common.enums.BorrowStatus;
import com.lab.gateway.support.RestClientTestSupport;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class BorrowClientTest {

    private static final String BASE = "http://localhost:8081";
    private static final String BORROW_JSON = """
            {"id":1,"personId":1,"materialId":1,"quantity":2,
             "borrowTime":"2026-11-04T02:00:00Z","dueTime":"2026-11-11T02:00:00Z",
             "returnTime":null,"status":"BORROWED"}
            """;

    private MockRestServiceServer server;
    private BorrowClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClientTestSupport.builder(BASE);
        server = MockRestServiceServer.bindTo(builder).build();
        client = new BorrowClient(builder.build());
    }

    @Test
    void getsBorrow() {
        server.expect(requestTo(BASE + "/borrows/1"))
                .andRespond(withSuccess(BORROW_JSON, MediaType.APPLICATION_JSON));

        BorrowDto borrow = client.get(1L);

        assertThat(borrow.status()).isEqualTo(BorrowStatus.BORROWED);
        assertThat(borrow.borrowTime()).isEqualTo(Instant.parse("2026-11-04T02:00:00Z"));
        server.verify();
    }

    @Test
    void listsBorrowsWithFilters() {
        server.expect(requestTo(BASE + "/borrows?personId=1&materialId=1&status=BORROWED"))
                .andRespond(withSuccess("[" + BORROW_JSON + "]", MediaType.APPLICATION_JSON));

        assertThat(client.list(1L, 1L, BorrowStatus.BORROWED)).hasSize(1);
        server.verify();
    }

    @Test
    void omitsEmptyFilters() {
        server.expect(requestTo(BASE + "/borrows"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        assertThat(client.list(null, null, null)).isEmpty();
        server.verify();
    }

    @Test
    void createsBorrowWithBorrowTime() {
        server.expect(requestTo(BASE + "/borrows"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.personId", is(1)))
                .andExpect(jsonPath("$.materialId", is(1)))
                .andExpect(jsonPath("$.quantity", is(2)))
                .andExpect(jsonPath("$.borrowTime", notNullValue()))
                .andExpect(jsonPath("$.dueTime", is("2026-11-11T02:00:00Z")))
                .andRespond(withStatus(HttpStatus.CREATED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(BORROW_JSON));

        BorrowDto borrow = client.create(new BorrowCreateRequest(1L, 1L, 2, Instant.parse("2026-11-11T02:00:00Z")));

        assertThat(borrow.id()).isEqualTo(1L);
        server.verify();
    }

    @Test
    void updatesBorrowAndOmitsNullPatchFields() {
        server.expect(requestTo(BASE + "/borrows/1"))
                .andExpect(method(HttpMethod.PUT))
                .andExpect(content().json("{\"status\":\"RETURNED\",\"returnTime\":\"2026-11-05T00:00:00Z\"}"))
                .andRespond(withSuccess(BORROW_JSON, MediaType.APPLICATION_JSON));

        client.update(1L, new BorrowPatchRequest(BorrowStatus.RETURNED, Instant.parse("2026-11-05T00:00:00Z")));

        server.verify();
    }

    @Test
    void deletesBorrow() {
        server.expect(requestTo(BASE + "/borrows/1"))
                .andExpect(method(HttpMethod.DELETE))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        client.delete(1L);

        server.verify();
    }
}
