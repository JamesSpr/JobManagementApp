
import { useState, useMemo } from "react"
import { Grid, IconButton } from '@mui/material';
import { ColumnDef  } from '@tanstack/react-table'
import { Footer, Table, Tooltip } from "../../../components/Components";
import CreateRemittance from "./Create";
import { ClientType, InvoiceType, RemittanceType } from "../../../types/types";
import { usePrompt } from "../../../hooks/promptBlocker";

import AddIcon from '@mui/icons-material/Add';
import { dateSort, inDateRange } from "../../../components/TableHelpers";

const RemittanceAdvice = ({remittanceAdvice, setRemittanceAdvice, invoices, setInvoices, clients}: {
    remittanceAdvice: RemittanceType[],
    setRemittanceAdvice: React.Dispatch<React.SetStateAction<RemittanceType[]>>
    invoices: InvoiceType[]
    setInvoices: React.Dispatch<React.SetStateAction<InvoiceType[]>>
    clients: ClientType[]
}) => {

    const [updateRequired, setUpdateRequired] = useState(false);
    const [loading, setLoading] = useState(false);
    const [createDialog, setCreateDialog] = useState(false)

    // Navigation Blocker
    usePrompt('You have unsaved changes. Are you sure you want to leave?', updateRequired && !loading);

    // Dialog Controls
    const handleDialogClose = (event: { target: { name: string; }; }, reason: string, updatedInvoices: any[]) => {
        if(event.target.name === "submit") {
            // Update advice table and invoice data with new remittance advice information
            // SetInvoices
            // SetRemittanceAdvice
        }
        setCreateDialog(false);
    }

    const columns = useMemo<ColumnDef<RemittanceType>[]>(() => [
        {              
            accessorFn: row => row.client.displayName == "" ? row.client.name : row.client.displayName,
            id: 'client',       
            header: () => 'Client',
            size: 150,
        },
        {
            accessorKey: 'date',
            header: () => 'Date',
            filterFn: inDateRange,
            sortingFn: dateSort,
            size: 150,
        },
        {                
            accessorFn: row => row.invoiceSet.length,
            id: 'numInvoices',
            header: () => '# of Invoices',
            size: 150,
        },
        {
            id: 'amounts',
            header: 'Amounts',
            columns: [
                {       
                    accessorFn: row => row.invoiceSet.reduce((acc, val) => acc + (val.amount ?? 0), 0),         
                    id: 'maintenanceAmount',
                    header: () => 'Maintenance',
                    cell: info => "$" + info.getValue(),
                    size: 150,
                },
                {       
                    accessorFn: row => row.amount,         
                    id: 'totalAmount',
                    header: () => 'Total',
                    cell: info => "$" + info.getValue(),
                    size: 150,
                },
            ]
        }
    ], []);

    return (<>
        <Grid container spacing={1} justifyContent="center" alignItems="center">
            <Grid item xs={12}>
                <Table data={remittanceAdvice} columns={columns} />
            </Grid>
        </Grid>

        <Footer>
            {/* <Tooltip title="Save Changes">
                <IconButton disabled={!updateRequired} onClick={handleSave}><SaveIcon /></IconButton>
            </Tooltip> */}
            <Tooltip title={`New Remittance Advice`}>
                <IconButton onClick={(e) => setCreateDialog(true)}><AddIcon /></IconButton>
            </Tooltip> 
        </Footer>

        <CreateRemittance open={createDialog} onClose={handleDialogClose} invoices={invoices} clients={clients}/>
    </>
    )

}

export default RemittanceAdvice;