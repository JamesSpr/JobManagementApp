import React from "react";
import { BasicDialog } from "../../../components/Components";
import { JobType, SnackType } from "../../../types/types";

const ExpenseDialog = ({open, onClose, job, setJob, setSnack} : {
    open: boolean,
    onClose: (event?: {}, reason?: string) => void,
    job: JobType,
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    

    return (<>
        <BasicDialog open={open} close={onClose} 
            title="Expenses" 
            center fullWidth 
            dialogActions={<></>}
        >




        </BasicDialog>
    </>)
}


export default ExpenseDialog;