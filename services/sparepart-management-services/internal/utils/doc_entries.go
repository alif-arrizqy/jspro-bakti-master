package utils

import (
	"encoding/json"
	"strings"
)

// DocumentationEntry represents a single documentation/photo entry stored
// inside the `documentation` JSONB column of stock/tools tables.
//
// Date is optional (user may or may not fill it). Stored as ISO date string
// (YYYY-MM-DD) to keep the JSON compact and human readable.
type DocumentationEntry struct {
	Path string  `json:"path"`
	Date *string `json:"date,omitempty"`
}

// ParseDocumentation decodes a JSONB payload into entries.
//
// It is backward compatible with the legacy schema where the column held a
// plain `[]string` of paths. Empty / nil input yields an empty slice.
func ParseDocumentation(data []byte) []DocumentationEntry {
	trimmed := strings.TrimSpace(string(data))
	if len(trimmed) == 0 || trimmed == "null" {
		return []DocumentationEntry{}
	}

	var entries []DocumentationEntry
	if err := json.Unmarshal(data, &entries); err == nil {
		result := make([]DocumentationEntry, 0, len(entries))
		for _, e := range entries {
			if e.Path == "" {
				continue
			}
			result = append(result, e)
		}
		if len(result) > 0 || strings.HasPrefix(trimmed, "[{") {
			return result
		}
	}

	var paths []string
	if err := json.Unmarshal(data, &paths); err == nil {
		result := make([]DocumentationEntry, 0, len(paths))
		for _, p := range paths {
			if p == "" {
				continue
			}
			result = append(result, DocumentationEntry{Path: p})
		}
		return result
	}

	return []DocumentationEntry{}
}

// SerializeDocumentation encodes entries back into JSONB-friendly bytes.
// Always returns a valid JSON array (`[]` when empty).
func SerializeDocumentation(entries []DocumentationEntry) []byte {
	if len(entries) == 0 {
		return []byte("[]")
	}
	data, err := json.Marshal(entries)
	if err != nil {
		return []byte("[]")
	}
	return data
}

// EntriesToPaths extracts the path part from entries. Useful when we just
// need the on-disk paths (e.g. when deleting files).
func EntriesToPaths(entries []DocumentationEntry) []string {
	out := make([]string, 0, len(entries))
	for _, e := range entries {
		out = append(out, e.Path)
	}
	return out
}

// LegacyPathsToEntries wraps a slice of paths into entries without dates.
func LegacyPathsToEntries(paths []string) []DocumentationEntry {
	out := make([]DocumentationEntry, 0, len(paths))
	for _, p := range paths {
		if p == "" {
			continue
		}
		out = append(out, DocumentationEntry{Path: p})
	}
	return out
}
