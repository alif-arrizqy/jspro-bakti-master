package handlers

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"
	"trouble-ticket-services/internal/database"
	sqlcdb "trouble-ticket-services/internal/database/sqlc"
	"trouble-ticket-services/internal/services"
	"trouble-ticket-services/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

type TroubleTicketHandler struct {
	logger  *zap.Logger
	queries *sqlcdb.Queries
}

func NewTroubleTicketHandler() *TroubleTicketHandler {
	return &TroubleTicketHandler{
		logger:  utils.GetLogger(),
		queries: sqlcdb.New(database.GetDB()),
	}
}

type ticketListItem struct {
	TicketNumber   string                       `json:"ticketNumber"`
	TicketType     string                       `json:"ticketType"`
	DateDown       string                       `json:"dateDown"`
	DurationDown   string                       `json:"durationDown"`
	SlaAvg         *float64                     `json:"slaAvg"`
	SlaUnit        string                       `json:"slaUnit"`
	SiteID         string                       `json:"siteId"`
	PrCode         *string                      `json:"prCode"`
	SiteName       string                       `json:"siteName"`
	Province       string                       `json:"province"`
	BatteryVersion string                       `json:"batteryVersion"`
	ContactPerson  []services.ContactPersonItem `json:"contactPerson"`
	Problem        []problemItem                `json:"problem"`
	Pic            []picItem                    `json:"pic"`
	PlanCM         string                       `json:"planCm"`
	Action         string                       `json:"action"`
	Status         string                       `json:"status"`
}

type problemItem struct {
	ProblemID   int32  `json:"problemId"`
	ProblemName string `json:"problemName"`
}

type picItem struct {
	PicID   int32  `json:"picId"`
	PicName string `json:"picName"`
}

type progressItem struct {
	Date   string `json:"date"`
	Action string `json:"action"`
}

type ticketResponse struct {
	TicketNumber string   `json:"ticketNumber"`
	TicketTypeID int32    `json:"ticketTypeId"`
	DateDown     string   `json:"dateDown"`
	SiteID       string   `json:"siteId"`
	SlaAvg       *float64 `json:"slaAvg"`
	PicID        int32    `json:"picId"`
	PlanCm       string   `json:"planCm"`
	Action       string   `json:"action"`
	Status       string   `json:"status"`
}

type progressResponse struct {
	TicketNumber string `json:"ticketNumber"`
	Date         string `json:"date"`
	Action       string `json:"action"`
}

func (h *TroubleTicketHandler) generateUniqueTicketNumber(ctx context.Context) (string, error) {
	for i := 0; i < 10; i++ {
		num := fmt.Sprintf("%06d", rand.Intn(1000000))
		exists, err := h.queries.CheckTicketNumberExists(ctx, num)
		if err != nil {
			return "", err
		}
		if !exists {
			return num, nil
		}
	}
	return "", fmt.Errorf("failed to generate unique ticket number after 10 attempts")
}

// numericToFloat64 safely converts pgtype.Numeric to *float64
func numericToFloat64(n pgtype.Numeric) *float64 {
	if !n.Valid {
		return nil
	}
	f, err := n.Float64Value()
	if err != nil || !f.Valid {
		return nil
	}
	val := f.Float64
	return &val
}

