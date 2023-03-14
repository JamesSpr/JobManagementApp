import pandas as pd

def AddJobToSpreadsheet(jobData):
    print("Adding to Spreadsheet")
    po_sheet = pd.read_excel(r"C:\Users\Aurify Constructions\Aurify Dropbox\5. Projects\02 - Brookfield WR\BGIS Work - 2020 - TestCopy.xlsm", sheet_name="Purchase Orders (POs)")
    print(po_sheet)
    
    xl = pd.ExcelFile(r"C:\Users\Aurify Constructions\Aurify Dropbox\5. Projects\02 - Brookfield WR\BGIS Work - 2020 - TestCopy.xlsm")
    df = xl.parse("Purchase Orders (POs)")

    print(df)