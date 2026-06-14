package com.soa.authService.configuration;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class HttpRequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startNanos = System.nanoTime();
        try {
            filterChain.doFilter(request, response);
        } finally {
            String path = request.getRequestURI();
            if (!path.contains("/actuator")) {
                long durationMs = (System.nanoTime() - startNanos) / 1_000_000L;
                log.info(
                        "HTTP request method={} path={} status_code={} duration_ms={}",
                        request.getMethod(),
                        path,
                        response.getStatus(),
                        durationMs);
            }
        }
    }
}
