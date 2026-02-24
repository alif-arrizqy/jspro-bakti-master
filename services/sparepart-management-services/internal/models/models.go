package models

// Enums untuk request validation dan compatibility
type StockType string

const (
	StockTypeNew  StockType = "NEW_STOCK"
	StockTypeUsed StockType = "USED_STOCK"
)

type ItemType string

const (
	ItemTypeSparepart  ItemType = "SPAREPART"
	ItemTypeToolsAlker ItemType = "TOOLS_ALKER"
)

type Region string

const (
	RegionMaluku         Region = "MALUKU"
	RegionMalukuUtara    Region = "MALUKU_UTARA"
	RegionPapua          Region = "PAPUA"
	RegionPapuaBarat     Region = "PAPUA_BARAT"
	RegionPapuaBaratDaya Region = "PAPUA_BARAT_DAYA"
	RegionPapuaSelatan   Region = "PAPUA_SELATAN"
)
