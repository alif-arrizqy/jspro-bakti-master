package models

import (
	"context"
	"fmt"
	"sparepart-management-services/internal/database"
	sqlcdb "sparepart-management-services/internal/database/sqlc"
)

// Seed runs database seeders
func Seed(ctx context.Context) error {
	queries := sqlcdb.New(database.GetDB())

	// Seed Locations
	locationData := []struct {
		Region  sqlcdb.RegionType
		Regency string
		Cluster string
	}{
		// Region MALUKU
		{sqlcdb.RegionTypeMALUKU, "Kepulauan Tanimbar", "Wakpapapi/Saumlaki"},
		{sqlcdb.RegionTypeMALUKU, "Kepulauan Aru", "Dobo"},
		{sqlcdb.RegionTypeMALUKU, "Seram Bagian Timur", "Bula"},
		{sqlcdb.RegionTypeMALUKU, "Seram Bagian Barat", "Ambon"},
		{sqlcdb.RegionTypeMALUKU, "Halmahera Selatan", "Ternate/Bacan"},
		{sqlcdb.RegionTypeMALUKU, "Halmahera Timur", "Haltim"},
		{sqlcdb.RegionTypeMALUKU, "Halmahera Barat", "Haltim"},

		// Region PAPUA
		{sqlcdb.RegionTypePAPUA, "Sorsel/sorong", "Basecamp Kantor Sorong"},
		{sqlcdb.RegionTypePAPUA, "Sorsel/sorong", "Teminabuan/Sorsel"},
		{sqlcdb.RegionTypePAPUA, "Sorsel/sorong", "Maybrat"},
		{sqlcdb.RegionTypePAPUA, "Sorsel/sorong", "Wondama & Mansel"},
		{sqlcdb.RegionTypePAPUA, "Jayapura", "Merauke/Wamena"},
	}

	// Create locations and get their IDs
	locationMap := make(map[string]int32) // key: "region:regency:cluster"
	
	// Get all existing locations first
	allLocs, err := queries.ListLocations(ctx, sqlcdb.ListLocationsParams{
		Column1: "",
		Column2: "",
		Column3: "",
		Limit:   1000,
		Offset:  0,
	})
	if err != nil {
		return err
	}

	// Build map of existing locations
	existingLocMap := make(map[string]int32)
	for _, loc := range allLocs {
		key := string(loc.Region) + ":" + loc.Regency + ":" + loc.Cluster
		existingLocMap[key] = loc.ID
	}

	// Create or use existing locations
	for _, loc := range locationData {
		key := string(loc.Region) + ":" + loc.Regency + ":" + loc.Cluster
		
		if existingID, exists := existingLocMap[key]; exists {
			locationMap[key] = existingID
		} else {
			// Create new location
			createParams := sqlcdb.CreateLocationParams{
				Region:  loc.Region,
				Regency: loc.Regency,
				Cluster: loc.Cluster,
			}
			created, err := queries.CreateLocation(ctx, createParams)
			if err != nil {
				// If unique constraint error, location might have been created concurrently
				// Try to find it again
				allLocs, listErr := queries.ListLocations(ctx, sqlcdb.ListLocationsParams{
					Column1: "",
					Column2: "",
					Column3: "",
					Limit:   1000,
					Offset:  0,
				})
				if listErr != nil {
					return err
				}
				for _, l := range allLocs {
					if l.Region == loc.Region && l.Regency == loc.Regency && l.Cluster == loc.Cluster {
						locationMap[key] = l.ID
						break
					}
				}
				if locationMap[key] == 0 {
					return err
				}
			} else {
				locationMap[key] = created.ID
			}
		}
	}

	// Seed Contact Persons
	contactPersons := []struct {
		PIC      string
		Phone    string
		Location string // "region:regency:cluster"
	}{
		// Region MALUKU - Kepulauan Tanimbar
		{"Hendra", "0812-1801-2081", "MALUKU:Kepulauan Tanimbar:Wakpapapi/Saumlaki"},
		// Region MALUKU - Kepulauan Aru
		{"Hendra", "0812-1801-2082", "MALUKU:Kepulauan Aru:Dobo"},
		// Region MALUKU - Seram Bagian Timur
		{"Abdul Haris", "0822-3819-7091", "MALUKU:Seram Bagian Timur:Bula"},
		// Region MALUKU - Seram Bagian Barat
		{"Etok", "0812-1752-0288", "MALUKU:Seram Bagian Barat:Ambon"},
		// Region MALUKU - Halmahera Selatan
		{"Syamir", "0813-4645-1563", "MALUKU:Halmahera Selatan:Ternate/Bacan"},
		// Region MALUKU - Halmahera Timur
		{"Soni", "0821-1446-0179", "MALUKU:Halmahera Timur:Haltim"},
		// Region MALUKU - Halmahera Barat
		{"Soni", "0821-1446-0180", "MALUKU:Halmahera Barat:Haltim"},
	}

	// Get all existing contact persons
	allContacts, err := queries.ListContactPersons(ctx, sqlcdb.ListContactPersonsParams{
		Column1: 0, // NULL means all
		Limit:   1000,
		Offset:  0,
	})
	if err != nil {
		return err
	}

	// Build map of existing contact persons
	existingCPMap := make(map[string]bool) // key: "location_id:pic:phone"
	for _, cp := range allContacts {
		key := fmt.Sprintf("%d:%s:%s", cp.LocationID, cp.Pic, cp.Phone)
		existingCPMap[key] = true
	}

	for _, cp := range contactPersons {
		locationID, exists := locationMap[cp.Location]
		if !exists {
			continue // Skip if location not found
		}

		key := fmt.Sprintf("%d:%s:%s", locationID, cp.PIC, cp.Phone)
		if !existingCPMap[key] {
			// Contact person doesn't exist, create it
			createParams := sqlcdb.CreateContactPersonParams{
				LocationID: locationID,
				Pic:        cp.PIC,
				Phone:      cp.Phone,
			}
			_, err := queries.CreateContactPerson(ctx, createParams)
			if err != nil {
				// Ignore unique constraint errors (might have been created concurrently)
				// For simplicity, we'll continue on any error
				continue
			}
		}
	}

	// Seed Sparepart
	spareparts := []struct {
		Name     string
		ItemType sqlcdb.ItemType
	}{
		{"EHUB", sqlcdb.ItemTypeSPAREPART},
		{"SCC SRNE", sqlcdb.ItemTypeSPAREPART},
		{"SCC EPEVER", sqlcdb.ItemTypeSPAREPART},
		{"KONTROL PANEL + SCC", sqlcdb.ItemTypeSPAREPART},
		{"KONTROL PANEL Tanpa SCC", sqlcdb.ItemTypeSPAREPART},
		{"BUSBAR 12", sqlcdb.ItemTypeSPAREPART},
		{"BUSBAR 4", sqlcdb.ItemTypeSPAREPART},
		{"PANEL 2", sqlcdb.ItemTypeSPAREPART},
		{"BMS", sqlcdb.ItemTypeSPAREPART},
	}

	// Get all existing spareparts
	allSpareparts, err := queries.ListSparepartMasters(ctx, sqlcdb.ListSparepartMastersParams{
		Column1: "",
		Column2: "",
		Limit:   1000,
		Offset:  0,
	})
	if err != nil {
		return err
	}

	existingSPMap := make(map[string]bool)
	for _, sp := range allSpareparts {
		existingSPMap[sp.Name] = true
	}

	for _, sp := range spareparts {
		if !existingSPMap[sp.Name] {
			createParams := sqlcdb.CreateSparepartMasterParams{
				Name:     sp.Name,
				ItemType: sp.ItemType,
			}
			_, err := queries.CreateSparepartMaster(ctx, createParams)
			if err != nil {
				// Ignore unique constraint errors
				continue
			}
		}
	}

	// Seed Tools Alker
	toolsAlker := []struct {
		Name     string
		ItemType sqlcdb.ItemType
	}{
		{"ALAT WAKEUP", sqlcdb.ItemTypeTOOLSALKER},
		{"KABEL CHARGING EXTERNAL", sqlcdb.ItemTypeTOOLSALKER},
		{"CAN BOX BATTERY", sqlcdb.ItemTypeTOOLSALKER},
	}

	for _, tool := range toolsAlker {
		if !existingSPMap[tool.Name] {
			createParams := sqlcdb.CreateSparepartMasterParams{
				Name:     tool.Name,
				ItemType: tool.ItemType,
			}
			_, err := queries.CreateSparepartMaster(ctx, createParams)
			if err != nil {
				// Ignore unique constraint errors
				continue
			}
		}
	}

	return nil
}
