import React, { useState, useEffect, useMemo, useCallback }  from 'react';
import { useParams } from 'react-router-dom';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { Button, IconButton, Dialog, DialogActions, DialogContent, DialogContentText,
        DialogTitle, Grid, Box, AppBar, Toolbar, CircularProgress, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { usePrompt } from '../../hooks/promptBlocker';
import AddIcon from '@mui/icons-material/Add';
import { InputField } from '../../components/Components';

const Contacts = () => {

    const axiosPrivate = useAxiosPrivate();
    
    const [regions, setRegions] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updateRequired, setUpdateRequired] = useState(false);
    const [createContact, setCreateContact] = useState(false);
    const [openAlert, setOpenAlert] = useState(false);
    const [deleteRow, setDeleteRow] = useState('');
    const [newContact, setNewContact] = useState({
        'client': '',
        'firstName':'',
        'lastName':'',
        'position':'',
        'phone': '',
        'email':'',
        'region': '',
    })

    const { client } = useParams();
    if(!client){
        client === "" ? navigate('/clients') : navigate('/missing', { replace: true, state: {missing: "client"} })
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

    // Dialog Controls
    const openDialog = (row) => {
        setDeleteRow(row);
        setOpenAlert(true);
    }    

    const handleClose = (event, reason) => {
        if (reason !== 'backdropClick') {
            setCreateContact(false);
        }
    }

    // Fetch Clients Data
    useEffect(() => {
        const controller = new AbortController();
        setNewContact(prev => ({...prev, 'client': client}));
        
        const fetchData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `query clientContacts($client: String!) {
                        clientContacts(client: $client) {
                            id
                            firstName
                            lastName
                            position
                            phone
                            email
                            region {
                                id
                            }
                        }
                        clientRegions(client: $client) {
                            id
                            shortName
                        }
                    }`,
                    variables: {
                        client: client
                    }
                }),
            }).then((response) => {
                const res = response?.data?.data;
                //Flatten clientContacts region oject
                const contacts = res?.clientContacts.map(obj => ({...obj, region: obj?.region?.id}))
                setData(contacts);
                setRegions(res?.clientRegions);
                setLoading(false);
            });
        }
        fetchData();

        return () => {
            controller.abort();
        }
        
    }, [])
    
    const editableCell = ({ getValue, row: { index }, column: { id }, table }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)

        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            if(initialValue !== value) {
                table.options.meta?.updateData(index, id, value);
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])
        
        return (
            <input
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={onBlur}
                style={{display:'block', margin:'0 auto', width: 'calc(100% - 12px)', border: '1px solid', padding: '5px', fontSize: '0.875rem'}}
            />
        )
    }
    
    const selectionCell = ({ getValue, row: {index}, column: { id }, table }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)
        const [regions, setRegions] = useState()
        
        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            if(initialValue !== value) {
                table.options.meta?.updateData(index, id, value);
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        useEffect(() => {
            setRegions(table.options.meta?.getRegions())
        }, [])

        return (
            <select value={value} onChange={e => setValue(e.target.value)} onBlur={onBlur} 
                style={{display:'block', margin:'0 auto', width: 'calc(100% - 3px)', padding: '5px', fontSize: '0.875rem'}}
            >
                <option key={'blank'} value=''>{''}</option>
                {regions?.map((region) => (
                    <option key={region.id} value={region.id}>{region.shortName}</option>
                ))}
            </select>
        )
    }

    // Table Columns
    const columns = useMemo(() => [
        {                
            accessorKey: 'firstName',
            header: () => 'First Name',
            cell: editableCell,
            minSize: 150,
            size: 150,
            maxSize: 200,
        },
        {                
            accessorKey: 'lastName',
            header: () => 'Last Name',
            cell: editableCell,
            minSize: 150,
            size: 150,
            maxSize: 200,
        },
        {
            accessorKey: 'position',
            header: () => 'Position',
            cell: editableCell,
            minSize: 200,
            size: 250,
            maxSize: 250,
        },
        {
            accessorKey: 'email',
            header: () => 'Email',
            cell: editableCell,
            minSize: 300,
            size: 350,
            maxSize: 350,
        },
        {
            accessorKey: 'phone',
            header: () => 'Phone Number',
            cell: editableCell,
            minSize: 150,
            size: 150,
            maxSize: 150,
        },
        {
            // id: 'region',
            // accessorFn: row => row.region?.id,
            accessorKey: 'region',
            header: () => 'Region',
            cell: selectionCell,
            minSize: 150,
            size: 150,
            maxSize: 150,
        },
        {
            id: 'controls',
            header: '',
            minSize: 40,
            size: 40,
            maxSize: 40,
            header: () => '',
            cell: ({row}) => (
                <IconButton onClick={() => {openDialog(row)}} sx={{display: 'table', margin: '0 auto', padding:'0px'}}>
                    <DeleteIcon />
                </IconButton>
            ),
        }
    ], []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        meta: {
            updateData: (rowIndex, columnId, value) => {
                setUpdateRequired(true);
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
            getRegions: () => {
                return regions;
            },
        },
    });  

    const handleDelete = async (row) => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation deleteClientContact($id: String!) { 
                    delete: deleteClientContact(id:$id) {
                    success
                }
            }`,
            variables: { 
                id: row.original.id,
            }, 
        }),
        }).then((response) => {
            // console.log(response)
            const res = response?.data?.data?.delete;
            if(res.success){
                // Clear Dialog Content
                setData(old => {
                    let newData = [];
                    for(let i = 0; i < old.length; i++) {
                        if(i !== parseInt(row.id)) {
                            newData.push(old[i]);
                        }
                    }
                    return newData;
                })
            }
            else {
                console.log("error", res)
            }
        });

        setDeleteRow('');
        setOpenAlert(false);
    }

    const handleCreate = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation createClientContact($contact: ClientContactInput!) { 
                    create: createClientContact(contact: $contact) {
                    success
                    clientContact {
                        id
                        firstName
                        lastName
                        position
                        phone
                        email
                        region {
                            id
                        }
                    }
                }
            }`,
            variables: { 
                contact: newContact,
            },
        }),
        }).then((response) => {
            const res = response?.data?.data?.create;
            // TODO: Add Snackbar
            if(res.success){
                // Clear Dialog Content
                setNewContact({
                    'client': client,
                    'firstName':'',
                    'lastName':'',
                    'position':'',
                    'phone': '',
                    'email':'',
                    'region': ''
                });
                setCreateContact(false);
                // console.log(res);
                let contact = res?.clientContact;
                contact['region'] = contact.region.id;
                setData(oldArray => [...oldArray, contact]);
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
            mutation updateClientContact($contacts: [ClientContactInput]!, $client: String!) { 
                update: updateClientContact(contacts: $contacts, client: $client) {
                    success
                }
            }`,
            variables: { 
                contacts: data,
                client: client
            }, 
        }),
        }).then((response) => {
            // console.log(response);
            const res = response?.data?.data.update;
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

    return (<>
        <Grid container spacing={1} alignItems="center">
            <Grid item xs={1} align="center" />
            <Grid item xs={10} align="center">
                {loading ? 
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}} align="center">
                        <CircularProgress />
                    </Box>
                    :
                    data && data.length > 0 ?
                        <table style={{tableLayout: 'fixed', borderCollapse: 'separate', width: table.getTotalSize()}}>
                            <thead>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        return (
                                            <th key={header.id} colSpan={header.colSpan} style={{width: header.getSize(), fontWeight: 'bold', padding: '10px 5px'}}>
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
                                                    <td key={cell.id} style={{padding: '0px'}}>
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
                    : <>
                        <p>No Contacts Found. Add new contacts with the + below.</p>
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
                            <span>
                                <IconButton disabled={!updateRequired} onClick={handleSave}><SaveIcon /></IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Create New Contact">
                            <IconButton onClick={(e) => setCreateContact(true)}><AddIcon /></IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>
        </Box>


        {/* Create Client Contact Dialog Box */}
        <Dialog open={createContact} onClose={(e) => handleClose()}>
            <DialogTitle sx={{margin: '0 auto'}}>Create New Contact</DialogTitle>
            <DialogContent>
                <Grid container spacing={1} align="center">
                    <Grid item xs={12}>
                        <InputField label="First Name" value={newContact['firstName']} onChange={(e) => setNewContact(prev => ({...prev, 'firstName':e.target.value}))}/>
                        <InputField label="Last Name" value={newContact['lastName']} onChange={(e) => setNewContact(prev => ({...prev, 'lastName':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField label="Position" value={newContact['position']} onChange={(e) => setNewContact(prev => ({...prev, 'position':e.target.value}))}/>
                        <InputField label="Phone" value={newContact['phone']} onChange={(e) => setNewContact(prev => ({...prev, 'phone':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField label="Email" value={newContact['email']} onChange={(e) => setNewContact(prev => ({...prev, 'email':e.target.value}))}/>
                        <InputField type="select" label="Region" value={newContact['region']} onChange={(e) => setNewContact(prev => ({...prev, 'region':e.target.value}))}
                        >
                            <option key={"blank_newRegion"} value={''}></option>
                            {regions?.map((region) => (
                            <option key={region.id} value={region.id}>{region.shortName}</option>
                            ))}
                        </InputField>
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
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogContent>
                <DialogContentText>Are you sure you want to delete this contact? This action will be permanent.</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={(e) => {handleDelete(deleteRow)}}>Yes</Button>
                <Button onClick={(e) => {setDeleteRow(''); setOpenAlert(false)}}>No</Button>
            </DialogActions>
        </Dialog>
    </>);
}

export default Contacts;