// Create handles POST /api/v1/trouble-ticket
func (h *TroubleTicketHandler) Create(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		TicketType int32   `json:"ticketType" binding:"required"`
		DateDown   string  `json:"dateDown" binding:"required"`
		SiteID     string  `json:"siteId" binding:"required"`
		ProblemID  []int32 `json:"problemId" binding:"required,min=1"`
		PicID      int32   `json:"picId" binding:"required"`
		PlanCM     string  `json:"planCM"`
		Action     string  `json:"action" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	dateDown, err := time.Parse("2006-01-02", req.DateDown)
	if err != nil {
		utils.BadRequest(c, "Invalid dateDown format, use YYYY-MM-DD")
		return
	}

	// Validate that the site exists in sites-services
	if _, err := services.GetSiteByID(req.SiteID); err != nil {
		utils.BadRequest(c, fmt.Sprintf("Site not found: %s", req.SiteID))
		return
	}

	// Fetch SLA average from sla-services for current month
	startDate := utils.FirstDayOfMonth().Format("2006-01-02")
	endDate := utils.LastDayOfMonth().Format("2006-01-02")
	slaAvg, _, slaErr := services.GetSlaForSite(req.SiteID, startDate, endDate)
	if slaErr != nil {
		h.logger.Warn("Failed to fetch SLA, setting default to 0", zap.Error(slaErr))
		slaAvg = 0 // Default to 0 if fetching fails
	}

	// Generate unique ticket number
	ticketNumber, err := h.generateUniqueTicketNumber(ctx)
	if err != nil {
		utils.HandleError(c, err, "Failed to generate ticket number", h.logger)
		return
	}

	// Prepare sla_avg — always store the value (default 0 if error occurred)
	var slaAvgNumeric pgtype.Numeric
	_ = slaAvgNumeric.Scan(fmt.Sprintf("%.2f", slaAvg))

	// Prepare date for pgtype
	var pgDate pgtype.Date
	_ = pgDate.Scan(dateDown)

	ticket, err := h.queries.CreateTroubleTicket(ctx, sqlcdb.CreateTroubleTicketParams{
		TicketNumber: ticketNumber,
		TicketTypeID: req.TicketType,
		DateDown:     pgDate,
		SiteID:       req.SiteID,
		SlaAvg:       slaAvgNumeric,
		PicID:        req.PicID,
		PlanCm:       req.PlanCM,
		Action:       req.Action,
	})
	if err != nil {
		utils.HandleError(c, err, "Failed to create trouble ticket", h.logger)
		return
	}

	// Insert problem associations
	for _, problemID := range req.ProblemID {
		_, err := h.queries.CreateTroubleTicketProblem(ctx, sqlcdb.CreateTroubleTicketProblemParams{
			TicketNumber: ticketNumber,
			ProblemID:    problemID,
		})
		if err != nil {
			h.logger.Warn("Failed to insert problem association",
				zap.String("ticketNumber", ticketNumber),
				zap.Int32("problemID", problemID),
				zap.Error(err))
		}
	}

	// Convert database response to snake_case format
	slaAvgPtr := numericToFloat64(ticket.SlaAvg)
	ticketResp := ticketResponse{
		TicketNumber: ticket.TicketNumber,
		TicketTypeID: ticket.TicketTypeID,
		DateDown:     ticket.DateDown.Time.Format("2006-01-02"),
		SiteID:       ticket.SiteID,
		SlaAvg:       slaAvgPtr,
		PicID:        ticket.PicID,
		PlanCm:       ticket.PlanCm,
		Action:       ticket.Action,
		Status:       string(ticket.Status),
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse{
		Status:  "success",
		Message: "Trouble ticket created successfully",
		Data:    ticketResp,
	})
}

// GetAll handles GET /api/v1/trouble-ticket
func (h *TroubleTicketHandler) GetAll(c *gin.Context) {
	ctx := c.Request.Context()

	statusFilter := c.Query("status")
	ticketTypeFilter, _ := strconv.ParseInt(c.Query("ticketType"), 10, 32)
	siteIDFilter := c.Query("siteId")
	siteNameFilter := c.Query("siteName")

	limitParam, _ := strconv.ParseInt(c.Query("limit"), 10, 32)
	pageParam, _ := strconv.ParseInt(c.Query("page"), 10, 32)
	if limitParam <= 0 {
		limitParam = 100
	}
	if pageParam <= 0 {
		pageParam = 1
	}
	offset := (pageParam - 1) * limitParam

	emptyPagination := utils.PaginationMetadata{
		Page:       int(pageParam),
		Limit:      int(limitParam),
		Total:      0,
		TotalPages: 0,
	}

	// If siteName is provided, search external sites-services to get matching site IDs.
	// Early-return empty if no sites match — prevents SQL from ignoring the filter.
	siteIDsFromName := []string{}
	if siteNameFilter != "" {
		ids, err := services.SearchSites(siteNameFilter)
		if err != nil {
			h.logger.Warn("Failed to search sites by name", zap.String("siteName", siteNameFilter), zap.Error(err))
			utils.SuccessPaginated(c, "Trouble tickets retrieved successfully", []ticketListItem{}, emptyPagination)
			return
		}
		if len(ids) == 0 {
			utils.SuccessPaginated(c, "Trouble tickets retrieved successfully", []ticketListItem{}, emptyPagination)
			return
		}
		siteIDsFromName = ids
	}

	// Get total count for pagination metadata
	total, err := h.queries.CountTroubleTickets(ctx, sqlcdb.CountTroubleTicketsParams{
		Column1: statusFilter,
		Column2: int32(ticketTypeFilter),
		Column3: siteIDFilter,
		Column4: siteIDsFromName,
	})
	if err != nil {
		h.logger.Warn("Failed to count trouble tickets", zap.Error(err))
	}

	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(limitParam) - 1) / int64(limitParam))
	}
	pagination := utils.PaginationMetadata{
		Page:       int(pageParam),
		Limit:      int(limitParam),
		Total:      total,
		TotalPages: totalPages,
	}

	tickets, err := h.queries.ListTroubleTickets(ctx, sqlcdb.ListTroubleTicketsParams{
		Column1: statusFilter,
		Column2: int32(ticketTypeFilter),
		Column3: siteIDFilter,
		Limit:   int32(limitParam),
		Offset:  int32(offset),
		Column6: siteIDsFromName,
	})
	if err != nil {
		utils.HandleError(c, err, "Failed to get trouble tickets", h.logger)
		return
	}

	if len(tickets) == 0 {
		utils.SuccessPaginated(c, "Trouble tickets retrieved successfully", []ticketListItem{}, pagination)
		return
	}

	// Collect unique ticket numbers and site IDs for batch lookups
	ticketNumbers := make([]string, len(tickets))
	siteIDs := make([]string, 0, len(tickets))
	siteIDSet := make(map[string]bool)
	for i, t := range tickets {
		ticketNumbers[i] = t.TicketNumber
		if !siteIDSet[t.SiteID] {
			siteIDs = append(siteIDs, t.SiteID)
			siteIDSet[t.SiteID] = true
		}
	}

	// Batch fetch problems for all tickets
	problemRows, err := h.queries.GetTroubleTicketProblemsByTicketNumbers(ctx, ticketNumbers)
	if err != nil {
		h.logger.Warn("Failed to fetch problems", zap.Error(err))
	}

	problemMap := make(map[string][]problemItem)
	for _, p := range problemRows {
		problemMap[p.TicketNumber] = append(problemMap[p.TicketNumber], problemItem{
			ProblemID:   p.ProblemID,
			ProblemName: p.ProblemName,
		})
	}

	// Batch fetch site data and SLA data from external services
	startDate := utils.FirstDayOfMonth().Format("2006-01-02")
	endDate := utils.LastDayOfMonth().Format("2006-01-02")
	siteMap, _ := services.BuildSiteMap(siteIDs)
	slaMap := services.BuildSlaMap(siteIDs, startDate, endDate)

	result := make([]ticketListItem, 0, len(tickets))
	for _, t := range tickets {
		site := siteMap[t.SiteID]

		var slaAvgPtr *float64
		var slaUnit string
		if sla, ok := slaMap[t.SiteID]; ok {
			v := sla.Average
			slaAvgPtr = &v
			slaUnit = sla.Unit
		}

		item := ticketListItem{
			TicketNumber:   t.TicketNumber,
			TicketType:     t.TicketTypeName,
			DateDown:       t.DateDown.Time.Format("2006-01-02"),
			DurationDown:   utils.DurationDownDays(t.DateDown.Time),
			SlaAvg:         slaAvgPtr,
			SlaUnit:        slaUnit,
			SiteID:         t.SiteID,
			PrCode:         site.PrCode,
			SiteName:       site.SiteName,
			Province:       site.Province,
			BatteryVersion: site.BatteryVersion,
			ContactPerson:  site.ContactPerson,
			Problem:        problemMap[t.TicketNumber],
			Pic:            []picItem{{PicID: t.PicID, PicName: t.PicName}},
			PlanCM:         t.PlanCm,
			Action:         t.Action,
			Status:         string(t.Status),
		}
		if item.Problem == nil {
			item.Problem = []problemItem{}
		}
		if item.ContactPerson == nil {
			item.ContactPerson = []services.ContactPersonItem{}
		}
		result = append(result, item)
	}

	utils.SuccessPaginated(c, "Trouble tickets retrieved successfully", result, pagination)
}

// GetProgress handles GET /api/v1/trouble-ticket/progress/:ticketNumber
func (h *TroubleTicketHandler) GetProgress(c *gin.Context) {
	ctx := c.Request.Context()
	ticketNumber := c.Param("ticketNumber")

	limitParam, _ := strconv.ParseInt(c.Query("limit"), 10, 32)
	pageParam, _ := strconv.ParseInt(c.Query("page"), 10, 32)
	if limitParam <= 0 {
		limitParam = 20
	}
	if pageParam <= 0 {
		pageParam = 1
	}

	ticket, err := h.queries.GetTroubleTicket(ctx, ticketNumber)
	if err != nil {
		utils.NotFound(c, "Trouble ticket not found")
		return
	}

	problems, err := h.queries.GetTroubleTicketProblems(ctx, ticketNumber)
	if err != nil {
		utils.HandleError(c, err, "Failed to get ticket problems", h.logger)
		return
	}

	progressList, err := h.queries.GetTroubleTicketProgress(ctx, ticketNumber)
	if err != nil {
		utils.HandleError(c, err, "Failed to get ticket progress", h.logger)
		return
	}

	// Fetch site data from sites-services
	site, err := services.GetSiteByID(ticket.SiteID)
	if err != nil {
		h.logger.Warn("Failed to fetch site data", zap.String("siteId", ticket.SiteID), zap.Error(err))
		site = &services.SiteData{
			SiteID:        ticket.SiteID,
			ContactPerson: []services.ContactPersonItem{},
		}
	}

	// Fetch SLA from sla-services for current month
	startDate := utils.FirstDayOfMonth().Format("2006-01-02")
	endDate := utils.LastDayOfMonth().Format("2006-01-02")
	slaAvg, slaUnit, slaErr := services.GetSlaForSite(ticket.SiteID, startDate, endDate)
	if slaErr != nil {
		h.logger.Warn("Failed to fetch SLA", zap.String("siteId", ticket.SiteID), zap.Error(slaErr))
	}

	problemIDs := make([]int32, len(problems))
	for i, p := range problems {
		problemIDs[i] = p.ProblemID
	}

	// Paginate progress items
	totalProgress := int64(len(progressList))
	offset := (pageParam - 1) * limitParam
	end := offset + limitParam
	if offset > int64(totalProgress) {
		offset = int64(totalProgress)
	}
	if end > int64(totalProgress) {
		end = int64(totalProgress)
	}
	progressItems := make([]progressItem, 0, end-offset)
	for _, p := range progressList[offset:end] {
		progressItems = append(progressItems, progressItem{
			Date:   p.Date.Time.Format("2006-01-02"),
			Action: p.Action,
		})
	}

	totalProgressPages := 0
	if totalProgress > 0 {
		totalProgressPages = int((totalProgress + int64(limitParam) - 1) / int64(limitParam))
	}

	var slaAvgPtr *float64
	if slaErr == nil {
		v := slaAvg
		slaAvgPtr = &v
	}

	result := gin.H{
		"ticketNumber":   ticket.TicketNumber,
		"ticketType":     ticket.TicketTypeName,
		"dateDown":       ticket.DateDown.Time.Format("2006-01-02"),
		"durationDown":   utils.DurationDownDays(ticket.DateDown.Time),
		"siteId":         ticket.SiteID,
		"prCode":         site.PrCode,
		"siteName":       site.SiteName,
		"province":       site.Province,
		"batteryVersion": site.BatteryVersion,
		"contactPerson":  site.ContactPerson,
		"slaAvg":         slaAvgPtr,
		"slaUnit":        slaUnit,
		"problemId":      problemIDs,
		"picId":          ticket.PicID,
		"picName":        ticket.PicName,
		"planCm":         ticket.PlanCm,
		"action":         ticket.Action,
		"status":         string(ticket.Status),
		"progress":       progressItems,
	}

	utils.SuccessPaginated(c, "Trouble ticket retrieved successfully", result, utils.PaginationMetadata{
		Page:       int(pageParam),
		Limit:      int(limitParam),
		Total:      totalProgress,
		TotalPages: totalProgressPages,
	})
}

// AddProgress handles PUT /api/v1/trouble-ticket/progress/:ticketNumber
func (h *TroubleTicketHandler) AddProgress(c *gin.Context) {
	ctx := c.Request.Context()
	ticketNumber := c.Param("ticketNumber")

	ticket, err := h.queries.GetTroubleTicket(ctx, ticketNumber)
	if err != nil {
		utils.NotFound(c, "Trouble ticket not found")
		return
	}

	// Validate ticket status - cannot add progress if ticket is closed
	fmt.Println(ticket.Status)
	if string(ticket.Status) == "closed" {
		utils.BadRequest(c, "Cannot add progress to a closed ticket")
		return
	}

	var req struct {
		Date   string `json:"date" binding:"required"`
		Action string `json:"action" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		utils.BadRequest(c, "Invalid date format, use YYYY-MM-DD")
		return
	}

	var pgDate pgtype.Date
	_ = pgDate.Scan(date)

	progress, err := h.queries.CreateTroubleTicketProgress(ctx, sqlcdb.CreateTroubleTicketProgressParams{
		TicketNumber: ticketNumber,
		Date:         pgDate,
		Action:       req.Action,
	})
	if err != nil {
		utils.HandleError(c, err, "Failed to add progress", h.logger)
		return
	}

	progressResp := progressResponse{
		TicketNumber: progress.TicketNumber,
		Date:         progress.Date.Time.Format("2006-01-02"),
		Action:       progress.Action,
	}

	utils.Success(c, "Progress added successfully", progressResp)
}

