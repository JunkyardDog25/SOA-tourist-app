package com.soa.purchaseService.configuration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;

/**
 * Forwards the Authorization header from the current inbound request to
 * outgoing RestClient calls. No-op if there is no active servlet request
 * context (e.g. background threads, tests).
 */
@Component
public class AuthForwardingInterceptor implements ClientHttpRequestInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AuthForwardingInterceptor.class);

    @Override
    public ClientHttpResponse intercept(HttpRequest request,
                                        byte[] body,
                                        ClientHttpRequestExecution execution) throws IOException {
        try {
            var attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes servletAttrs) {
                String authHeader = servletAttrs.getRequest().getHeader("Authorization");
                if (authHeader != null && !authHeader.isBlank()) {
                    request.getHeaders().set("Authorization", authHeader);
                }
            }
        } catch (Exception e) {
            log.debug("Could not forward Authorization header: {}", e.getMessage());
        }
        return execution.execute(request, body);
    }
}
