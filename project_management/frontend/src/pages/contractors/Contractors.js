import React, { useState, useEffect, useMemo, useCallback }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { useReactTable, getCoreRowModel, flexRender, getFilteredRowModel, getPaginationRowModel, } from '@tanstack/react-table'
import { Button, IconButton, Dialog, DialogContent, DialogTitle, 
         Grid, Box, CircularProgress, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import { usePrompt } from '../../hooks/promptBlocker';
import AddIcon from '@mui/icons-material/Add';
import { fuzzyFilter } from '../../components/TableHelpers';
import DebouncedInput from '../../components/DebouncedInput';
import useAuth from '../auth/useAuth';
import { Footer, InputField, PaginationControls, SnackBar, useSkipper } from '../../components/Components';

const Contractors = () => {

    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updateRequired, setUpdateRequired] = useState(false);
    const [changedRows, setChangedRows] = useState({});
    const [createContractor, setCreateContractor] = useState(false);
    const [newContractor, setNewContractor] = useState({
        'name': '',
        'abn': '',
        'bsb': '',
        'bankAccountName': '',
        'bankAccountNumber': '',
    });

    const [waiting, setWaiting] = useState(false);

    const [snack, setSnack] = useState({active: false, variant: 'info', message:''})

    // Navigation Blocker
    usePrompt('You have unsaved changes. Are you sure you want to leave?', updateRequired && !loading);

    // Keyboard shortcuts
    const handleKeyPress = useCallback((e) => {
        if (e.code === 'KeyS' && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
            e.preventDefault();
            // console.log(saveCommand)
            // if(!saveCommand) {
                
            //     console.log("Updating")
            //     saveCommand = true;
            //     handleUploadChanges();
            // }
        }
    }, [])

    useEffect(() => {
        // Attach event listener
        document.addEventListener('keydown', handleKeyPress);
        
        // Remove event listener
        return () => {
            document.addEventListener('keydown', handleKeyPress)
        }
    }, [handleKeyPress]);

        
    // Dialog Controls
    const handleDialogClose = (event, reason, value) => {
        if (reason !== 'backdropClick') {
            setNewContractor(value);
            setCreateContractor(false);
        }
    }

    const handleDialogCreate = (value) => {
        setNewContractor(value);
        handleCreate(value);
        setCreateContractor(false);
    }
    
    // Get Data
    useEffect(() => {
        // Set Default Page Size
        table.getState().pagination.pageSize = 25;

        axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `{ 
                    contractors {
                        id
                        myobUid
                        name
                        abn
                        bsb
                        bankAccountName
                        bankAccountNumber
                    }
                }`,
                variables: {}
            }),
        }).then((response) => {
            const res = response?.data?.data?.contractors;            
            setData(res);
            setLoading(false);
        });
    }, []);

    const editableCell = ({ getValue, row: { index }, column: { id }, table }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)

        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            if(initialValue !== value) {
                setChangedRows(prev => ({...prev, [index]: true}));
                table.options.meta?.updateData(index, id, value);
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        // Customise each input based on id
        let additionalProps = {}
        let onChange = () => {}
        switch(id) {
            case "name":
                onChange = (e) => setValue(e.target.value)
                additionalProps = {
                    maxLength: '50',
                }
                break;
            case "bsb":
                onChange = (e) => setValue(inputMask(id, e.target.value))
                additionalProps = {
                    maxLength: '7',
                    name: id,
                }
                break;
            case "abn":
                onChange = (e) => setValue(inputMask(id, e.target.value))
                additionalProps = {
                    maxLength: '14',
                    name: id,
                }
                break;
            case "bankAccountNumber":
                onChange = (e) => setValue(e.target.value)
                additionalProps = {
                    maxLength: '9',
                }
                break;
            case "bankAccountName":
                onChange = (e) => setValue(inputMask(id, e.target.value))
                additionalProps = {
                    maxLength: '32',
                    name: id,
                }
                break;
            default:
                onChange = (e) => setValue(e.target.value)
                break;
        }
        
        return (
            <input className="dataTableInput"value={value} onChange={onChange} onBlur={onBlur} {...additionalProps}/>
        )
    }

    // Table Columns
    const columns = useMemo(() => [
        {                
            accessorKey: 'name',
            header: () => 'Supplier',
            cell: editableCell,
            size: 480,
        },
        {                
            accessorKey: 'abn',
            header: () => 'ABN',
            cell: editableCell,
            size: 120,
        },
        {
            accessorKey: 'bsb',
            header: () => 'BSB',
            cell: info => info.getValue(),
            cell: editableCell,
            size: 70,
        },
        {
            accessorKey: 'bankAccountNumber',
            header: () => 'Bank Number',
            cell: editableCell,
            size: 80,
        },
        {
            accessorKey: 'bankAccountName',
            header: () => 'Bank Name',
            cell: editableCell,
            size: 380,
        },
        {
            id: 'contacts',
            accessorFn: row => row?.contacts?.length,
            header: () => 'Contacts',
            cell: ({row}) => (
                <span style={{display: 'table', margin: '0 auto'}}>
                    <IconButton onClick={() => {console.log("To the contacts for:", row?.original?.name, row)}} style={{padding: '0px'}}>
                        <PersonIcon />
                    </IconButton>
                    {/* <p>{info.getValue()}</p> */}
                </span>
            ),
            size: 60,
        },
    ], []);

    
    const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
    const [globalFilter, setGlobalFilter] = React.useState('')
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),   
        getPaginationRowModel: getPaginationRowModel(),     
        globalFilterFn: fuzzyFilter,
        onGlobalFilterChange: setGlobalFilter,
        autoResetPageIndex,
        state: {
            globalFilter,
        },
        meta: {
            updateData: (rowIndex, columnId, value) => {
                setUpdateRequired(true);
                skipAutoResetPageIndex();
                setData(old => old.map((row, index) => {
                    if(index === rowIndex) {
                        return {
                            ...old[rowIndex],
                            [columnId]: value,
                        }
                    }
                    return row;
                }));
            },
        },
    });  

    const handleCreate = async (newContractor) => {
        //Send to MYOB
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation myobCreateContractor($contractor: myobContractorInput!, $uid: String!) { 
                    myob_create: myobCreateContractor(contractor: $contractor, uid: $uid) {
                        success
                        message
                        myobUid
                    }
                }`,
                variables: { 
                    uid: auth?.myob?.id,
                    contractor: newContractor,
                },
            }),
        }).then((response) => {
            // console.log(response);
            const res = response?.data?.data?.myob_create;

            // TODO: Add Snackbar
            if(res.success){
                // // Upon successful response from myob, send to backend
                // newContractor['myobUid'] = res.myobUid
                // if(res.success) {
                //     axiosPrivate({
                //         method: 'post',
                //         data: JSON.stringify({
                //             query: `
                //             mutation createContractor($contractor: ContractorInput!) { 
                //                 create: createContractor(contractor: $contractor) {
                //                     success
                //                     contractor {
                //                         id
                //                         myobUid
                //                         name
                //                         abn
                //                         bsb
                //                         bankAccountName
                //                         bankAccountNumber
                //                     }
                //                 }
                //             }`,
                //             variables: { 
                //                 contractor: newContractor,
                //             },
                //         }),
                //     }).then((response) => {
                //         // console.log(response);
                //         const res = response?.data?.data?.create;
                        
                //     }).catch((e) => {
                //         console.log("error", e);
                //         setSnack({active: true, variant: 'error', message: "Error Creating Contractor"})
                //     });
                // }     
                setSnack({active: true, variant: 'success', message: "Successfully Created Contractor"})
                // Clear Dialog Content
                setNewContractor({
                    'name': '',
                    'abn': '',
                    'bsb': '',
                    'bankAccountName': '',
                    'bankAccountNumber': '',
                });
                setCreateContractor(false);
                setData(oldArray => [...oldArray, res.contractor]);
            }
            else {
                console.log("error",res);
                setSnack({active: true, variant: 'error', message: "Error Creating Contractor"})
            }
        }).catch((e) => {
            console.log("error", e);
            setSnack({active: true, variant: 'error', message: "Error Creating Contractor"})
        });   
        
    }

    const handleSave = async () => {

        setWaiting(true);
        // Gather the rows that have been changed
        let changedContractors = []
        for(let x in changedRows) {
            changedContractors.push(data[x])
        }

        console.log(changedContractors)

        // Update the changed data
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation myobUpdateContractor($contractors: [myobContractorInput]!, $uid: String!) { 
                    update: myobUpdateContractor(contractors: $contractors, uid: $uid) {
                        success
                        message
                    }
                }`,
                variables: { 
                    uid: auth?.myob?.id,
                    contractors: changedContractors,
                },
            }),
        }).then((response) => {
            console.log(response);
            const res = response?.data?.data?.update;
            if(res.success){
                setSnack({active: true, variant: 'success', message: res.message})
                setUpdateRequired(false);
            }
            else {
                console.log("error",res); 
                setSnack({active: true, variant: 'error', message: res.message})
            }
        }).catch((e) => {
            console.log("error", e);
        }).finally(() => {
            setWaiting(false);
        }); 
    }

    // <pre>
    //     <code>{JSON.stringify(contractors, null, 2)}</code>
    // </pre>

    return(<>
        <Grid container spacing={1} alignItems="center">
            <Grid item xs={12} align="center">
                <DebouncedInput
                    value={globalFilter ?? ''}
                    onChange={value => setGlobalFilter(String(value))}
                    placeholder="Search Contractors"
                    style={{maxWidth: table.getTotalSize()}}
                />
            </Grid>
            <Grid item xs={12} align="center" style={{overflowX: 'auto', overflowY: 'hidden'}}>
                {loading ? 
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}} align="center">
                        <CircularProgress />
                    </Box>
                    :
                    data && data.length > 0 ? <>
                        <table style={{width: table.getTotalSize()}}>
                            <thead>
                                {table.getHeaderGroups().map(headerGroup => (
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
                                {table.getRowModel().rows.map(row => {
                                    return (
                                        <tr key={row.id}>
                                            {row.getVisibleCells().map(cell => {
                                                return (
                                                    <td key={cell.id} style={{padding: '3px 0px'}}>
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
                        <Grid item xs={12} align="center">
                            <PaginationControls table={table}/>
                        </Grid>
                    </>
                    : <>
                        <p>No Contractors Found</p>
                    </>
                }
            </Grid> 
        </Grid>

        {/* Footer AppBar with Controls */}
        <Footer>
            <Tooltip title="Save Changes">
                <span>
                    <IconButton disabled={!updateRequired} onClick={handleSave}>
                        <Box sx={{position: 'relative', display: 'inline-block', width: '24px', height: '24px'}} >
                            <SaveIcon />
                            {waiting && (
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
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Create New Contractor">
                <IconButton onClick={(e) => setCreateContractor(true)}><AddIcon /></IconButton>
            </Tooltip>
        </Footer>

        <SnackBar snack={snack} setSnack={setSnack} />

        {/* Create Contractor Dialog Box */}
        <CreateDialog createObject={newContractor} open={createContractor} onCreate={handleDialogCreate} onClose={handleDialogClose}/>
    </>);
}

export const CreateDialog = ({ createObject, open, onCreate, onClose }) => {

    const [value, setValue] = useState(createObject);
    const [fieldError, setFieldError] = useState({'name': false, 'abn': false,'bsb': false,'bankAccountName': false,'bankAccountNumber': false});

    const handleDialogChange = (e) => {
        if(e.target.name === 'abn' && fieldError['abn'] && e.target.value.length == 14) {
            setFieldError(prev => ({...prev, 'abn': false}))
        }
        if(e.target.name === 'bsb' && fieldError['bsb'] && e.target.value.length == 7) {
            setFieldError(prev => ({...prev, 'bsb': false}))
        }
        if(e.target.name === 'bankAccountNumber' && fieldError['bankAccountNumber'] && e.target.value.length >= 6) {
            setFieldError(prev => ({...prev, 'bankAccountNumber': false}))
        }

        setValue(prev => ({...prev, [e.target.name]: inputMask(e.target.name, e.target.value)}))
    }

    const handleClose = (event, reason) => {
        setFieldError({'name': false, 'abn': false,'bsb': false,'bankAccountName': false,'bankAccountNumber': false});
        onClose(event, reason, value);
    }

    const handleCreate = () => {
        let error = false;
        if(value['abn'].length < 14) {
            setFieldError(prev => ({...prev, 'abn': true}))
            error = true;
        }
        if(value['bsb'].length < 7) {
            setFieldError(prev => ({...prev, 'bsb': true}))
            error = true;
        }
        if(value['bankAccountNumber'].length < 6) {
            setFieldError(prev => ({...prev, 'bankAccountNumber': true}))
            error = true;
        }
        
        if(error) {
            return
        }

        onCreate(value);
    }

    return(
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle sx={{margin: '0 auto'}}>Create New Contractor</DialogTitle>
            <DialogContent>
                <Grid container spacing={1} align="center">
                    <Grid item xs={12}>
                        <InputField 
                            error={fieldError['name']} 
                            label="Contractor" name="name" 
                            value={value['name']} 
                            onChange={handleDialogChange} maxLength="50"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <InputField 
                            error={fieldError['abn']} 
                            label="ABN" name="abn" 
                            value={value['abn']} 
                            onChange={handleDialogChange} maxLength="14"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <InputField 
                            error={fieldError['bankAccountName']} 
                            label="Bank Account Name" name="bankAccountName" 
                            value={value['bankAccountName']} 
                            onChange={handleDialogChange} maxLength="32"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <InputField 
                            error={fieldError['bsb']} 
                            label="BSB" name="bsb" 
                            value={value['bsb']} 
                            onChange={handleDialogChange} maxLength="7" 
                            style={{width: '75px', marginRight: '5px'}}
                        />
                        <InputField 
                            error={fieldError['bankAccountNumber']} 
                            label="Account Number" name="bankAccountNumber" 
                            value={value['bankAccountNumber']} 
                            onChange={handleDialogChange} maxLength="9" 
                            style={{width: '120px', marginLeft: '5px'}}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Button sx={{paddingTop: '25px'}} onClick={handleClose}>Cancel</Button>
                        <Button sx={{paddingTop: '25px'}} onClick={handleCreate}>Create</Button>
                    </Grid>
                </Grid>
            </DialogContent>
        </Dialog>
    )
}

// Mask inputs
const inputMask = (name, val) => {
    let pattern = '';
    let re = RegExp()
    switch(name) {
        case "bsb":
            if(val.length <= 3) {
                pattern = `[0-9]{${val.length}}`;
            }
            else {
                pattern = `[0-9]{3}-[0-9]{${val.length - 4}}`;
            }
            
            re = new RegExp(pattern)
            if(val.length === 4 && val.slice(3,4) !== "-" && !re.test(val)) {
                val = val.slice(0, 3) + "-" + val.slice(3,4)
            }

            break;

        case "abn":
            if(val.length <= 2) {
                pattern = `[0-9]{${val.length}}`;
            }
            else if(val.length <= 6) {
                pattern = `[0-9]{2} [0-9]{${val.length - 3}}`;
            }
            else if(val.length <= 10) {
                pattern = `[0-9]{2} [0-9]{3} [0-9]{${val.length - 7}}`;
            }
            else {
                pattern = `[0-9]{2} [0-9]{3} [0-9]{3} [0-9]{${val.length - 10}}`;
            }
            
            re = new RegExp(pattern)
            if(val.length === 3 && val.slice(2,3) !== " " && !re.test(val)) {
                val = val.slice(0,2) + " " + val.slice(2,3)
            }
            if(val.length === 7 && val.slice(6,7) !== " " && !re.test(val)) {
                val = val.slice(0,6) + " " + val.slice(6,7)
            }
            if(val.length === 11 && val.slice(10,11) !== " " && !re.test(val)) {
                val = val.slice(0,10) + " " + val.slice(10,11)
            }
            
            break;
        case "bankAccountName":
            val = val.toUpperCase();
            break;
        default:
            break;
    }
    return val;
}


export default Contractors;