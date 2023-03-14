import React, { useState, useMemo, useEffect }  from 'react';
import { useParams } from 'react-router-dom';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { Dialog, DialogContent, Grid, Typography, IconButton, Portal, Snackbar, Alert } from '@mui/material';
import { FileUploadSection, InputField, ProgressButton } from '../../components/Components';

import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RequestPageIcon from '@mui/icons-material/RequestPage';

import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../auth/useAuth';

const emptyBillState = {
    'thumbnailPath':'',
    'contractor':'',
    'invoiceNumber':'',
    'invoiceDate':'',
    'amount':'',
    'billType':'subcontractor',
    'imgPath': ''
}

const Bill = ({ open, onClose, estimate, bills, contractors }) => {

    const { id } = useParams();
    const [newBill, setNewBill] = useState(emptyBillState);
    const [billAttchment, setBillAttachment] = useState({'data':'', 'name':''})
    const [createBill, setCreateBill] = useState(false);
    const [data, setData] = useState([]);

    const [billData, setBillData] = useState([]);
    
    useEffect(() => {
        setBillData(bills);
    }, [])

    useEffect(() => {
        setData([])
        estimate?.estimateheaderSet?.map(header => {
            header?.subRows?.map(lineItem => {
                setData(prev => [...prev, lineItem])
            })
        });
    }, [estimate])

    const handleClose = (event, reason) => {
        if (reason !== 'backdropClick') {
            // TODO: Snackbar
            setCreateBill(false);
            onClose(event, reason);
        }
    }

    const handleBack = () => {
        setNewBill(emptyBillState);
        // TODO: Delete Temp Invoice File
        setCreateBill(false);
    }

    if(createBill) {
        return <CreateBill open={open} handleClose={handleClose} handleBack={handleBack} 
            setBills={setBillData} 
            id={id} contractors={contractors} 
            billAttachment={billAttchment}
            newBill={newBill} setNewBill={setNewBill} />
    }

    if (data) {
        return <BillHome open={open} handleClose={handleClose} 
            id={id} data={data} 
            bills={billData} 
            setBillAttachment={setBillAttachment}
            setNewBill={setNewBill} setCreateBill={setCreateBill}/>
    }

    return <>Error</>
}

