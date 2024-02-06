import React, { useEffect, useState }  from 'react';
import { Dialog, DialogContent, Grid, IconButton } from '@mui/material';
import { FileUploadSection, InputField, ProgressIconButton } from '../../../components/Components';

// Icons
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

import useAxiosPrivate from '../../../hooks/useAxiosPrivate';
import { BillSummaryType, BillType, ContractorType, EmployeeType, EstimateSummaryType, ExpenseSummaryType, ExpenseType, JobType, SnackType } from '../../../types/types';
import EditBill from './EditBill';
import { BillSummaryTable, EstimateSummaryTable, ExpenseSummaryTable, JobBudgetSummary } from './Tables';
import EditExpense from './EditExpense';
import CreateBill from './CreateBill';
import CreateExpense from './CreateExpense';

export interface AttachmentType {
    data: string
    name: string
}

export type BillTypes = null | "expense" | "bill"

const BillHome = ({open, onClose, job, contractors, employees, setJob, setSnack }: {
    open: boolean,
    onClose: (event?: {}, reason?: string) => void,
    job: JobType
    contractors: ContractorType[]
    employees: EmployeeType[]
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    const axiosPrivate = useAxiosPrivate();
    const [waiting, setWaiting] = useState({'create': false, 'update': false});
    const [advancedUpload, setAdvancedUpload] = useState(false);
    const [advancedUploadSettings, setAdvancedUploadSettings] = useState({numPages: 0});

    const [newObjectType, setNewObjectType] = useState<"bill" | "expense">("bill")
    
    const [editing, setEditing] = useState<BillTypes>(null);
    const [editingObject, setEditingObject] = useState<BillType | ExpenseType>();
    const [estimates, setEstimates] = useState<EstimateSummaryType[]>([]);

    const [creating, setCreating] = useState<BillTypes>(null);
    const [newObject, setNewObject] = useState<BillType | ExpenseType>();
    const [attachment, setAttachment] = useState<AttachmentType>({'data':'', 'name':''})
    
    const [toggleSave, setToggleSave] = useState(false);

    const estimateSummary: EstimateSummaryType[] = SummariseEstimate(estimates);
    const billSummary: BillSummaryType[] = SummariseBill(job.billSet);
    const expenseSummary: ExpenseSummaryType[] = SummariseExpense(job.expenseSet)

    const handleClose = (event?: any, reason?: string) => {
        if (reason !== 'backdropClick') {
            // TODO: Snackbar
            onClose(event, reason);
        }
    }

    // Check if estimate has been approved if it has changed
    useEffect(() => {
        const approvedEstimate = job.estimateSet.find((estimate) => estimate.approvalDate !== null)
        approvedEstimate?.estimateheaderSet?.map(header => {
            header.estimateitemSet?.map(lineItem => {
                // Add the header description for meta data
                const summaryItem = {...lineItem, header: header?.description};
                setEstimates(prev => [...prev, summaryItem]);
            })
        });
    }, [job.estimateSet])

    const handleNewBill = () => {

        setWaiting(prev => ({...prev, 'create': true}));
        const target = document.getElementById('create_bill') as HTMLInputElement;
        const [file] = target?.files as FileList;

        if (!file) {
            // setCreateBill(true);
            setSnack({active: true, variant: "warning", message: "You must upload attachment to create a bill"})
            setWaiting(prev => ({...prev, 'create': false}));
            return;
        }

        let fileReader = new FileReader();
        fileReader.readAsDataURL(file)
        fileReader.onload = async () => {
            let data = fileReader.result

            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation extractBillDetails($file: String!, $filename: String!, $numPages: Int!, $objectType: String! ) {
                    bill: extractBillDetails(file: $file, filename: $filename, numPages: $numPages, objectType: $objectType) {
                        success
                        message
                        data
                        billFileName
                        billFileData
                    }
                }`,
                variables: { 
                    file: data,
                    filename: file.name,
                    numPages: advancedUploadSettings.numPages,
                    objectType: newObjectType
                },
            }),
            }).then((response) => {
                // console.log(response);
                const res = response?.data?.data?.bill;
                setWaiting(prev => ({...prev, 'create': false}));
                if(res.success) {
                    newObjectType === "bill" ? 
                        setNewObject(JSON.parse(res.data) as BillType) 
                        : setNewObject(JSON.parse(res.data) as ExpenseType);
                    
                    setAttachment({
                        'data': res.billFileData,
                        'name': res.billFileName
                    })
                    // setNewBill(prev => ({...prev, 'invoiceDate': new Date(prev?.invoiceDate)}))
                    setCreating(newObjectType);
                }
                else {
                    setSnack({active: true, variant: 'error', message: res.message})
                    setWaiting(prev => ({...prev, 'create': false}));
                }
            }).catch((err) => {
                setWaiting(prev => ({...prev, 'create': false}));
                console.log("Error", err)
                setSnack({active: true, variant: 'error', message: "Data Extraction Error. Contact Developer"})
            })
        }      
    }

    return (
    <>
        <Dialog fullWidth maxWidth='md' scroll={'paper'} open={open} onClose={handleClose}>
            <span className="dialogTitle">
                {editing && <>
                    <IconButton onClick={() => setEditing(null)} disabled={waiting.update} style={{float: 'left', padding: '0px 0px 4px 0px'}}>
                        <ArrowBackIcon />
                    </IconButton>
                    <ProgressIconButton onClick={() => setToggleSave(true)} waiting={waiting.update} style={{float: 'left', padding: '0px 0px 4px 0px', margin: '0px 0px 0px 8px'}}>
                        <SaveIcon />
                    </ProgressIconButton>
                </>
                }
                {creating && <>
                    <IconButton onClick={() => setCreating(null)} disabled={waiting.update} style={{float: 'left', padding: '0px 0px 4px 0px'}}>
                        <ArrowBackIcon />
                    </IconButton>
                </>
                }
                <h1 style={{display: 'inline-block', position: 'relative', left: '24px', width: 'calc(100% - 104px)', textAlign: 'center', fontWeight: 'bold'}}>
                    Accounts for {job.po}
                </h1>
                <IconButton onClick={handleClose} disabled={waiting.update} style={{float: 'right', right: '10px', padding: '0px 0px 4px 0px'}} >
                    <CloseIcon />
                </IconButton>
            </span>
            <DialogContent>
                {!editing && !creating ? 
                    <Grid container spacing={1} direction={'column'} alignItems={'center'} style={{overflow: 'auto hidden'}}>
                        <EstimateSummaryTable estimates={estimateSummary} />
                        <BillSummaryTable bills={billSummary} setEditingObject={setEditingObject} setEditing={setEditing} />
                        <ExpenseSummaryTable expenses={expenseSummary} setEditingObject={setEditingObject} setEditing={setEditing} />
                        <JobBudgetSummary estimate={estimateSummary} bills={billSummary} expenses={expenseSummary} />
                        
                        <Grid item xs={12}>
                            <div className='subheader-with-options'>
                                <p className='subHeader'>Upload New</p>
                                <div>
                                    <label>
                                        <input type="radio" value="bill" name="input_type" 
                                            checked={newObjectType === "bill"}
                                            onChange={() => setNewObjectType("bill")}
                                        />
                                        Bill
                                    </label>
                                    <label>
                                        <input type="radio" value="expense" name="input_type" 
                                            checked={newObjectType === "expense"}
                                            onChange={() => setNewObjectType("expense")}
                                        />
                                        Expense
                                    </label>
                                </div>
                                <a className='options-link' onClick={() => setAdvancedUpload(!advancedUpload)}>Advanced Upload {advancedUpload ? "V" : ">"}</a>
                            </div>
                            { advancedUpload &&
                                <div className="bill-upload-options-container">
                                    <InputField type='number' step={1} min={0} label='Number of Pages'
                                        value={advancedUploadSettings.numPages} name="numPages"
                                        onChange={e => setAdvancedUploadSettings(prev => ({...prev, [e.target.name]: e.target.value}))} />
                                </div>
                            }
                            <FileUploadSection onSubmit={handleNewBill} waiting={waiting.create} id="create_bill" type=".pdf, image/*" button={"Create New " + newObjectType}/>
                        </Grid>
                    </Grid>
                    :
                    editing ?
                        editing == "bill" ? 
                            <EditBill bills={editingObject as BillType} setJob={setJob} 
                                toggleSave={toggleSave} setToggleSave={setToggleSave} 
                                setEditing={setEditing} setUpdateWaiting={setWaiting}
                                setSnack={setSnack}        
                            />
                        : 
                            <EditExpense expenses={editingObject as ExpenseType} setJob={setJob} 
                                toggleSave={toggleSave} setToggleSave={setToggleSave} 
                                setEditing={setEditing} setUpdateWaiting={setWaiting}
                                setSnack={setSnack}        
                            />
                    :
                    creating ?
                        creating == "bill" ?
                            <CreateBill
                                setJob={setJob} id={job.po}
                                contractors={contractors} 
                                attachment={attachment}
                                newBill={newObject as BillType} 
                                setNewBill={setNewObject as React.Dispatch<React.SetStateAction<BillType>>} 
                                setCreating={setCreating}
                                setSnack={setSnack}
                            />
                        :
                            <CreateExpense 
                                setJob={setJob} id={job.po}
                                employees={employees}
                                attachment={attachment}
                                newExpense={newObject as ExpenseType}
                                setNewExpense={setNewObject as React.Dispatch<React.SetStateAction<ExpenseType>>} 
                                setCreating={setCreating}
                                setSnack={setSnack}                            
                            />
                    : <>Error Please Contact Developer</>
                }
            </DialogContent>
        </Dialog>

    </>
    );
}

const SummariseEstimate = (estimate: EstimateSummaryType[]) => {
    let counter = 0;
    return estimate.reduce((items, item) => {
        const {id, description, quantity, itemType, rate, extension, gross, header} = item;

        // Check if the items descriptions are the same
        const itemIndex = items.findIndex(it => it.description.trim() === description.trim())

        if(itemIndex === -1) {
            // Create a new header row
            const subRows = [{id, description: header ?? '', quantity, itemType, rate, extension, gross}]
            items.push({id, counter, description, quantity, itemType, rate, extension, gross, subRows}); 
            counter += 1;
        } else {
            // Add to the existing header row
            items[itemIndex].quantity = items[itemIndex].quantity + quantity;
            items[itemIndex].itemType = itemType.slice(-1) == 's' ? itemType : itemType + 's';
            items[itemIndex].rate = items[itemIndex].rate + rate;
            items[itemIndex].extension = items[itemIndex].extension + extension;
            items[itemIndex].gross = items[itemIndex].gross + gross;
            items[itemIndex].subRows?.push({id, description: header ?? '', quantity, itemType, rate, extension, gross});
        }

        return items;
    }, [] as EstimateSummaryType[]);
}

const SummariseBill = (bills: BillType[]) => {
    let summarisedBill: BillSummaryType[] = [];
    if(bills.length > 0) {
        let counter = 0;
        summarisedBill = bills.reduce((items: { supplier: any; amount: any; invoiceNumber: number; subRows: any[]; }[], item: { [x: string]: any; supplier: any; amount: any; }) => {
            // console.log("items", items)
            // console.log("item", item)
            const {supplier, amount, ...other} = item;
            
            // Check if the items suppliers have the same name
            const itemIndex = items.findIndex((item: { supplier: { name: string; }; }) => item.supplier.name.trim() === supplier.name.trim())

            if(itemIndex === -1) {
                // Create a new header row
                const subRows = [{supplier, amount, ...other}]
                items.push({supplier, amount, invoiceNumber: 1, subRows}); 
                counter += 1;
            } else {
                // Add to the existing header row
                items[itemIndex].supplier.name = supplier.name;
                items[itemIndex].invoiceNumber = items[itemIndex].invoiceNumber + 1;
                items[itemIndex].amount = parseFloat(items[itemIndex].amount) + parseFloat(amount);
                items[itemIndex].subRows.push({supplier, amount, ...other});
            }

            return items
        }, [])
        
    }
    return summarisedBill;
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

export default BillHome;