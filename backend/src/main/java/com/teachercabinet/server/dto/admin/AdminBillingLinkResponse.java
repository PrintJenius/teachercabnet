package com.teachercabinet.server.dto.admin;

public record AdminBillingLinkResponse(
        String label,
        String description,
        String url
) {
}
