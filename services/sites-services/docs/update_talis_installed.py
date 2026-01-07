import pandas as pd
import json
from datetime import datetime
import re

# Read Excel file - check the SLA sheet
excel_file = 'SLA DES 2025.xlsx'

# Read from SLA sheet with header at row 2 (0-indexed: row 2 = index 2)
df = pd.read_excel(excel_file, sheet_name='SLA', header=2)

print("Columns found:")
print(df.columns.tolist())

# Find the columns
talis_col = None
site_name_col = None

for col in df.columns:
    col_str = str(col).lower().replace('\n', ' ').replace('\r', ' ')
    if 'done instal' in col_str and 'talis' in col_str:
        talis_col = col
    if 'nama site' in col_str or ('site' in col_str and 'name' in col_str):
        site_name_col = col

print(f"\nTalis column: {talis_col}")
print(f"Site name column: {site_name_col}")

if not talis_col or not site_name_col:
    print("\nTrying other sheets...")
    # Try Talis Full and Talis Mix sheets
    for sheet_name in ['Talis Full', 'Talis Mix']:
        try:
            df_sheet = pd.read_excel(excel_file, sheet_name=sheet_name, header=1)
            print(f"\nColumns in {sheet_name}:")
            print(df_sheet.columns.tolist())
            
            for col in df_sheet.columns:
                col_str = str(col).lower().replace('\n', ' ').replace('\r', ' ')
                if 'done instal' in col_str and 'talis' in col_str:
                    talis_col = col
                if 'nama site' in col_str or ('site' in col_str and 'name' in col_str):
                    site_name_col = col
            
            if talis_col and site_name_col:
                df = df_sheet
                break
        except:
            continue

if talis_col and site_name_col:
    print(f"\nUsing columns: {site_name_col} -> {talis_col}")
    
    # Create mapping from site_name to talis_installed date
    talis_map = {}
    
    for idx, row in df.iterrows():
        site_name = str(row[site_name_col]).strip() if pd.notna(row[site_name_col]) else None
        talis_date = row[talis_col]
        
        if site_name and pd.notna(talis_date) and str(talis_date).strip().lower() not in ['nan', 'none', '']:
            # Convert date to string format YYYY-MM-DD
            talis_date_str = None
            
            if isinstance(talis_date, datetime):
                talis_date_str = talis_date.strftime('%Y-%m-%d')
            elif isinstance(talis_date, pd.Timestamp):
                talis_date_str = talis_date.strftime('%Y-%m-%d')
            else:
                # Try to parse as date string
                talis_date_str = str(talis_date).strip()
                
                # Try to convert various date formats
                date_formats = [
                    '%Y-%m-%d %H:%M:%S',  # 2025-10-06 00:00:00
                    '%Y-%m-%d',            # 2025-10-06
                    '%d %B %Y',           # 12 December 2024
                    '%d %b %Y',           # 12 Dec 2024
                    '%d/%m/%Y',           # 06/10/2025
                    '%d-%m-%Y',           # 06-10-2025
                    '%d %B %Y',           # 6 September 2025
                    '%d %b %Y',           # 6 sept 2025
                ]
                
                parsed = False
                for fmt in date_formats:
                    try:
                        dt = datetime.strptime(talis_date_str, fmt)
                        talis_date_str = dt.strftime('%Y-%m-%d')
                        parsed = True
                        break
                    except:
                        continue
                
                if not parsed:
                    # Try to extract date from string like "6 sept 2025"
                    date_match = re.search(r'(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})', talis_date_str, re.IGNORECASE)
                    if date_match:
                        day, month_str, year = date_match.groups()
                        month_map = {
                            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
                            'januari': 1, 'februari': 2, 'maret': 3, 'april': 4, 'mei': 5, 'juni': 6,
                            'juli': 7, 'agustus': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
                        }
                        month = month_map.get(month_str.lower()[:3], None)
                        if month:
                            try:
                                dt = datetime(int(year), month, int(day))
                                talis_date_str = dt.strftime('%Y-%m-%d')
                                parsed = True
                            except:
                                pass
            
            if talis_date_str:
                # Normalize site name for matching
                site_name_normalized = site_name.lower().strip()
                talis_map[site_name_normalized] = talis_date_str
                if len(talis_map) <= 10:  # Print first 10 mappings
                    print(f"  {site_name_normalized} -> {talis_date_str}")
    
    print(f"\nTotal mappings created: {len(talis_map)}")
    
    # Also read from other sheets if available
    for sheet_name in ['Talis Full', 'Talis Mix']:
        try:
            df_sheet = pd.read_excel(excel_file, sheet_name=sheet_name, header=1)
            for idx, row in df_sheet.iterrows():
                site_name = str(row[site_name_col]).strip() if pd.notna(row[site_name_col]) else None
                talis_date = row[talis_col]
                
                if site_name and pd.notna(talis_date) and str(talis_date).strip().lower() not in ['nan', 'none', '']:
                    site_name_normalized = site_name.lower().strip()
                    # Only add if not already in map (prioritize SLA sheet)
                    if site_name_normalized not in talis_map:
                        # Convert date
                        if isinstance(talis_date, datetime):
                            talis_date_str = talis_date.strftime('%Y-%m-%d')
                        elif isinstance(talis_date, pd.Timestamp):
                            talis_date_str = talis_date.strftime('%Y-%m-%d')
                        else:
                            talis_date_str = str(talis_date).strip()
                            # Try parsing
                            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d %B %Y', '%d %b %Y', '%d/%m/%Y', '%d-%m-%Y']:
                                try:
                                    dt = datetime.strptime(talis_date_str, fmt)
                                    talis_date_str = dt.strftime('%Y-%m-%d')
                                    break
                                except:
                                    continue
                        
                        if talis_date_str and talis_date_str not in ['nan', 'none', '']:
                            talis_map[site_name_normalized] = talis_date_str
        except:
            continue
    
    print(f"Total mappings after reading all sheets: {len(talis_map)}")
    
    # Read JSON file
    json_file = 'newDatas.json'
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Update talis_installed field
    updated_count = 0
    not_found = []
    
    for item in data:
        site_name = item.get('site_name', '').strip().lower()
        
        # Try exact match first
        if site_name in talis_map:
            item['talis_installed'] = talis_map[site_name]
            updated_count += 1
        else:
            # Try to find with variations (underscores, hyphens, spaces)
            found = False
            for key in talis_map.keys():
                # Normalize both for comparison
                key_normalized = key.replace('_', '-').replace(' ', '-')
                site_normalized = site_name.replace('_', '-').replace(' ', '-')
                
                if key_normalized == site_normalized:
                    item['talis_installed'] = talis_map[key]
                    updated_count += 1
                    found = True
                    break
            
            if not found:
                not_found.append(site_name)
    
    print(f"\nUpdated {updated_count} records")
    if not_found:
        print(f"\nSites not found in Excel (first 20): {not_found[:20]}")
        print(f"Total not found: {len(not_found)}")
    
    # Write updated JSON
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nUpdated {json_file} successfully!")
else:
    print("\nERROR: Could not find required columns in Excel file")
    print("Please check the Excel file structure")
