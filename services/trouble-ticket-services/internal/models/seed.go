package models

import (
	"context"
	"trouble-ticket-services/internal/database"
	sqlcdb "trouble-ticket-services/internal/database/sqlc"
)

// Seed runs database seeders
func Seed(ctx context.Context) error {
	queries := sqlcdb.New(database.GetDB())

	// Seed type_ticket
	typeTickets := []string{
		"TT-Down",
		"TT-Warning",
	}

	existingTypes, err := queries.ListTypeTickets(ctx)
	if err != nil {
		return err
	}
	existingTypeMap := make(map[string]bool)
	for _, t := range existingTypes {
		existingTypeMap[t.Name] = true
	}

	for _, name := range typeTickets {
		if !existingTypeMap[name] {
			_, err := queries.CreateTypeTicket(ctx, name)
			if err != nil {
				continue
			}
		}
	}

	// Seed problem_master
	problems := []string{
		"SNMP Down",
		"SNMP Anomali",
		"SNMP Up Down",
		"SNMP Grafik Putus-putus",
		"SOMO Power",
		"SOMO BTS",
		"Low Batt",
		"SCC Problem",
		"Baterai Problem",
		"LVD Disconnect",
		"SCC Charging Rendah",
		"Faktor Cuaca",
		"KAHAR (Bencana Alam)",
		"Vandalisme",
		"Site Terbakar",
		"Power Down",
		"Modem VSAT",
	}

	existingProblems, err := queries.ListProblemMasters(ctx)
	if err != nil {
		return err
	}
	existingProblemMap := make(map[string]bool)
	for _, p := range existingProblems {
		existingProblemMap[p.Name] = true
	}

	for _, name := range problems {
		if !existingProblemMap[name] {
			_, err := queries.CreateProblemMaster(ctx, name)
			if err != nil {
				continue
			}
		}
	}

	// Seed pic
	pics := []string{
		"Sundaya",
		"APT",
		"VSAT",
	}

	existingPics, err := queries.ListPics(ctx)
	if err != nil {
		return err
	}
	existingPicMap := make(map[string]bool)
	for _, p := range existingPics {
		existingPicMap[p.Name] = true
	}

	for _, name := range pics {
		if !existingPicMap[name] {
			_, err := queries.CreatePic(ctx, name)
			if err != nil {
				continue
			}
		}
	}

	return nil
}
