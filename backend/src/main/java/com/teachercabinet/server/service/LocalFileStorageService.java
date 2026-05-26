package com.teachercabinet.server.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.teachercabinet.server.config.StorageProperties;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LocalFileStorageService {

    private static final Set<String> ALLOWED_CATEGORIES = Set.of("journal", "profile", "general");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );
    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final StorageProperties storageProperties;

    public String store(MultipartFile file, String category) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일이 비어 있습니다.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일 크기는 5MB 이하여야 합니다.");
        }

        String contentType = file.getContentType();
        if (!StringUtils.hasText(contentType) || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PNG, JPEG, WEBP 이미지만 업로드할 수 있습니다.");
        }

        String safeCategory = normalizeCategory(category);
        String extension = extensionFor(contentType);
        String fileName = UUID.randomUUID() + extension;
        Path directory = resolveRoot().resolve(safeCategory);
        Path destination = directory.resolve(fileName);

        try {
            Files.createDirectories(directory);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, destination, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "파일 저장에 실패했습니다: " + e.getMessage());
        }

        String relativePath = storageProperties.normalizedUploadPrefix()
                + "/" + safeCategory + "/" + fileName;
        return storageProperties.normalizedPublicUrlPrefix() + relativePath;
    }

    private Path resolveRoot() {
        return Path.of(storageProperties.localDir()).toAbsolutePath().normalize();
    }

    private static String normalizeCategory(String category) {
        String value = StringUtils.hasText(category) ? category.trim().toLowerCase(Locale.ROOT) : "general";
        if (!ALLOWED_CATEGORIES.contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 파일 종류입니다.");
        }
        return value;
    }

    private static String extensionFor(String contentType) {
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}
