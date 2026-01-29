package utils

import (
	"fmt"
	"strings"
)

// FormatUptime converts seconds to human-readable format (e.g., "6m 16s", "1h 2m 3s", "2d 3h 4m 5s")
func FormatUptime(seconds float64) string {
	days := int(seconds / 86400)
	hours := int((int(seconds) % 86400) / 3600)
	minutes := int((int(seconds) % 3600) / 60)
	secs := int(seconds) % 60

	var parts []string
	if days > 0 {
		parts = append(parts, fmt.Sprintf("%dd", days))
	}
	if hours > 0 {
		parts = append(parts, fmt.Sprintf("%dh", hours))
	}
	if minutes > 0 {
		parts = append(parts, fmt.Sprintf("%dm", minutes))
	}
	if secs > 0 || len(parts) == 0 {
		parts = append(parts, fmt.Sprintf("%ds", secs))
	}

	return strings.Join(parts, " ")
}
