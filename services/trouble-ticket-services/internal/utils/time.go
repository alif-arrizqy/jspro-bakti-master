package utils

import (
	"fmt"
	"time"
)

// DurationDownHours calculates hours since the given date
func DurationDownHours(dateDown time.Time) float64 {
	return time.Since(dateDown).Hours()
}

// DurationDownDays calculates days since the given date, returns e.g. "178 Hari"
func DurationDownDays(dateDown time.Time) string {
	days := int(time.Since(dateDown).Hours() / 24)
	return fmt.Sprintf("%d Hari", days)
}

// FormatUptime formats uptime seconds into human-readable string
func FormatUptime(seconds float64) string {
	duration := time.Duration(seconds) * time.Second
	days := int(duration.Hours()) / 24
	hours := int(duration.Hours()) % 24
	minutes := int(duration.Minutes()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	}
	if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, minutes)
	}
	return fmt.Sprintf("%dm", minutes)
}

// FirstDayOfMonth returns the first day of the current month
func FirstDayOfMonth() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
}

// LastDayOfMonth returns the last day of the current month
func LastDayOfMonth() time.Time {
	now := time.Now()
	firstOfNext := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())
	return firstOfNext.AddDate(0, 0, -1)
}
