
import { useState, useMemo } from "react"
import { Grid, IconButton } from '@mui/material';
import { ColumnDef  } from '@tanstack/react-table'
import { Footer, Table, Tooltip } from "../../../components/Components";
import CreateRemittance from "./CreateRemittance";
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
    const [createDialog, setCreateDialog] = useState(false);

    // Navigation Blocker
    usePrompt('You have unsaved changes. Are you sure you want to leave?', updateRequired && !loading);

    // Dialog Controls
    const handleDialogClose = (submit: boolean, updatedInvoices?: InvoiceType[]) => {
        if(submit) {
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
                    accessorFn: row => row.invoiceSet.reduce((acc, val) => acc + parseFloat(val.amount?.toString() ?? '0') * 1.1, 0),         
                    id: 'maintenanceAmount',
                    header: () => 'Maintenance',
                    cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue() as number),
                    size: 150,
                },
                {       
                    accessorFn: row => row.amount,         
                    id: 'totalAmount',
                    header: () => 'Total',
                    cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue() as number),
                    size: 150,
                },
            ]
        }
    ], []);

    return (<>
        <Grid container spacing={1} justifyContent="center" alignItems="center">
            <Grid item xs={12}>
                <Table pagination data={remittanceAdvice} columns={columns} />
            </Grid>
        </Grid>

        <Footer>
            <Tooltip title={`New Remittance Advice`}>
                <IconButton onClick={(e) => setCreateDialog(true)}><AddIcon /></IconButton>
            </Tooltip> 
            {/* <Tooltip title="Save Changes">
                <IconButton disabled={!updateRequired} onClick={handleSave}><SaveIcon /></IconButton>
            </Tooltip> */}
        </Footer>

        <CreateRemittance open={createDialog} onClose={handleDialogClose} invoices={invoices} clients={clients} setRemittanceAdvice={setRemittanceAdvice}/>
    </>
    )

}

export default RemittanceAdvice;