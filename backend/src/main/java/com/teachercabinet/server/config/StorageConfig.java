package com.teachercabinet.server.config;

import java.nio.file.Path;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableConfigurationProperties(StorageProperties.class)
@RequiredArgsConstructor
public class StorageConfig implements WebMvcConfigurer {

    private final StorageProperties storageProperties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String prefix = storageProperties.normalizedUploadPrefix();
        Path root = Path.of(storageProperties.localDir()).toAbsolutePath().normalize();
        String location = root.toUri().toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler(prefix + "/**")
                .addResourceLocations(location);
    }
}
