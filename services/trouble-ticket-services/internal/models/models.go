package models

// TicketStatus represents the status enum values
type TicketStatus string

const (
	TicketStatusProgress TicketStatus = "progress"
	TicketStatusClosed   TicketStatus = "closed"
	TicketStatusPending  TicketStatus = "pending"
)
