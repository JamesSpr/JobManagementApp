import graphene
from graphql_jwt.decorators import login_required
from io import StringIO, BytesIO
from PyPDF2 import PdfReader, PdfFileReader, PdfFileWriter
import pandas as pd
import numpy as np
import datetime
import os
import glob
from ..models import ClientContact, Invoice, Job, Location, Client, Region, Estimate, EstimateHeader, EstimateItem

import sys
sys.path.append("...")
from accounts.models import CustomUser

class UploadJobsCSV(graphene.Mutation):
    class Arguments:
        file = graphene.String()

    success = graphene.Boolean()
    
    @classmethod
    @login_required
    def mutate(self, root, info, file, **kwargs):
        if not file: return self(success=False)
        tmp_data = pd.read_csv(StringIO(file))

        # Data processing
        tmp_data['PO #'] = tmp_data['PO #'].astype(int)
        tmp_data['PO #'] = tmp_data['PO #'].astype(str)
        # tmp_data['Total Hours'] = tmp_data['Total Hours'].str.strip("'")
        tmp_data['Close out #'] = tmp_data['Close out #'].replace(np.nan, '')
        tmp_data['Quote #'] = tmp_data['Quote #'].replace(np.nan, '')
        tmp_data['Total Hours'] = tmp_data['Total Hours'].replace(np.nan, 0)
        tmp_data['Amount (ex GST)'] = tmp_data['Amount (ex GST)'].replace(np.nan, 0)

        # Convert date columns into dates
        for col in ['Date Issued', 'Date attended', 'Works commenced', 'Works Completed', 'Quote Issued', 'BGIS PO Approval', 'Date issued to BGIS', 'Date Paid',  'Close out date']:
            tmp_data[col] = tmp_data[col].replace(pd.NaT, '01/01/1970')
            tmp_data[col] = pd.to_datetime(tmp_data[col], format='%d/%m/%Y')
            tmp_data[col] = tmp_data[col].dt.date

        print("Importing CSV File!")
        for row in range(len(tmp_data.to_numpy().tolist())):
            job, created = Job.objects.get_or_create(
                client = Client.objects.get(name=tmp_data['Client'].to_numpy().tolist()[row]),
                po = tmp_data['PO #'].to_numpy().tolist()[row],
                location = Location.objects.get(name=tmp_data['Base'].to_numpy().tolist()[row]),
                site_manager =  CustomUser.objects.get(tmp_data['Site Manager'].to_numpy().tolist()[row])
            )
            
            job.building = tmp_data['Building '].to_numpy().tolist()[row]
            job.title = tmp_data['Works Description'].to_numpy().tolist()[row]
            job.priority = tmp_data['Priority'].to_numpy().tolist()[row]
            job.date_issued =  None if tmp_data['Date Issued'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['Date Issued'].to_numpy().tolist()[row]
            job.inspection_date = None if tmp_data['Date attended'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['Date attended'].to_numpy().tolist()[row]
            job.commencement_date = None if tmp_data['Works commenced'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['Works commenced'].to_numpy().tolist()[row]
            job.completion_date = None if tmp_data['Works Completed'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['Works Completed'].to_numpy().tolist()[row]
            job.total_hours = float(tmp_data['Total Hours'].to_numpy().tolist()[row])
            job.close_out_reference = tmp_data['Close out #'].to_numpy().tolist()[row]
            # job.invoice =  None if tmp_data['Aurify Inv#'].to_numpy().tolist()[row] == "" else Invoice.objects.get_or_create(invoice_number = tmp_data['Aurify Inv#'].to_numpy().tolist()[row])
            job.invoice_date =  None if tmp_data['Date issued to BGIS'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['Date issued to BGIS'].to_numpy().tolist()[row]
            job.paid_date = None if tmp_data['Date Paid'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['Date Paid'].to_numpy().tolist()[row]
            job.close_out_date = None if tmp_data['Close out date'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['Close out date'].to_numpy().tolist()[row]
            job.bsafe_link = tmp_data['bsafe link'].to_numpy().tolist()[row]
            job.save()
            
            # tmp_data['Amount (ex GST)'][row] = tmp_data['Amount (ex GST)'][row].astype(float)
            amount = 0.00 if str(tmp_data['Amount (ex GST)'][row]) == "Options" else tmp_data['Amount (ex GST)'][row]
            amount = str(amount).replace('$', '')
            amount = str(amount).replace(',', '')

            estimate, created = Estimate.objects.get_or_create(
                job_id = job,
                name = "PO" + tmp_data['PO #'].to_numpy().tolist()[row] if tmp_data['Quote #'].to_numpy().tolist()[row] == "" else tmp_data['Quote #'].to_numpy().tolist()[row],
                description = "Imported Estimate",
                price = amount,
                approval_date = None if tmp_data['BGIS PO Approval'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['BGIS PO Approval'].to_numpy().tolist()[row],
                issue_date = None if tmp_data['Quote Issued'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['Quote Issued'].to_numpy().tolist()[row],
            )

            estimate_header, created = EstimateHeader.objects.get_or_create(
                estimate_id = estimate,
                description = "PO" + tmp_data['PO #'].to_numpy().tolist()[row],
                markup = 0,
                gross = amount,
            )

            _, created = EstimateItem.objects.get_or_create(
                header_id = estimate_header,
                description = "Imported Item",
                quantity = 1,
                item_type = 'quote',
                rate = amount,
                extension = amount,
                markup = 0,
                gross = amount
            )
            
            print("Progress: " + str(row + 1) + " / " + str(len(tmp_data.to_numpy().tolist())))
    
        print("Import Complete")

        return UploadJobsCSV(success=True)

class UploadInvoiceDetailsCSV(graphene.Mutation):
    class Arguments:
        file = graphene.String()

    success = graphene.Boolean()
    
    @classmethod
    @login_required
    def mutate(self, root, info, file, **kwargs):
        if not file: return self(success=False)
        tmp_data = pd.read_csv(StringIO(file))

        # Convert date columns into dates
        for col in ['Date issued to BGIS', 'Date Paid']:
            tmp_data[col] = tmp_data[col].replace(pd.NaT, '01/01/1970')
            tmp_data[col] = pd.to_datetime(tmp_data[col], format='%d/%m/%Y')
            tmp_data[col] = tmp_data[col].dt.date

        print("Importing CSV File!")
        for row in range(len(tmp_data.to_numpy().tolist())):
            if Invoice.objects.filter(number = str(tmp_data['Aurify Inv#'].to_numpy().tolist()[row]).rjust(8, "0")).exists():
            
                invoice = Invoice.objects.get(number = str(tmp_data['Aurify Inv#'].to_numpy().tolist()[row]).rjust(8, "0"))
                invoice.date_issued =  None if tmp_data['Date issued to BGIS'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['Date issued to BGIS'].to_numpy().tolist()[row]
                invoice.date_paid = None if tmp_data['Date Paid'].to_numpy().tolist()[row] == datetime.date(1970, 1, 1) else tmp_data['Date Paid'].to_numpy().tolist()[row]
                invoice.save()
            
            print("Progress: " + str(row + 1) + " / " + str(len(tmp_data.to_numpy().tolist())))
    
        print("Import Complete")

        return UploadJobsCSV(success=True)

class UploadLocationsCSV(graphene.Mutation):
    class Arguments:
        file = graphene.String()

    success = graphene.Boolean()
    
    @classmethod
    @login_required
    def mutate(self, root, info, file, **kwargs):
        if not file: return self(success=False)

        tmp_data = pd.read_csv(StringIO(file))

        print("Importing CSV File!")
        for row in range(len(tmp_data.to_numpy().tolist())):
            loc, created = Location.objects.get_or_create(
                client_ref = "{:0>4}".format(tmp_data['Number'].to_numpy().tolist()[row]),
                client = Client.objects.get(name=tmp_data['Client'].to_numpy().tolist()[row]),
                region = Region.objects.get(short_name=tmp_data['Region'].to_numpy().tolist()[row]),
            )
    
            loc.name = tmp_data['Base'].to_numpy().tolist()[row]
            loc.address = tmp_data['Address'].to_numpy().tolist()[row]
            loc.locality = tmp_data['Locality'].to_numpy().tolist()[row]
            loc.state = tmp_data['State'].to_numpy().tolist()[row]
            loc.postcode = tmp_data['Postcode'].to_numpy().tolist()[row]
            loc.save()

            print("Progress: " + str(row + 1) + " / " + str(len(tmp_data.to_numpy().tolist())))
    
        print("Import Complete")

        return UploadLocationsCSV(success=True)

class UploadClientsCSV(graphene.Mutation):
    class Arguments:
        file = graphene.String()

    success = graphene.Boolean()
    
    @classmethod
    @login_required
    def mutate(self, root, info, file, **kwargs):
        if not file: return self(success=False)

        tmp_data = pd.read_csv(StringIO(file))

        print("Importing CSV File!")
        for row in range(len(tmp_data.to_numpy().tolist())):
            _, created = Client.objects.get_or_create(
                name = tmp_data['name'].to_numpy().tolist()[row],
            )
            print("Progress: " + str(row + 1) + " / " + str(len(tmp_data.to_numpy().tolist())))
    
        print("Import Complete")

        return UploadClientsCSV(success=True)

class UploadRegionsCSV(graphene.Mutation):
    class Arguments:
        file = graphene.String()

    success = graphene.Boolean()
    
    @classmethod
    @login_required
    def mutate(self, root, info, file, **kwargs):
        if not file: return self(success=False)
        tmp_data = pd.read_csv(StringIO(file))

        print("Importing CSV File!")
        for row in range(len(tmp_data.to_numpy().tolist())):
            cr, created = Region.objects.get_or_create(
                short_name = tmp_data['short_name'].to_numpy().tolist()[row],
            )
            cr.name = tmp_data['name'].to_numpy().tolist()[row]
            cr.email = tmp_data['email'].to_numpy().tolist()[row]
            cr.client = Client.objects.get(name=tmp_data['client'].to_numpy().tolist()[row])
            cr.save()

            print("Progress: " + str(row + 1) + " / " + str(len(tmp_data.to_numpy().tolist())))
    
        print("Import Complete")

        return UploadRegionsCSV(success=True)

class UploadClientContactsCSV(graphene.Mutation):
    class Arguments:
        file = graphene.String()

    success = graphene.Boolean()

        
    @classmethod
    @login_required
    def mutate(self, root, info, file, **kwargs):
        if not file: return self(success=False)
        tmp_data = pd.read_csv(StringIO(file))

        print("Importing CSV File!")
        for row in range(len(tmp_data.to_numpy().tolist())):
            cc, created = ClientContact.objects.get_or_create(
                first_name = tmp_data['first_name'].to_numpy().tolist()[row],
                last_name = tmp_data['last_name'].to_numpy().tolist()[row],
                client = Client.objects.get(name=tmp_data['company'].to_numpy().tolist()[row]),
                region = Region.objects.get(short_name=tmp_data['region'].to_numpy().tolist()[row]),
            )
            cc.position = tmp_data['position'].to_numpy().tolist()[row]
            cc.email = tmp_data['email'].to_numpy().tolist()[row]
            cc.phone = tmp_data['phone'].to_numpy().tolist()[row]
            cc.save()

            print("Progress: " + str(row + 1) + " / " + str(len(tmp_data.to_numpy().tolist())))
    
        print("Import Complete")

        return UploadClientContactsCSV(success=True)

class LocalImportBLCSV(graphene.Mutation):
    success = graphene.Boolean()
    
    @classmethod
    @login_required
    def mutate(self, root, info, **kwargs):
        
        BL_export_path = r"C:\Users\Aurify Constructions\Aurify Dropbox\James Sprague\BuildLogic Exports\2022 Estimates"
    
        print("Importing Estimates from CSV Files")
        fileList = glob.glob(BL_export_path + '/*.csv')[0]
        tmp_data = pd.read_csv(fileList)
        not_included = []

        for index, filename in enumerate(tmp_data["Job"]):
            print(filename)
            try:
                excel_df = pd.read_excel(os.path.join(BL_export_path, tmp_data["Actual Filename"][index]) + ".xls", header=0)
                headers = excel_df.iloc[:,0].dropna()
                excel_df = excel_df.dropna(subset=['TRADE', 'UNITS', 'RATE'], thresh=1)
                excel_df = excel_df.drop(columns=['TRADE'])
                excel_df["RATE"] = excel_df["RATE"].replace(np.nan, 0)
                excel_df["EXTENSION"] = excel_df["EXTENSION"].replace(np.nan, 0)
                excel_df["GROSS"] = excel_df["GROSS"].replace(np.nan, 0)
                excel_df = excel_df.iloc[1: , :]

                excel_df = excel_df.reset_index()
                headers = headers.reset_index()
                
                id_po = ""
                id_sr = ""
                id_other = ""

                if "PO" in filename:
                    id_po = filename[2:]
                elif "SR" in filename:
                    id_sr = filename[2:]
                else:
                    id_other = filename

                # Create estimate
                estimate, created = Estimate.objects.get_or_create(
                    job_id = Job.objects.get_or_create(po = id_po, sr=id_sr, other_id = id_other)[0],
                    name = tmp_data["Number"][index],
                )
                

                total_amount = 0
                item_count = 0
                counter = 0
                header_markup = 0
                header_gross = 0
                item_count = 0

                estimate_header, created = EstimateHeader.objects.get_or_create(
                    estimate_id = estimate,
                    description = headers.iloc[counter, 1],
                    markup = 0,
                    gross = 0,
                )

                for row in zip(excel_df['BILL REFERENCE'], excel_df['DESCRIPTION'], excel_df['CostCode'], excel_df['QUANTITY'], excel_df['UNITS'], excel_df['RATE'], excel_df['EXTENSION'], excel_df['MARGIN'], excel_df['GROSS']):
                    
                    if row[1] is np.nan:
                        if counter == 0:
                            estimate_header.markup = header_markup / item_count
                            estimate_header.gross = header_gross
                            estimate_header.save()
                        
                        ## Estimate Header Item
                        counter = counter + 1

                        estimate_header, created = EstimateHeader.objects.get_or_create(
                            estimate_id = estimate,
                            description = headers.iloc[counter, 1],
                        )
                        estimate_header.markup = header_markup/item_count
                        estimate_header.gross = header_gross
                        estimate_header.save()

                        header_markup = 0
                        header_gross = 0
                        item_count = 0
                    else:
                        ## Estimate Line Item
                        # print(row)
                        estimate_item, created = EstimateItem.objects.get_or_create(
                            header_id = estimate_header,
                            description = row[1],
                        )
                        estimate_item.quantity = row[3]
                        estimate_item.item_type = "hours" if row[4] == "hrs" else row[4].lower()
                        estimate_item.rate = row[5]
                        estimate_item.extension = row[6]
                        estimate_item.markup = row[7]*100
                        estimate_item.gross = row[8]
                        estimate_item.save()

                        header_markup += row[7]*10
                        header_gross += row[8]
                        item_count += 1

                estimate.description = "Imported from BuildLogic"
                estimate.amount = total_amount
                estimate.save()
            except FileNotFoundError:
                not_included.append(filename)

        print("\n Not included")
        print(not_included)

    
