package com.lab.gateway.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private final ObjectMapper objectMapper;

    public GlobalExceptionHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Result<Void>> handleBusiness(BusinessException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(Result.error(exception.getStatus(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse("validation failed");
        return ResponseEntity.badRequest().body(Result.error(400, message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Result<Void>> handleUnreadable(HttpMessageNotReadableException exception) {
        return ResponseEntity.badRequest().body(Result.error(400, "invalid request body"));
    }

    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<Result<Void>> handleRemote(RestClientResponseException exception) {
        int status = exception.getStatusCode().value();
        return ResponseEntity.status(status)
                .body(Result.error(status, remoteMessage(exception.getResponseBodyAsString())));
    }

    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<Result<Void>> handleUnavailable(ResourceAccessException exception) {
        return ResponseEntity.status(502).body(Result.error(502, "service unavailable"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleUnexpected(Exception exception) {
        return ResponseEntity.status(500).body(Result.error(500, "internal error"));
    }

    private String remoteMessage(String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            if (node.hasNonNull("message")) {
                return node.get("message").asText();
            }
        } catch (Exception ignored) {
            // fall through to the generic message
        }
        return "remote service error";
    }
}