// CloseTicket handles PUT /api/v1/trouble-ticket/:ticketNumber
func (h *TroubleTicketHandler) CloseTicket(c *gin.Context) {
	ctx := c.Request.Context()
	ticketNumber := c.Param("ticketNumber")

	ticket, err := h.queries.GetTroubleTicket(ctx, ticketNumber)
	if err != nil {
		utils.NotFound(c, "Trouble ticket not found")
		return
	}

	// Validate ticket status - cannot close if already closed
	if string(ticket.Status) == "closed" {
		utils.BadRequest(c, "Ticket is already closed")
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
		Date   string `json:"date" binding:"required"`
		Action string `json:"action" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if req.Status != "closed" {
		utils.BadRequest(c, "Status must be 'closed'")
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		utils.BadRequest(c, "Invalid date format, use YYYY-MM-DD")
		return
	}

	closedTicket, err := h.queries.CloseTroubleTicket(ctx, ticketNumber)
	if err != nil {
		utils.HandleError(c, err, "Failed to close trouble ticket", h.logger)
		return
	}

	var pgDate pgtype.Date
	_ = pgDate.Scan(date)

	_, err = h.queries.CreateTroubleTicketProgress(ctx, sqlcdb.CreateTroubleTicketProgressParams{
		TicketNumber: ticketNumber,
		Date:         pgDate,
		Action:       req.Action,
	})
	if err != nil {
		h.logger.Warn("Failed to record closing progress", zap.Error(err))
	}

	// Convert database response to snake_case format
	slaAvgPtr := numericToFloat64(closedTicket.SlaAvg)
	ticketResp := ticketResponse{
		TicketNumber: closedTicket.TicketNumber,
		TicketTypeID: closedTicket.TicketTypeID,
		DateDown:     closedTicket.DateDown.Time.Format("2006-01-02"),
		SiteID:       closedTicket.SiteID,
		SlaAvg:       slaAvgPtr,
		PicID:        closedTicket.PicID,
		PlanCm:       closedTicket.PlanCm,
		Action:       closedTicket.Action,
		Status:       string(closedTicket.Status),
	}

	utils.Success(c, "Trouble ticket closed successfully", ticketResp)
}

// UpdateTicket handles PUT /api/v1/trouble-ticket/:ticketNumber
func (h *TroubleTicketHandler) UpdateTicket(c *gin.Context) {
	ctx := c.Request.Context()
	ticketNumber := c.Param("ticketNumber")

	ticket, err := h.queries.GetTroubleTicket(ctx, ticketNumber)
	if err != nil {
		utils.NotFound(c, "Trouble ticket not found")
		return
	}

	if string(ticket.Status) == "closed" {
		utils.BadRequest(c, "Cannot edit a closed ticket")
		return
	}

	var req struct {
		TicketType int32   `json:"ticketType" binding:"required"`
		DateDown   string  `json:"dateDown" binding:"required"`
		SiteID     string  `json:"siteId" binding:"required"`
		ProblemID  []int32 `json:"problemId" binding:"required,min=1"`
		PicID      int32   `json:"picId" binding:"required"`
		PlanCM     string  `json:"planCM"`
		Action     string  `json:"action" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	// Validate that the site exists in sites-services
	if _, siteErr := services.GetSiteByID(req.SiteID); siteErr != nil {
		utils.BadRequest(c, fmt.Sprintf("Site not found: %s", req.SiteID))
		return
	}

	// Re-fetch SLA for the (possibly new) site
	startDate := utils.FirstDayOfMonth().Format("2006-01-02")
	endDate := utils.LastDayOfMonth().Format("2006-01-02")
	slaAvg, _, slaErr := services.GetSlaForSite(req.SiteID, startDate, endDate)
	if slaErr != nil {
		h.logger.Warn("Failed to fetch SLA on update", zap.Error(slaErr))
		slaAvg = 0
	}

	// Update the trouble_ticket row
	pool := database.GetDB()
	_, err = pool.Exec(ctx,
		"UPDATE trouble_ticket SET ticket_type_id=$1, date_down=$2, site_id=$3, pic_id=$4, plan_cm=$5, action=$6, sla_avg=$7 WHERE ticket_number=$8",
		req.TicketType, req.DateDown, req.SiteID, req.PicID, req.PlanCM, req.Action, fmt.Sprintf("%.2f", slaAvg), ticketNumber,
	)
	if err != nil {
		utils.HandleError(c, err, "Failed to update trouble ticket", h.logger)
		return
	}

	// Replace problem associations
	if err := h.queries.DeleteTroubleTicketProblems(ctx, ticketNumber); err != nil {
		h.logger.Warn("Failed to clear old problems on update", zap.Error(err))
	}
	for _, problemID := range req.ProblemID {
		if _, err := h.queries.CreateTroubleTicketProblem(ctx, sqlcdb.CreateTroubleTicketProblemParams{
			TicketNumber: ticketNumber,
			ProblemID:    problemID,
		}); err != nil {
			h.logger.Warn("Failed to insert problem on update", zap.Int32("problemID", problemID), zap.Error(err))
		}
	}

	slaAvgPtr := &slaAvg
	ticketResp := ticketResponse{
		TicketNumber: ticketNumber,
		TicketTypeID: ticket.TicketTypeID,
		DateDown:     ticket.DateDown.Time.Format("2006-01-02"),
		SiteID:       req.SiteID,
		SlaAvg:       slaAvgPtr,
		PicID:        req.PicID,
		PlanCm:       req.PlanCM,
		Action:       req.Action,
		Status:       string(ticket.Status),
	}

	utils.Success(c, "Trouble ticket updated successfully", ticketResp)
}

// DeleteTicket handles DELETE /api/v1/trouble-ticket/:ticketNumber
func (h *TroubleTicketHandler) DeleteTicket(c *gin.Context) {
	ctx := c.Request.Context()
	ticketNumber := c.Param("ticketNumber")

	if _, err := h.queries.GetTroubleTicket(ctx, ticketNumber); err != nil {
		utils.NotFound(c, "Trouble ticket not found")
		return
	}

	pool := database.GetDB()
	if _, err := pool.Exec(ctx, "DELETE FROM trouble_ticket WHERE ticket_number=$1", ticketNumber); err != nil {
		utils.HandleError(c, err, "Failed to delete trouble ticket", h.logger)
		return
	}

	utils.Success(c, "Trouble ticket deleted successfully", nil)
}

// Refresh handles GET /api/v1/trouble-ticket/refresh
func (h *TroubleTicketHandler) Refresh(c *gin.Context) {
	ctx := c.Request.Context()

	tickets, err := h.queries.GetAllTroubleTickets(ctx)
	if err != nil {
		utils.HandleError(c, err, "Failed to get trouble tickets", h.logger)
		return
	}

	if len(tickets) == 0 {
		utils.Success(c, "No tickets to refresh", nil)
		return
	}

	startDate := utils.FirstDayOfMonth().Format("2006-01-02")
	endDate := utils.LastDayOfMonth().Format("2006-01-02")

	updated := 0
	for _, t := range tickets {
		slaAvg, _, slaErr := services.GetSlaForSite(t.SiteID, startDate, endDate)
		if slaErr != nil {
			h.logger.Warn("Failed to fetch SLA for ticket",
				zap.String("ticketNumber", t.TicketNumber),
				zap.String("siteId", t.SiteID),
				zap.Error(slaErr))
			continue
		}

		var slaNumeric pgtype.Numeric
		_ = slaNumeric.Scan(fmt.Sprintf("%.2f", slaAvg))

		err = h.queries.UpdateTroubleTicketSlaAvg(ctx, sqlcdb.UpdateTroubleTicketSlaAvgParams{
			TicketNumber: t.TicketNumber,
			SlaAvg:       slaNumeric,
		})
		if err != nil {
			h.logger.Warn("Failed to update SLA for ticket",
				zap.String("ticketNumber", t.TicketNumber),
				zap.Error(err))
		} else {
			updated++
		}
	}

	utils.Success(c, fmt.Sprintf("Refreshed %d tickets", updated), gin.H{
		"total":   len(tickets),
		"updated": updated,
	})
}
