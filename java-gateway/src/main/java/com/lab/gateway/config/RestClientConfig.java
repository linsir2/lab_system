package com.lab.gateway.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient materialRestClient(
            RestClient.Builder builder,
            @Value("${services.material.base-url}") String baseUrl) {
        return build(builder, baseUrl);
    }

    @Bean
    public RestClient borrowRestClient(
            RestClient.Builder builder,
            @Value("${services.borrow.base-url}") String baseUrl) {
        return build(builder, baseUrl);
    }

    private RestClient build(RestClient.Builder builder, String baseUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        return builder.baseUrl(baseUrl).requestFactory(requestFactory).build();
    }
}
