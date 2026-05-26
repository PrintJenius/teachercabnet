package com.teachercabinet.server.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.storage")
public record StorageProperties(
        String localDir,
        String publicUrlPrefix,
        String uploadPathPrefix
) {
    public String normalizedUploadPrefix() {
        String prefix = uploadPathPrefix == null ? "/uploads" : uploadPathPrefix.trim();
        if (!prefix.startsWith("/")) {
            prefix = "/" + prefix;
        }
        if (prefix.endsWith("/")) {
            prefix = prefix.substring(0, prefix.length() - 1);
        }
        return prefix;
    }

    public String normalizedPublicUrlPrefix() {
        String base = publicUrlPrefix == null ? "http://localhost:8080" : publicUrlPrefix.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }
}
