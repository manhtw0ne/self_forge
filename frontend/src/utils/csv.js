// Spreadsheet apps may execute formulas even when a CSV cell is quoted.
export function encodeCsv(rows){
 const cell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 return rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
