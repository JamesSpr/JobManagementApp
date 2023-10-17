
import { useState } from "react"
import { Grid, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { Footer, Tooltip } from "../../../components/Components";
import CreateRemittance from "./Create";
import { ClientType, InvoiceType, RemittanceType } from "../../../types/types";
import { usePrompt } from "../../../hooks/promptBlocker";

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
    
    return (<>
        <Grid container spacing={1} justifyContent="center" alignItems="center">
            <Grid item xs={12}>

            </Grid>
        </Grid>
        <p>Remittance Advices</p>


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