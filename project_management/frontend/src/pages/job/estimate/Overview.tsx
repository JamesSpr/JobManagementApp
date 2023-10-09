import React, { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, flexRender, Row } from '@tanstack/react-table'
import { Box, Button, Tooltip, CircularProgress, IconButton, Grid } from '@mui/material';
import useAxiosPrivate from '../../../hooks/useAxiosPrivate';
import useAuth from '../../auth/useAuth';
import { produce } from 'immer';

import DeleteIcon from '@mui/icons-material/Delete';
import { ContractorType, EmployeeType, EstimateType, JobType, SnackType } from '../../../types/types';
import { BasicDialog } from '../../../components/Components';
import BillDialog from '../../bill/BillDialog';

const EstimateOptionsOverview = ({ users, job, setJob, updateRequired, setUpdateRequired, contractors, setSnack }: {
    users: EmployeeType[]
    job: JobType
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    updateRequired: boolean
    setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>
    contractors: ContractorType[]
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {
    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();

    const [rowSelection, setRowSelection] = useState({});
    const [billsDialog, setBillsDialog] = useState(false);

    const [waiting, setWaiting] = useState({quote: false, estimate: false});
    
    const handleToggleSelected = (row: Row<EstimateType>) => {
        row.toggleSelected();
    }

    const editableCell = ({ getValue, row: { index }, column: { id }, table }: 
        { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)
        const [valueError, setValueError] = useState(false)
    
        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            table.options.meta?.updateData(index, id, value)

            // Dont allow for duplicate or blank estimate names
            setValueError(false)
            let dupe = false
            if(id === 'name') {
                if(value.toLowerCase().trim() === "") {
                    setValueError(true)
                    return
                }
                table.options.data.map((est: { name: string; }, i: any) => {
                    if(index !== i) {
                        if(value.toLowerCase().trim() === est.name.toLowerCase().trim()){
                            setValueError(true)
                            dupe = true
                        }                        
                    }
                })
            }

            if(dupe) {
                return
            }

            // Dont update if the value has not changed
            if(!(!initialValue && value === '') && !(initialValue === value)) {
                setJob(prev => ({...prev, estimateSet: prev.estimateSet.map((es, i) => {
                    if(i === index) {
                        const newEstimateSet = produce(prev.estimateSet[i], (draft: { [x: string]: { id: any; }; }) => {
                            draft[id] = value
                        })
                        return newEstimateSet;
                    }
                    return es
                })}))
                setUpdateRequired(true);
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        return (
            <Tooltip title={valueError? <p>Quote names must be unique</p> : ""}>
                <input className="estimateTableInput" title="" style={{"border": valueError ? '2px solid red' : "", "outlineColor": valueError ? 'red' : ""}} value={value} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
            </Tooltip>
        )
    }

    const selectionCell = ({ getValue, row: { index }, column: { id }, table }: 
        { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)
    
        // When the input is blurred, we'll call our table meta's updateData function
        const onChange = (value: string) => {
            table.options.meta?.updateData(index, id, value)

            // Dont update if the value has not changed
            if(!(!initialValue && value === '') && !(initialValue === value)) {
                setJob(prev => ({...prev, estimateSet: prev.estimateSet.map((es, i) => {
                    if(i === index) {
                        const newEstimateSet = produce(prev.estimateSet[i], (draft: { [x: string]: { id: any; }; }) => {
                            draft[id] = {'id':value}
                        })
                        return newEstimateSet;
                    }
                    return es
                })}))
                setUpdateRequired(true);
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        return (
            <select className="estimateTableInput" value={value} onChange={e => onChange(e.target.value)}>
                {users?.map((user) => (
                    <option key={user.id} value={user.id}>{user.firstName + " " + user.lastName}</option>
                ))}
            </select>
        )
    }

    const editableDateCell = ({ getValue, row: { index }, column: { id }, table }: 
        { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue ?? null)
    
        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            const val = (value === "" ? null : value)
            table.options.meta?.updateData(index, id, val)

            // Dont update if the value has not changed
            if(!(!initialValue && val === null) && !(initialValue === val)) {
                setJob(prev => ({...prev, estimateSet: prev.estimateSet.map((es, i) => {
                    if(i === index) {
                        const newEstimateSet = produce(prev.estimateSet[i], (draft: { [x: string]: { id: any; }; }) => {
                            draft[id] = val
                        })
                        return newEstimateSet;
                    }
                    return es
                })}))
                setUpdateRequired(true);
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue ?? null)
        }, [initialValue])

        return (
            <input type="date" max="9999-12-31" className="estimateTableInput" value={value} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
        )
    }

    // Table Columns
    const columns = useMemo(() => [
        {                
            accessorKey: 'name',
            header: () => 'Name',
            cell: editableCell,
            minSize: 100,
            size: 200,
            maxSize: 250,
        },
        {
            id: 'quoteBy',
            accessorFn: (row: { quoteBy: { id: any; }; }) => row.quoteBy?.id,
            header: "Quote By",
            cell: selectionCell,
            minSize: 200,
            size: 200,
            maxSize: 200,
        },
        {                
            accessorKey: 'description',
            header: () => 'Notes',
            cell: editableCell,
            minSize: 200,
            size: 300,
            maxSize: 350,
        },
        {
            accessorKey: 'price',
            header: () => 'Price',
            cell: (info: { getValue: () => number | bigint; }) => <p style={{'textAlign': 'center'}}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue())}</p>,
            minSize: 100,
            size: 125,
            maxSize: 150,
        },
        {
            accessorKey: 'issueDate',
            header: () => 'Issue Date',
            cell: editableDateCell, 
            minSize: 125,
            size: 125,
            maxSize: 125,
        },
        {
            accessorKey: 'approvalDate',
            header: () => 'Approval Date',
            cell: editableDateCell,
            minSize: 125,
            size: 125,
            maxSize: 125,
        },
        {
            id: 'deleteButton',
            size: 90,
            header: () => '',
            cell: ({row}: {row:any}) => (
                row.original.approvalDate ? <></> :
                <>
                    <IconButton onClick={(e) => {setDeleteDialog(({open: true, row: row, 
                        title: "Delete Estimate", message: "Are you sure you want to delete this estimate? This action can not be undone."}))}}>
                        <DeleteIcon />
                    </IconButton>
                </>
            ),
        }
    ], []);

    interface DeleteDialog {
        open: boolean
        row: Row<EstimateType> | undefined
        title: string
        message: string
    }
    const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>({open: false, row: undefined, title: '', message: ''});

    const deleteEstimate = async () => {
        // Checks
        if(!deleteDialog || !deleteDialog.row) {
            setSnack({active: true, variant:'error', message: 'Error Deleting Estimate'})
            return;
        }
               
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation deleteEstimate($id: ID!){
                    delete: deleteEstimate(id: $id) {
                        ok
                    }
                }`,
            variables: {
                id: deleteDialog?.row?.original?.id,
            },
        }),
        }).then((response) => {
            const res = response?.data?.data?.delete
            if(res?.ok) {
                // Remove estimate from list
                setJob(prev => ({...prev, estimateSet: prev.estimateSet.filter((estimate: { id: any; }) => estimate.id !== deleteDialog?.row?.original.id)}))
                setRowSelection({});

                // Provide feedback to user
                setSnack({active: true, variant:'success', message: 'Estimate Deleted'})
            }
            else {
                setSnack({active: true, variant:'error', message: 'Error Deleting Estimate'})
            }
        }).catch((err) => {
            console.log(err);
            setSnack({active: true, variant:'error', message: 'Error. Please contact Developer'})
        }).finally(() => {
            setDeleteDialog({open: false, row: undefined, title: '', message: ''})
        });
    }

    const handleCreateQuote = async () => {
        setWaiting(prev => ({...prev, quote: true}));
        // console.log(auth);
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation createQuote ( $jobId: String!, $selectedEstimate: String!, $userId: String! ) { 
                    create_quote: createQuote( jobId: $jobId, selectedEstimate: $selectedEstimate, userId: $userId)
                    {
                        success
                        message
                    }
            }`,
            variables: {
                jobId: job.id,
                selectedEstimate: job.estimateSet[parseInt(Object.keys(rowSelection)[0])].id,
                userId: auth?.user.id,
            },
        }),
        }).then((response) => {
            const res = response?.data?.data?.create_quote
            
            if(res?.success) {
                setSnack({active: true, variant:'success', message: 'Quote Created'})
            }
            else {
                setSnack({active: true, variant:'error', message: 'Quote Error: ' + res.message})
            }
        }).catch((err) => {
            setSnack({active: true, variant:'error', message: 'Server Error. Please Contact Developer'})
            console.log(err)
        }).finally(() => {
            setWaiting(prev => ({...prev, quote: false}));
        });
    }

    const handleCreateEstimate = async () => {
        setWaiting(prev => ({...prev, estimate: true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation createBgisEstimate ( $jobId: String!, $selectedEstimate: String!) { 
                    create_bgis_estimate: createBgisEstimate( jobId: $jobId, selectedEstimate: $selectedEstimate)
                    {
                        success
                        message
                    }
            }`,
            variables: {
                jobId: job.id,
                selectedEstimate: job.estimateSet[parseInt(Object.keys(rowSelection)[0])].id,
            },
        }),
        }).then((response) => {
            const res = response?.data?.data?.create_bgis_estimate
            if(res?.success) {
                setSnack({active: true, variant:'success', message: 'Estimate Created'})
            }
            else {
                setSnack({active: true, variant:'error', message: "Estimate Creation Error: " + res.message})
            }
        }).catch((err) => {
            console.log(err);
            setSnack({active: true, variant:'error', message: "Server Error. Please Contact Admin: " + err})
        }).finally(() => {
            setWaiting(prev => ({...prev, estimate: false}));
        });
        
    }

    // const handleEmailQuote = async () => {
    //     setWaiting(prev => ({...prev, email: true}));
    //     // console.log(auth);
    //     await axiosPrivate({
    //         method: 'post',
    //         data: JSON.stringify({
    //             query: `mutation emailQuote ( $jobId: String!, $selectedEstimate: String!, $userId: String! ) { 
    //                 email_quote: emailQuote( jobId: $jobId, selectedEstimate: $selectedEstimate, userId: $userId)
    //                 {
    //                     success
    //                     message
    //                 }
    //         }`,
    //         variables: {
    //             jobId: job.id,
    //             selectedEstimate: job.estimateSet[parseInt(Object.keys(rowSelection)[0])].name,
    //             userId: auth?.user.id,
    //         },
    //     }),
    //     }).then((response) => {
    //         const res = response?.data?.data?.email_quote
    //         console.log("Successful Quote Creation?", res);
    //         // console.log("Successful Quote Creation?", res?.success);
    //         if(res?.success) {
    //             setSnack({active: true, variant:'success', message: res?.message ?? "Quote Emailed"})
    //         }
    //         else {
    //             setSnack({active: true, variant:'error', message: "Quote Error: " + res.message})
    //         }
    //     }).catch((err) => {
    //         console.log(err);
    //         setSnack({active: true, variant:'error', message: "Server Error. Please Contact Developer: " + err})            
    //     }).finally(() => {
    //         setWaiting(prev => ({...prev, email: false}));

    //     })
    // }

    const table = useReactTable({
        data: job.estimateSet,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: {
            rowSelection,
        },
        enableMultiRowSelection: false,
        onRowSelectionChange: setRowSelection,
        // debugTable: true,
    });    

    const handleBillClose = (event: any, reason: any) => {
        setBillsDialog(false);
    }

    return (
        <>        
        <Grid container direction={'column'} alignItems={'center'}>
            <table className="estimateOverview" style={{ width: table.getTotalSize()}}>
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => {
                                return (
                                    <th key={header.id} colSpan={header.colSpan} style={{ width: header.getSize(), padding: '2px', fontWeight: 'bold', textAlign: 'center' }}>
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
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map(row => (
                            <tr key={row.id} className={row.getIsSelected() ? "selectedRow" : ""} onClick={(e) => {handleToggleSelected(row)}}>
                                {row.getVisibleCells().map(cell => {
                                    return (
                                        <td key={cell.id} style={{padding: '2px', width: cell.column.getSize()}} >
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
                        )) 
                    ):(
                        <tr className="EmptyTableData" key={"NoQuote"}>
                            <td className="EmptyTableData" colSpan={7}>
                                No Quotes Found. Press the + above to create a Quote.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <Grid item xs={12}>
                <Tooltip placement="top" title={updateRequired ? "Please Save Changes" : Object.keys(rowSelection).length === 0 ? "Please Select a Quote" : ""}>
                    <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                        <Button 
                            variant="outlined" 
                            style={{marginRight: '10px'}} 
                            disabled={Object.keys(rowSelection).length === 0 || updateRequired} 
                            onClick={handleCreateQuote}
                        >
                            Print Quote
                        </Button>
                        {waiting.quote && (
                            <CircularProgress size={24} 
                                sx={{
                                    colour: 'primary', 
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    marginTop: '-12px',
                                    marginLeft: '-12px',
                                }}
                            />
                        )}
                    </Box>
                </Tooltip> 
                
                {job.client.id == "1" ? 
                    <Tooltip placement="top" title={updateRequired ? "Please Save Changes" : Object.keys(rowSelection).length === 0 ? "Please Select a Quote" : ""}>
                        <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                            <Button 
                                variant="outlined" 
                                style={{marginRight: '10px'}} 
                                disabled={Object.keys(rowSelection).length === 0 || updateRequired} 
                                onClick={handleCreateEstimate}
                            >
                                New Estimate
                            </Button>
                            {waiting.estimate && (
                                <CircularProgress size={24} 
                                    sx={{
                                        colour: 'primary', 
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        marginTop: '-12px',
                                        marginLeft: '-12px',
                                    }}
                                />
                            )}
                        </Box>
                    </Tooltip> : <></>
                }

                {job.estimateSet.find((estimate) => estimate.approvalDate !== null) &&
                    <Tooltip title={job.myobUid === "" ? "Please Sync with MYOB" : null}>
                        <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                            <Button 
                                variant="outlined" 
                                style={{marginRight: '10px'}} 
                                disabled={job.myobUid === ""}
                                onClick={e => setBillsDialog(true)}
                                >
                                Open Bills
                            </Button>
                        </Box>
                    </Tooltip> 
                }
            </Grid>

            <BillDialog open={billsDialog} onClose={handleBillClose} job={job} setJob={setJob} contractors={contractors} setSnack={setSnack}/>

            {/* { auth.user.role === "DEV" ? 
                <Tooltip placement="top" title={updateRequired ? "Please Save Changes" : Object.keys(rowSelection).length === 0 ? "Please Select a Quote" : ""}>
                    <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                        <Button 
                            variant="outlined" 
                            style={{marginRight: '10px'}} 
                            disabled={Object.keys(rowSelection).length === 0 || updateRequired} 
                            onClick={handleEmailQuote}
                        >
                            Email Quote
                        </Button>
                        {waiting.email && (
                            <CircularProgress size={24} 
                                sx={{
                                    colour: 'primary', 
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    marginTop: '-12px',
                                    marginLeft: '-12px',
                                }}
                            />
                        )}
                    </Box>
                </Tooltip> 
                : <></>
            } */}

        </Grid>

        <BasicDialog 
            open={deleteDialog.open} 
            close={() => setDeleteDialog(prev => ({...prev, open: false}))} 
            title={deleteDialog.title}
            action={() => deleteEstimate()} 
        >
            <p>{deleteDialog.message}</p>
        </BasicDialog>
        </>
    );
}

export default EstimateOptionsOverview;