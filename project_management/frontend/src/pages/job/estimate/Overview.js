import React, { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, flexRender, } from '@tanstack/react-table'
import { Box, Button, Tooltip, CircularProgress, Portal, Snackbar, Alert, IconButton } from '@mui/material';
import useEstimate from './useEstimate';
import useAxiosPrivate from '../../../hooks/useAxiosPrivate';
import useAuth from '../../auth/useAuth';
import { produce } from 'immer';
import Bill from '../../bill/JobBill';

import DeleteIcon from '@mui/icons-material/Delete';
import DeleteDialog from '../../../components/DeleteDialog';

const EstimateOptionsOverview = ({bills, setBills, users, jobId, updateRequired, setUpdateRequired, contractors, client, myobSync}) => {
    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();
    const { setSelectedEstimate, estimateSet, setEstimateSet } = useEstimate();

    const [rowSelection, setRowSelection] = useState({});
    const [billsDialog, setBillsDialog] = useState(false);

    const [waiting, setWaiting] = useState({});
    const [snack, setSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackVariant, setSnackVariant] = useState('info');
    
    const [approvedEstimate, setApprovedEstimate] = useState({});
    const [lockedEstimate, setLockedEstimate] = useState(false);
    const [data, setData] = useState([]);

    useEffect(() => {
        setSelectedEstimate(rowSelection);
    }, [rowSelection])

    const handleToggleSelected = (row) => {
        row.toggleSelected();
    }

    useEffect(() => {
        for(var i = 0; i < estimateSet.length; i++) {
            if(estimateSet[i]['approvalDate'] !== null) {
                setApprovedEstimate(estimateSet[i]);
                setLockedEstimate(true);
                break;
            }
        }
        setData(estimateSet);
    }, [estimateSet])


    const editableCell = ({ getValue, row: { index }, column: { id }, table }) => {
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
                table.options.data.map((est, i) => {
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
                setEstimateSet(prev => prev.map((r, i) => {
                    if(i === index){
                        const newEstimateSet = produce(prev[i], draft => {
                            draft[id] = value
                        })
                        return newEstimateSet;
                    }
                    return r;
                }))
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

    const selectionCell = ({ getValue, row: { index }, column: { id }, table }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)
    
        // When the input is blurred, we'll call our table meta's updateData function
        const onChange = (value) => {
            table.options.meta?.updateData(index, id, value)

            // Dont update if the value has not changed
            if(!(!initialValue && value === '') && !(initialValue === value)) {
                setEstimateSet(prev => prev.map((r, i) => {
                    if(i === index){
                        const newEstimateSet = produce(prev[i], draft => {
                            draft[id] = {'id':value}
                        })
                        return newEstimateSet;
                    }
                    return r;
                }))
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

    const editableDateCell = ({ getValue, row: { index }, column: { id }, table }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue ?? "")
    
        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            table.options.meta?.updateData(index, id, value)

            // Dont update if the value has not changed
            if(!(!initialValue && value === '') && !(initialValue === value)) {
                setEstimateSet(prev => prev.map((r, i) => {
                    if(i === index){
                        const newEstimateSet = produce(prev[i], draft => {
                            draft[id] = value
                        })
                        return newEstimateSet;
                    }
                    return r;
                }))
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue ?? "")
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
            accessorFn: row => row.quoteBy?.id,
            header: () => 'Quote By',
            cell: selectionCell,
            minSize: 200,
            size: 200,
            maxSize: 200,
        },
        {                
            accessorKey: 'description',
            header: () => 'Description',
            cell: editableCell,
            minSize: 200,
            size: 300,
            maxSize: 350,
        },
        {
            accessorKey: 'price',
            header: () => 'Price',
            cell: info => <p style={{'textAlign': 'center'}}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue())}</p>,
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
            minSize: 80,
            size: 90,
            maxSize: 90,
            header: '',
            cell: ({row}) => (
            <>
            
                <IconButton onClick={(e) => {setDeleteDialog(prev => ({open: true, row: row, 
                    title: "Delete Estimate", message: "Are you sure you want to delete this estimate? This action can not be undone."}))}}>
                    <DeleteIcon />
                </IconButton>
            </>
            ),
        }
    ], []);

    const [deleteDialog, setDeleteDialog] = useState({open: false, row: {}, title: '', message: ''});

    const deleteEstimate = async () => {
        // Checks
        if(!deleteDialog || !deleteDialog.row) {
            setSnack(true);
            setSnackVariant('error');
            setSnackMessage("Error Deleting Estimate");
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
                setEstimateSet(estimateSet.filter(estimate => estimate.id !== deleteDialog.row.original.id))

                // Provide feedback to user
                setSnackVariant('success');
                setSnackMessage("Estimate Deleted");
            }
            else {
                setSnackVariant('error');
                setSnackMessage("Error Deleting Estimate");
            }
        }).catch((err) => {
            // console.log(err);
            setSnackVariant('error');
            setSnackMessage("Please Contact Admin: " + err);
        }).finally(() => {
            setSnack(true);
            setDeleteDialog({open: false, row: {}, title: '', message: ''})
            setUpdateRequired(false);
        });
    }

    const handleCreateQuote = async () => {
        setWaiting(prev => ({...prev, quote: true}));
        // console.log(auth);
        try {
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
                    jobId: jobId,
                    selectedEstimate: data[Object.keys(rowSelection)[0]].id,
                    userId: auth.user.id,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data?.create_quote
                // console.log("Successful Quote Creation?", res);
                // console.log("Successful Quote Creation?", res?.success);
                if(res?.success) {
                    setSnack(true);
                    setSnackVariant('success');
                    setSnackMessage("Quote Created");
                    setWaiting(prev => ({...prev, quote: false}));
                }
                else if (res?.message) {
                    setSnack(true);
                    setSnackVariant('error');
                    setSnackMessage("Quote Error: " + res.message);
                    setWaiting(prev => ({...prev, quote: false}));
                }
                else {
                    // console.log(response);
                    setSnack(true);
                    setSnackVariant('error');
                    setSnackMessage("Quote Error: " + response?.data?.errors[0]?.message);
                    setWaiting(prev => ({...prev, quote: false}));
                }
            });
        } catch (err) {
            // console.log(err);
            setSnack(true);
            setSnackVariant('error');
            setSnackMessage("Server Error. Please Contact Admin: " + err);
            setWaiting(prev => ({...prev, quote: false}));
        }
    }

    const handleCreateEstimate = async () => {
        setWaiting(prev => ({...prev, estimate: true}));
        // console.log(auth);
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
                jobId: jobId,
                selectedEstimate: data[Object.keys(rowSelection)[0]].id,
            },
        }),
        }).then((response) => {
            const res = response?.data?.data?.create_bgis_estimate
            if(res?.success) {
                setSnackVariant('success');
                setSnackMessage("Blank Estimate Created");
            }
            else if (res?.message) {
                setSnackVariant('error');
                setSnackMessage("Estimate Creation Error: " + res.message);
            }
            else {
                setSnackVariant('error');
                setSnackMessage("Estimate Creation Error: " + response?.data?.errors[0]?.message);
            }
        }).catch((err) => {
            console.log(err);
            setSnackVariant('error');
            setSnackMessage("Server Error. Please Contact Admin: " + err);
        }).finally(() => {
            setSnack(true);
            setWaiting(prev => ({...prev, estimate: false}));
        });
        
    }

    const handleEmailQuote = async () => {
        setWaiting(prev => ({...prev, email: true}));
        // console.log(auth);
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `mutation emailQuote ( $jobId: String!, $selectedEstimate: String!, $userId: String! ) { 
                        email_quote: emailQuote( jobId: $jobId, selectedEstimate: $selectedEstimate, userId: $userId)
                        {
                            success
                            message
                        }
                }`,
                variables: {
                    jobId: jobId,
                    selectedEstimate: data[Object.keys(rowSelection)[0]].name,
                    userId: auth.user.id,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data?.email_quote
                console.log("Successful Quote Creation?", res);
                // console.log("Successful Quote Creation?", res?.success);
                if(res?.success) {
                    setSnack(true);
                    setSnackVariant('success');
                    setSnackMessage(res?.message ?? "Quote Emailed");
                    setWaiting(prev => ({...prev, email: false}));
                }
                else if (res?.message) {
                    setSnack(true);
                    setSnackVariant('error');
                    setSnackMessage("Quote Error: " + res.message);
                    setWaiting(prev => ({...prev, email: false}));
                }
                else {
                    // console.log(response);
                    setSnack(true);
                    setSnackVariant('error');
                    setSnackMessage("Quote Error: " + response?.data?.errors[0]?.message);
                    setWaiting(prev => ({...prev, email: false}));
                }
            });
        } catch (err) {
            // console.log(err);
            setSnack(true);
            setSnackVariant('error');
            setSnackMessage("Server Error. Please Contact Admin: " + err);
            setWaiting(prev => ({...prev, email: false}));
        }
    }

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: {
            rowSelection,
        },
        enableMultiRowSelection: false,
        onRowSelectionChange: setRowSelection,
        // debugTable: true,
    });    

    const handleBillClose = (event, reason) => {
        setBillsDialog(false);
    }

    return (
        <>
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
                            <td className="EmptyTableData" colSpan="100%">
                                No Quotes Found. Press the + above to create a Quote.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

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
            
            {client == "1" ? 
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

            {lockedEstimate &&
                <Tooltip title={myobSync === null || myobSync === "" ? "Please Sync with MYOB" : null}>
                    <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                        <Button 
                            variant="outlined" 
                            style={{marginRight: '10px'}} 
                            disabled={myobSync === null || myobSync === ""}
                            onClick={e => setBillsDialog(true)}
                            >
                            Open Bills
                        </Button>
                    </Box>
                </Tooltip> 
            }

            <Bill open={billsDialog} onClose={handleBillClose} estimate={approvedEstimate} 
                bills={bills} setBills={setBills} contractors={contractors}/>

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

            <Portal>
                {/* Notification Snackbar */}
                <Snackbar
                    anchorOrigin={{vertical: "bottom", horizontal:"center"}}
                    open={snack}
                    autoHideDuration={6000}
                    onClose={(e) => setSnack(false)}
                    >
                    <Alert onClose={(e) => setSnack(false)} severity={snackVariant} sx={{width: '100%'}}>{snackMessage}</Alert>
                </Snackbar>
            </Portal>

            <DeleteDialog 
                open={deleteDialog.open} 
                close={() => setDeleteDialog(prev => ({...prev, open: false}))} 
                title={deleteDialog.title} message={deleteDialog.message} 
                action={() => deleteEstimate()} 
            />

            

            {/* {waiting ?
                <>
                    <div className="loader" style={{visibility: waiting ? 'visible' : 'hidden'}}></div>
                    <p className="loader-text" style={{visibility: waiting ? 'visible' : 'hidden'}}>Processing</p>
                </>
            :
                <>
                    <div className="icon" style={{visibility: uploadStatus === '' ? 'hidden' : 'visible'}}>
                        <Tooltip title={uploadStatusMessage} placement="top">
                            {uploadStatus === 'Error' ? <ErrorOutlineIcon color='error'/> :
                                uploadStatus === 'Success' ? <DoneIcon color='primary'/> : <></>}
                        </Tooltip>
                    </div>
                    <p className="loader-text" style={{visibility: uploadStatus === '' ? 'hidden' : 'visible'}}>{uploadStatus}</p>
                </>
            } */}
        </>
    );
}

export default EstimateOptionsOverview;