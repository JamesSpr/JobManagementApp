import React, { useState, useEffect, useMemo, useCallback }  from 'react';
import { useParams } from 'react-router-dom';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { createTable, Column,  useReactTable, getCoreRowModel, getGroupedRowModel, ColumnDef, flexRender, isRowSelected } from '@tanstack/react-table'
import { Table, TableHead, TableBody, TableCell, TableRow, TableContainer, 
        Button, IconButton, Dialog, DialogActions, DialogContent, DialogContentText,
        DialogTitle, Grid, TextField, Box, AppBar, Toolbar, CircularProgress, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { usePrompt } from '../../hooks/promptBlocker';
import AddIcon from '@mui/icons-material/Add';
import produce from 'immer';

const Regions = () => {
    const axiosPrivate = useAxiosPrivate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updateRequired, setUpdateRequired] = useState(false);
    const [createRegion, setCreateRegion] = useState(false);
    const [newRegion, setNewRegion] = useState({
        'client':'',
        'shortName':'',
        'name':'',
        'email':'',
        'billToAddress':''
    });

    const [dialogTitle, setDialogTitle] = useState("");
    const [dialogMessage, setDialogMessage] = useState("");
    const [openAlert, setOpenAlert] = useState(false);
    const [deleteRow, setDeleteRow] = useState('');

    // Dialog Controls
    const openDialog = (row) => {
        setDialogTitle("Delete Region");
        setDialogMessage("Are you sure you want to delete this region? This action will be permanent.");
        setDeleteRow(row);
        setOpenAlert(true);
    }

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

    const { client } = useParams();
    if(client) {
        useEffect(() => {
            setNewRegion(prev => ({...prev, 'client': client}));
            // Get Data
            axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `query clientRegions($client: String!){ 
                        clientRegions(client: $client) {
                            id
                            shortName
                            name
                            email
                            billToAddress
                        }
                    }`,
                    variables: {
                        client: client
                    }
                }),
            }).then((response) => {
                const res = response?.data?.data;
                setData(res?.clientRegions);
                setLoading(false);
            });
        }, []);
    } else {
        client === "" ? navigate('/clients') : navigate('/missing', { replace: true, state: {missing: "client"} })
    }      

    const editableCell = ({ getValue, row, column: { id }, table }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)

        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            if(initialValue !== value) {
                setData(prev => (prev.map((old) => {
                    if(old.id === row.original.id) {
                        const newRow = produce(prev[row.index], draft => {
                            draft[id] = value;
                        })
                        return newRow;
                    }
                    return old;
                })))
                setUpdateRequired(true);
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        return (
            <TextField
            fullWidth
            multiline={true}
            size="small"
            onBlur={onBlur}
            sx={{display: 'block', margin: '0 auto', 
                '& .MuiOutlinedInput-root': { padding: '16px', fontSize: '0.875rem' },}}
            value={value} 
            onChange={e => setValue(e.target.value)}/>
        )
    }

    // Table Columns
    const columns = useMemo(() => [
        {
            accessorKey: 'shortName',
            header: () => 'Abbreviation',
            cell: editableCell,
            minSize: 100,
            size: 150,
            maxSize: 150,
        },
        {
            accessorKey: 'name',
            header: () => 'Name',
            cell: editableCell,
            minSize: 150,
            size: 250,
            maxSize: 250,
        },
        {
            accessorKey: 'email',
            header: () => 'Email',
            cell: editableCell,
            minSize: 200,
            size: 300,
            maxSize: 300,
        },
        {
            accessorKey: 'billToAddress',
            header: () => 'Bill To Address',
            cell: editableCell,
            minSize: 200,
            size: 500,
            maxSize: 500,
        },
        {
            id: 'controls',
            header: '',
            minSize: 40,
            size: 40,
            maxSize: 40,
            header: () => '',
            cell: ({row}) => (
                <IconButton onClick={() => {openDialog(row)}} sx={{display: 'table', margin: '0 auto'}}>
                    <DeleteIcon />
                </IconButton>
            ),
        }
    ], []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        // state: {
        //     rowSelection,
        // },
        // enableMultiRowSelection: false,
        // onRowSelectionChange: setRowSelection,
        // debugTable: true,
    });  
    
    const handleClose = (event, reason) => {
        if (reason !== 'backdropClick') {
            setCreateRegion(false);
        }
    }

    const handleDelete = async (row) => {
        let newRegions = [];
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation deleteClientRegion($id: String!) { 
                    delete_region: deleteClientRegion(id:$id) {
                    success
                }
            }`,
            variables: { 
                id: row.original.id,
            }, 
        }),
        }).then((response) => {
            console.log(response)
            const res = response?.data?.data?.delete_region;
            // console.log(res);
            if(res.success){
                // Clear Dialog Content
                setData(old => {
                    newRegions = [];
                    for(let i = 0; i < old.length; i++) {
                        if(i !== parseInt(row.id)) {
                            newRegions.push(old[i]);
                        }
                    }
                    return newRegions;
                })
            }
            else {
                console.log("error", res)
            }
        });

        setDialogTitle("");
        setDialogMessage("");
        setDeleteRow('');
        setOpenAlert(false);
    }

    const handleCreate = async () => {
        // Clean data

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation createClientRegion($region: ClientRegionInput!) { 
                    create_region: createClientRegion(region:$region) {
                    success
                    clientRegion {
                        id
                        name
                        shortName
                        email
                        billToAddress
                    }
                }
            }`,
            variables: { 
                region: newRegion,
            }, 
        }),
        }).then((response) => {
            const res = response?.data?.data?.create_region;
            // console.log(res);
            // TODO: Add Snackbar
            if(res.success){
                // Clear Dialog Content
                setNewRegion({'client':client, 'shortName':'', 'name':'', 'email':'', 'billToAddress':''});
                setCreateRegion(false);
                setData(oldArray => [...oldArray, res.clientRegion]);
            }
            else {
                console.log("error",res);
            }
        });
    }

    const handleSave = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
            query: `
            mutation updateClientRegion($regions: [ClientRegionInput]!, $client: String!) { 
                update: updateClientRegion(regions: $regions, client: $client) {
                    success
                }
            }`,
            variables: { 
                regions: data,
                client: client
            }, 
        }),
        }).then((response) => {
            const res = response?.data?.data.update;
            // console.log(res);
            // TODO: Add Snackbar
            if(res.success){
                // Snackbar

            }
            else {
                console.log("error",res)
            }
        });

        setUpdateRequired(false);
    }
    
    return (
    <>
        <Grid container spacing={1} alignItems="center">
            <Grid item xs={1} align="center" />
            <Grid item xs={10} align="center">
                {loading ? 
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}} align="center">
                        <CircularProgress />
                    </Box>
                :
                    data && data.length > 0 ?
                        <TableContainer style={{paddingBottom: "20px"}}>
                            <Table sx={{tableLayout: 'fixed', borderCollapse: 'separate', width: table.getTotalSize()}} >
                                <TableHead>
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map(header => {
                                            return (
                                                <TableCell key={header.id} colSpan={header.colSpan} sx={{width: header.getSize(), fontWeight: 'bold', padding: '10px 5px'}}>
                                                    {header.isPlaceholder ? null : (
                                                    <>
                                                        {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                        )}
                                                    </>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                        </TableRow>
                                    ))}
                                </TableHead>
                                <TableBody>
                                    {table.getRowModel().rows.map(row => {
                                        return (
                                            <TableRow key={row.id}>
                                                {row.getVisibleCells().map(cell => {
                                                    return (
                                                        <TableCell key={cell.id} sx={{padding: '0px', whiteSpace: 'pre'}}>
                                                        {
                                                            flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )
                                                        }
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    : <>
                        <p>No Regions Found</p>
                    </>
                }
            </Grid>     
            <Grid item xs={1} align="center" />
        </Grid>

        {/* Footer AppBar with Controls */}
        <Box sx={{ flexGrow: 1}}>
            <AppBar position="fixed" sx={{ top:'auto', bottom: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }}
            style={{height: '50px', backgroundColor: 'rgb(250,250,250)', boxShadow: 'rgb(0 0 0 / 10%) 0px 1px 1px -1px, rgb(0 0 0 / 10%) 0px 1px 1px 0px, rgb(0 0 0 / 10%) 0px 0 10px 2px'}}>
                <Toolbar style={{minHeight: '50px'}}>
                    <Box style={{margin: '0 auto'}}>
                       <Tooltip title="Save Changes">
                            <IconButton disabled={!updateRequired} onClick={handleSave}><SaveIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title="Create New Region">
                            <IconButton onClick={(e) => setCreateRegion(true)}><AddIcon /></IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>
        </Box>


        {/* Create Client Contact Dialog Box */}
        <Dialog open={createRegion} onClose={(e) => handleClose()} fullWidth={true} maxWidth={'sm'}>
            <DialogTitle sx={{margin: '0 auto'}}>Create New Region</DialogTitle>
            <DialogContent>
                <Grid container spacing={1} align="center">
                    <Grid item xs={12}>
                        <TextField sx={{width: '200px'}} label="Name" variant="standard" value={newRegion['name']} onChange={(e) => setNewRegion(prev => ({...prev, 'name':e.target.value}))}/>
                        <TextField sx={{width: '200px'}} label="Abbreviation" variant="standard" value={newRegion['shortName']} onChange={(e) => setNewRegion(prev => ({...prev, 'shortName':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField sx={{width: '400px'}} label="Email" variant="standard" value={newRegion['email']} onChange={(e) => setNewRegion(prev => ({...prev, 'email':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField sx={{width: '400px'}} rows={4} multiline label="Bill To Address" variant="standard" value={newRegion['billToAddress']} onChange={(e) => setNewRegion(prev => ({...prev, 'billToAddress':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <Button sx={{paddingTop: '25px'}} onClick={(e) => handleClose()}>Cancel</Button>
                        <Button sx={{paddingTop: '25px'}} onClick={(e) => handleCreate()}>Create</Button>
                    </Grid>
                </Grid>
            </DialogContent>
        </Dialog>

        {/* Delete Alert Dialog */}
        <Dialog open={openAlert} onClose={() => setOpenAlert(false)}>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogContent>
                <DialogContentText>{dialogMessage}</DialogContentText>
                <DialogActions>
                    <>
                        <Button onClick={(e) => {handleDelete(deleteRow)}}>Yes</Button>
                        <Button onClick={(e) => {setDeleteRow(''); setOpenAlert(false)}}>No</Button>
                    </>
                </DialogActions>
            </DialogContent>
        </Dialog>
    </> 
    )
}

export default Regions;