import Excel from "exceljs";

interface ExcelInput {
  log: Array<Record<string, unknown>>;
  site: string;
  uptime: number;
  sumVolt: number;
  v3?: boolean;
  date: string;
}

export const generateLegacySla3Workbook = ({ log, site, uptime, sumVolt, v3, date }: ExcelInput): Excel.Workbook => {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet(site.toUpperCase());

  let columns: Array<{ header: string; key: string; width: number }>;
  if (!log[0] || log[0]["pv3_curr"] === undefined || log[0]["pv3_curr"] === null) {
    columns = [
      { header: "Date Time", key: "ts", width: 23 },
      { header: "Eh1", key: "eh1", width: 12 },
      { header: "Eh2", key: "eh2", width: 7 },
      { header: "Vsat Curr", key: "vsat_curr", width: 10 },
      { header: "Bts Curr", key: "bts_curr", width: 10 },
      { header: "Obl Curr", key: "obl_curr", width: 10 },
      { header: "Batt Volt", key: "batt_volt", width: 10 },
      { header: "Edl1", key: "edl1", width: 10 },
      { header: "Edl2", key: "edl2", width: 10 },
      { header: "Lvd1", key: "lvd1", width: 10 },
      { header: "Lvd2", key: "lvd2", width: 10 },
      { header: "Pv1Curr", key: "pv1_curr", width: 10 },
      { header: "Pv2Curr", key: "pv2_curr", width: 10 },
      { header: "pv1Volt", key: "pv1_volt", width: 10 },
      { header: "pv2Volt", key: "pv2_volt", width: 10 },
      { header: "Duration", key: "duration", width: 10 },
      { header: "Real", key: "real", width: 10 },
      { header: "Flag Status", key: "flag_status", width: 15 },
    ];
  } else {
    columns = [
      { header: "Date Time", key: "ts", width: 23 },
      { header: "Eh1", key: "eh1", width: 12 },
      { header: "Eh2", key: "eh2", width: 7 },
      { header: "Vsat Curr", key: "vsat_curr", width: 10 },
      { header: "Bts Curr", key: "bts_curr", width: 10 },
      { header: "Obl Curr", key: "obl_curr", width: 10 },
      { header: "Batt Volt", key: "batt_volt", width: 10 },
      { header: "Edl1", key: "edl1", width: 10 },
      { header: "Edl2", key: "edl2", width: 10 },
      { header: "Lvd1", key: "lvd1", width: 10 },
      { header: "Lvd2", key: "lvd2", width: 10 },
      { header: "Pv1Curr", key: "pv1_curr", width: 10 },
      { header: "Pv2Curr", key: "pv2_curr", width: 10 },
      { header: "Pv3Curr", key: "pv3_curr", width: 10 },
      { header: "pv1Volt", key: "pv1_volt", width: 10 },
      { header: "pv2Volt", key: "pv2_volt", width: 10 },
      { header: "pv3Volt", key: "pv3_volt", width: 10 },
      { header: "Duration", key: "duration", width: 10 },
      { header: "Real", key: "real", width: 10 },
      { header: "Flag Status", key: "flag_status", width: 15 },
    ];
  }

  const newColumn = { header: "Eh3", key: "eh3", width: 10 };
  if (v3) {
    columns.splice(3, 0, newColumn);
  }

  worksheet.columns = columns;
  worksheet.addRows(log);

  worksheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell((cell) => {
      cell.font = { size: 12 };
      cell.alignment = { vertical: "bottom", horizontal: "right" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  const array = new Array([], [], []);
  const duration = ["Duration", uptime];
  const battVolt = ["Batt Volt", +sumVolt];
  const val1 = "LOG POWER JOULE STORE PRO";
  const val2 = `Site ${site}`;
  const val3 = date;
  const fontH = { size: 14, bold: true };
  const alignH = { vertical: "middle" as const, horizontal: "center" as const };

  const dataHeading =
    !log[0] || log[0]["pv3_curr"] === undefined || log[0]["pv3_curr"] === null
      ? [
          { h: "A1:R1", c: "A1", val: val1 },
          { h: "A2:R2", c: "A2", val: val2 },
          { h: "A3:R3", c: "A3", val: val3 },
        ]
      : [
          { h: "A1:S1", c: "A1", val: val1 },
          { h: "A2:S2", c: "A2", val: val2 },
          { h: "A3:S3", c: "A3", val: val3 },
        ];

  worksheet.spliceRows(1, 0, ...array, duration, battVolt, []);
  dataHeading.forEach((el) => {
    const cell = worksheet.getCell(el.c);
    worksheet.mergeCells(el.h);
    cell.value = el.val;
    cell.font = fontH;
    cell.alignment = alignH;
  });
  worksheet.getRow(4).font = fontH;
  worksheet.getRow(5).font = fontH;
  worksheet.getRow(4).alignment = alignH;
  worksheet.getRow(5).alignment = alignH;
  worksheet.getRow(7).font = { size: 13, bold: true };
  worksheet.getRow(7).alignment = { vertical: "middle", horizontal: "center" };

  return workbook;
};
