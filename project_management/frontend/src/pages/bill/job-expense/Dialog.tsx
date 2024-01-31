import React from "react";
import { BasicDialog } from "../../../components/Components";
import { ExpenseSummaryType, ExpenseType, JobType, SnackType } from "../../../types/types";

const ExpenseDialog = ({open, onClose, job, setJob, setSnack} : {
    open: boolean,
    onClose: (event?: {}, reason?: string) => void,
    job: JobType,
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    
    let expenseSummary: ExpenseSummaryType[] = SummariseExpense(job.expenseSet)

    return (<>
        <BasicDialog open={open} close={onClose} 
            title="Expenses" 
            center fullWidth 
            dialogActions={<></>}
        >




        </BasicDialog>
    </>)
}

const SummariseExpense = (expenses: ExpenseType[]) => {
    let summarisedExpenses: ExpenseSummaryType[] = [];
    if(expenses.length > 0) {
        let counter = 0;
        summarisedExpenses = expenses.reduce((items: {vendor: string; amount: any; invoiceNumber: number; subRows: any[]; }[], item: { [x: string]: any; vendor: any; amount: any; }) => {
            // console.log("items", items)
            // console.log("item", item)
            const {vendor, amount, ...other} = item;
            
            // Check if the items vendors have the same name
            const itemIndex = items.findIndex((item: { vendor: string; }) => item.vendor.trim() === vendor.trim())

            if(itemIndex === -1) {
                // Create a new header row
                const subRows = [{vendor, amount, ...other}]
                items.push({vendor, amount, invoiceNumber: 1, subRows}); 
                counter += 1;
            } else {
                // Add to the existing header row
                items[itemIndex].vendor = vendor;
                items[itemIndex].invoiceNumber = items[itemIndex].invoiceNumber + 1;
                items[itemIndex].amount = parseFloat(items[itemIndex].amount) + parseFloat(amount);
                items[itemIndex].subRows.push({vendor, amount, ...other});
            }

            return items
        }, [])
        
    }
    return summarisedExpenses;
}

export default ExpenseDialog;