const CreateBill = ({ open, handleClose, handleBack, id, setBills, contractors, newBill, setNewBill, billAttachment}) => {
    const emptyContractorState = {
        'bankAccountName':'',
        'bankAccountNumber':'',
        'bsb':'',
        'abn':'',
    }

    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const [waiting, setWaiting] = useState(false);
    const [contractor, setContractor] = useState(emptyContractorState);
    const [fieldError, setFieldError] = useState({'contractor': false, 'invoiceNumber': false, 'invoiceDate': false, 'amount': false});

    const [snack, setSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackVariant, setSnackVariant] = useState('info');

    useEffect(() => {
        setContractor(contractors.find(contractor => contractor.id == newBill['contractor']) ?? emptyContractorState)

        //Validate values
        // Check date is within a year each way
        // Check amount is below budget
        // Check invoiceNumber does not already exist

        // Highlight values that were not found

    }, [])

    const handleChange = (e) => {
        setNewBill(prev => ({...prev, [e.target.name]:e.target.value}))
    }

    const handleSelectContractor = (e) => {
        setNewBill(prev => ({...prev, [e.target.name]:e.target.value}))
        if(e.target.value !== "") {
            setContractor(contractors.find(contractor => contractor.id == e.target.value))
        }
        else {
            setContractor(emptyContractorState)
        }
    }

    const handleSubmit = async () => {
        setWaiting(true);
        
        // Check emty values
        let err = false;
        Object.entries(newBill).map(([key, val]) => {
            if(!val) {
                setFieldError(prev => ({...prev, [key]: true}))
                err = true;
            }
        })
        
        if(err) {
            setWaiting(false);
            return;
        }
        
        const {abn, thumbnailPath, ...bill} = newBill

        // Post bill details to MYOB
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `
                    mutation myobCreateBill($uid:String!, $jobId:String!, $newBill: BillInputType!, $attachment: String!, $attachmentName: String!) {
                        create: myobCreateBill(uid:$uid, jobId:$jobId, newBill: $newBill, attachment: $attachment, attachmentName: $attachmentName) {
                            success
                            message
                            error
                            bill {
                                myobUid
                                supplier {
                                    name
                                }
                                invoiceNumber
                                invoiceDate
                                amount
                                processDate
                                imgPath
                            }
                        }
                    }`,
                    variables: {
                        uid: auth?.myob.id,
                        jobId: id,
                        newBill: bill,
                        attachment: billAttachment.data,
                        attachmentName: billAttachment.name,
                    },
            }),
            }).then((response) => {
                const res = response?.data?.data?.create; 
                console.log(res)
                setWaiting(false);
                if(res.success) {
                    setBills(prev => ([...prev, res.bill]));
                    handleBack();
                }
                else {
                    setSnack(true);
                    setSnackVariant('error');
                    setSnackMessage(res.message);
                    console.log("MYOB Create Bill", res)
                }
            });
        } catch (err) {
            console.log("error:", err);
        }
        
        const {billType, ...formattedBill} = bill

    }

    return (
    <>
        <Dialog fullWidth maxWidth='md' open={open} onClose={handleClose}>
            <DialogContent style={{overflow: 'hidden'}}>
                <span className="dialogTitle">
                    <IconButton onClick={handleBack} style={{float: 'left', padding: '0px 0px 4px 0px'}} >
                        <ArrowBackIcon />
                    </IconButton>
                    <h1
                        style={{display: 'inline-block', position: 'relative', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                        Accounts for {id}
                    </h1>
                    <IconButton onClick={handleClose} style={{float: 'right', padding: '0px 0px 4px 0px'}} >
                        <CloseIcon />
                    </IconButton>
                </span>
                <Grid container spacing={1} align="center">
                    <Grid item xs={12}>
                        <h2>Contractor Details</h2>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={600} type="select" label="Contractor" name="contractor" 
                            error={fieldError['contractor']} value={newBill['contractor']} onChange={handleSelectContractor}>
                            <option key="nullContractor" value=""></option>
                            {contractors.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </InputField> 
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="text" width={200} disabled label="ABN" value={contractor['abn']}/>
                        <InputField type="text" width={400} disabled label="Account Name" value={contractor['bankAccountName']}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="text" width={200} disabled label="BSB" value={contractor['bsb']}/>
                        <InputField type="text" width={200} disabled label="Accont Number" value={contractor['bankAccountNumber']}/>
                    </Grid>
                    <Grid item xs={12}>
                        <a href='/contractors'>Click here to goto contractors to add or modify</a>
                    </Grid>
                    <Grid item xs={12}>
                        <h2>Invoice Details</h2>
                    </Grid>
                    <Grid item xs={12}>
                        <div name="billType">
                            <input type="radio" id="subcontractor" name="billType" value="subcontractor" 
                                checked={newBill['billType'] === "subcontractor"}
                                onChange={handleChange}
                            />
                            <label htmlFor="subcontractor">Subcontractor</label>
                            <span style={{display:'inline-block', width:'10px'}} />
                            <input type="radio" id="material" name="billType" value="material" 
                                checked={newBill['billType'] === "material"}
                                onChange={handleChange}
                            />
                            <label htmlFor="material">Materials</label>

                        </div>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="text" width={200} label="Invoice Number" name="invoiceNumber" 
                            error={fieldError['invoiceNumber']} value={newBill['invoiceNumber']} onChange={handleChange}/> 
                        <InputField type="date" width={200} label="Invoice Date" name="invoiceDate" 
                            error={fieldError['invoiceDate']} value={newBill['invoiceDate']} onChange={handleChange}/> 
                        <InputField type="number" width={200} label="Invoice Amount (incl. GST)" name="amount" min={0} step="0.01"
                            error={fieldError['amount']} value={newBill['amount']} onChange={handleChange}/>
                    </Grid>
                    <Grid item xs={12}>
                        <ProgressButton name="Submit" waiting={waiting} onClick={handleSubmit} buttonVariant="outlined" />
                    </Grid>
                    <Grid item xs={12}>
                        <div className='pdf-preview'>
                            <img src={"\\" + newBill?.thumbnailPath} alt="PDF Preview"/>
                        </div>
                    </Grid>
                </Grid>
            </DialogContent>
        </Dialog>
        
        <Portal>
            {/* Notification Snackbar */}
            <Snackbar
                anchorOrigin={{vertical: "bottom", horizontal:"center"}}
                open={snack}
                autoHideDuration={12000}
                onClose={(e) => setSnack(false)}
            >
                <Alert onClose={(e) => setSnack(false)} severity={snackVariant} sx={{width: '100%'}}>{snackMessage}</Alert>
            </Snackbar>
        </Portal>
    </>
    )
}

const BillHome = ({ open, handleClose, id, data, bills, setNewBill, setCreateBill, setBillAttachment }) => {
    const axiosPrivate = useAxiosPrivate();
    const [waiting, setWaiting] = useState({'create': false});

    // Table Columns
    const estimateTableColumns = useMemo(() => [
        {
            accessorKey: 'description',
            header: () => 'Description',
            minSize: 150,
            size: 150,
            maxSize: 150,
        },
        {
            accessorKey: 'quantity',
            header: () => 'Quantity',
            minSize: 150,
            size: 150,
            maxSize: 150,
        },
        {
            accessorKey: 'itemType',
            header: () => 'Units',
            minSize: 150,
            size: 150,
            maxSize: 150,
        },
        {
            accessorKey: 'rate',
            header: () => 'Rate',
            cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue()),
            minSize: 150,
            size: 150,
            maxSize: 150,
        },
        {
            accessorKey: 'extension',
            header: () => 'Amount',
            cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue()),
            minSize: 150,
            size: 150,
            maxSize: 150,
        },
    ], []);

    const billTableColumns = useMemo(() => [
        {
            id: 'supplier',
            accessorFn: row => row?.supplier?.name,
            header: () => 'Supplier',
            minSize: 400,
            size: 400,
            maxSize: 400,
        },
        {
            accessorKey: 'invoiceNumber',
            header: () => 'Invoice #',
            minSize: 80,
            size: 80,
            maxSize: 80,
        },
        {
            accessorKey: 'amount',
            header: () => 'Amount',
            cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue()/1.1),
            minSize: 100,
            size: 100,
            maxSize: 100,
        },
        {
            accessorKey: 'invoiceDate',
            header: () => 'Invoice Date',
            minSize: 100,
            size: 100,
            maxSize: 100,
        },
        {
            accessorKey: 'processDate',
            header: () => 'Processed On',
            minSize: 105,
            size: 105,
            maxSize: 105,
        },
        {
            accessorKey: 'imgPath',
            header: () => 'Bill',
            cell: info => (
                info.getValue() ?
                <IconButton onClick={e => {displayBill(info.getValue())}}>
                    <RequestPageIcon />
                </IconButton> : <></>
            ),
            minSize: 45,
            size: 45,
            maxSize: 45,
        },
    ], []);

    const estimateTable = useReactTable({
        data,
        columns: estimateTableColumns,
        getCoreRowModel: getCoreRowModel(),
    });  

    const billsTable = useReactTable({
        data: bills,
        columns: billTableColumns,
        getCoreRowModel: getCoreRowModel(),
    });  

    const displayBill = (path) => {
        console.log(path)
    }

    const estimateTotal = () => {
        let totalAmount = 0.0;
        estimateTable.getRowModel().flatRows.forEach((row) => {
            if(row.depth === 0) {
                totalAmount += parseFloat(row.original['extension']);
            }
        })
        return totalAmount
    }

    const estimateTotalIncProfit = () => {
        let totalAmount = 0.0;
        estimateTable.getRowModel().flatRows.forEach((row) => {
            if(row.depth === 0) {
                totalAmount += parseFloat(row.original['gross']);
            }
        })
        return totalAmount
    }

    const billsTotal = () => {
        let totalAmount = 0.0;
        billsTable.getRowModel().flatRows.forEach((row) => {
            if(row.depth === 0) {
                totalAmount += parseFloat(row.original['amount']);
            }
        })
        return totalAmount / 1.1
    }

    const getBudget = () => {
        return estimateTotal() - billsTotal();
    }
    const getProfit = () => {
        return estimateTotalIncProfit() - estimateTotal();
    }
    const getGross = () => {
        return getProfit() + getBudget();
    }

    const handleNewBill = () => {
        setWaiting(prev => ({...prev, 'create': true}));
        const [file] = create_bill.files;

        if (!file) {
            setCreateBill(true);
            setWaiting(prev => ({...prev, 'create': false}));
            return;
        }

        let fileReader = new FileReader();
        fileReader.readAsDataURL(file)
        fileReader.onload = async () => {
            let data = fileReader.result

            try {
                await axiosPrivate({
                    method: 'post',
                    data: JSON.stringify({
                    query: `
                    mutation extractBillDetails($file: String!, $filename: String!) {
                        bill: extractBillDetails(file: $file, filename: $filename) {
                            success
                            message
                            data
                            billFileName
                            billFileData
                        }
                    }`,
                    variables: { 
                        file: data,
                        filename: file.name
                    },
                }),
                }).then((response) => {
                    console.log(response);
                    const res = response?.data?.data?.bill;
                    if(res.success) {
                        console.log(JSON.parse(res.data));
                        setNewBill(JSON.parse(res.data));
                        setBillAttachment({
                            'data': res.billFileData,
                            'name': res.billFileName
                        })
                        // setNewBill(prev => ({...prev, 'invoiceDate': new Date(prev?.invoiceDate)}))
                    }
                    setWaiting(prev => ({...prev, 'create': false}));
                    setCreateBill(true);
                });
            } catch (err) {
                console.log("error:", err);
            }
        }      
    }

    return (
    <>
        <Dialog fullWidth maxWidth='md' open={open} onClose={handleClose}>
            <DialogContent>
                <span className="dialogTitle">
                    <h1
                        style={{display: 'inline-block', position: 'relative', left: '24px', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                        Accounts for {id}
                    </h1>
                    <IconButton onClick={handleClose} style={{float: 'right', right: '10px', padding: '0px 0px 4px 0px'}} >
                        <CloseIcon />
                    </IconButton>
                </span>
                <Grid container spacing={1} align="center">
                    <Grid item xs={12} style={{margin: '10px 0px', overflow: 'auto hidden'}}>
                        <Typography variant='h6'>Approved Estimate Items</Typography>
                        <table style={{width: estimateTable.getTotalSize()}}>
                            <thead>
                                {estimateTable.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => {
                                            return (
                                                <th key={header.id} colSpan={header.colSpan} style={{width: header.getSize(), padding: '5px'}}>
                                                    {header.isPlaceholder ? null : (
                                                    <>
                                                        {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                        )}
                                                    </>
                                                    )}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {estimateTable.getRowModel().rows.map(row => {
                                    return (
                                        <tr key={row.id} style={{height: '20px'}}>
                                            {row.getVisibleCells().map(cell => {
                                                return (
                                                    <td key={cell.id} style={{padding: '4px 5px'}}>
                                                        {
                                                            flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )
                                                        }
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Grid>
                    <Grid item xs={12} style={{margin: '10px 0px', overflow: 'auto hidden'}}>
                        <Typography variant='h6'>Bills</Typography>
                        <table style={{width: billsTable.getTotalSize()}}>
                            <thead>
                                {billsTable.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => {
                                            return (
                                                <th key={header.id} colSpan={header.colSpan} style={{width: header.getSize(), padding: '5px'}}>
                                                    {header.isPlaceholder ? null : (
                                                    <>
                                                        {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                        )}
                                                    </>
                                                    )}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {billsTable.getRowModel().rows.length > 0 ? (
                                    billsTable.getRowModel().rows.map(row => {
                                        return (
                                            <tr key={row.id} style={{height: '20px'}}>
                                                {row.getVisibleCells().map(cell => {
                                                    return (
                                                        <td key={cell.id} style={{padding: '4px 5px'}}>
                                                            {
                                                                flexRender(
                                                                    cell.column.columnDef.cell,
                                                                    cell.getContext()
                                                                )
                                                            }
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })) : (
                                        <tr className="EmptyTableData" key={"NoQuote"}>
                                            <td className="EmptyTableData" colSpan="100%">
                                                No Bills Found. Upload bills below.
                                            </td>
                                        </tr>
                                    )
                                }
                            </tbody>
                        </table>
                    </Grid>
                    <Grid item xs={12}>
                        <table className='accounts-table'>
                            <thead>
                                <tr>
                                    <th>Budget</th>
                                    <th>Profit</th>
                                    <th>Gross</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className={getBudget() == 0 ? '' : getBudget() > 0 ? 'withinBudget' : 'overBudget'}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getBudget())}</td>
                                    <td className={getProfit() == 0 ? '' : getProfit() > 0 ? 'withinBudget' : 'overBudget'}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getProfit())}</td>
                                    <td className={getGross() == 0 ? '' : getGross() > 0 ? 'withinBudget' : 'overBudget'}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getGross())}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Grid>
                    <Grid item xs={12}>
                        <p className='subHeader'>Upload New Bill</p>
                        <FileUploadSection onSubmit={handleNewBill} waiting={waiting.create} id="create_bill" type=".pdf" button="Create New Bill"/>
                    </Grid>
                </Grid>
            </DialogContent>
        </Dialog>
    </>
    );
}

export default Bill;