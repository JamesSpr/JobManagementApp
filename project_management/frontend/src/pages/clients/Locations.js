import React, { useState, useEffect, useMemo }  from 'react';
import { useParams } from 'react-router-dom';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { createTable, Column,  useReactTable, getCoreRowModel, getGroupedRowModel, ColumnDef, flexRender, isRowSelected } from '@tanstack/react-table'
import { Table, TableHead, TableBody, TableFooter, TableCell, TableRow, TableContainer, 
    InputLabel, NativeSelect, Button, IconButton, Dialog, DialogActions, DialogContent, 
    DialogContentText, DialogTitle, Grid, TextField, FormControl, Box, AppBar, Toolbar, CircularProgress, MenuItem } from '@mui/material';

const Locations = () => {

    const axiosPrivate = useAxiosPrivate();
    const [data, setData] = useState([]);
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [waiting, setWaiting] = useState({'create':false})
    const [createLocation, setCreateLocation] = useState(false);
    const [newLocation, setNewLocation] = useState({'clientRef': '', 'name':'', 'region':'', 'street':'', 'suburb':'', 'state': '', 'postcode':''});

    const { client } = useParams();
    if(client) {
        useEffect(() => {
            // Get Data
            axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `query locations($client: String!){ 
                        locations (client: $client){
                            id
                            clientRef
                            name
                            address
                            locality
                            state
                            postcode
                            region {
                                shortName
                                name
                                email
                            }
                        }
                        clientRegions(client: $client) {
                            id
                            shortName
                            name
                        }
                    }`,
                    variables: {
                        client: client
                    }
                }),
            }).then((response) => {
                const res = response?.data?.data;
                setData(res?.locations);
                setRegions(res?.clientRegions);
                setLoading(false);
            });
        }, []);
    } else {
        client === "" ? navigate('/clients') : navigate('/missing', { replace: true, state: {missing: "client"} })
    }    

    // Table Columns
    const columns = useMemo(() => [
        {
            id: 'details',
            header: () => 'Details',
            columns: [
                {                
                    accessorKey: 'clientRef',
                    header: () => 'Client Reference',
                },
                {                
                    accessorKey: 'name',
                    header: () => 'Name',
                },
                {
                    id: 'region',
                    accessorFn: row => `${row.region.shortName}`,
                    header: () => 'Region',
                },
            ]
        },
        {
            id: 'address',
            header: () => 'Address',
            columns: [
                {
                    accessorKey: 'address',
                    header: () => 'Street',
                },
                {
                    accessorKey: 'locality',
                    header: () => 'Suburb',
                },
                {
                    accessorKey: 'state',
                    header: () => 'State',
                },
                {
                    accessorKey: 'postcode',
                    header: () => 'Postcode',
                },
            ]
        },
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
            setCreateLocation(false);
        }
    }

    const handleCreate = async () => {
        setWaiting(prev => ({...prev, 'create': true}))

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
            query: ` 
                mutation createLocation($client:String!, $clientRef:String!, $name:String!, $address:String!, $locality:String!, $state:String!, $postcode:String!, $region:String!) { 
                create_location: createLocation(client:$client, clientRef:$clientRef, name:$name, address:$address, locality:$locality, state:$state, postcode:$postcode, region:$region) {
                    success
                    location {
                        clientRef
                        name
                        region {
                            shortName
                        }
                        address
                        locality
                        state
                        postcode
                    }
                }
            }`,
            variables: { 
                client: client,
                clientRef: newLocation['clientRef'],
                name: newLocation['name'],
                address: newLocation['street'],
                locality: newLocation['suburb'],
                state: newLocation['state'],
                postcode: newLocation['postcode'],
                region: newLocation['region'],
            },
        }),
        }).then((response) => {
            const res = response?.data?.data;
            setWaiting(prev => ({...prev, 'create': false}))
            if(!res.create_location){
                console.log("error",res)
            }
            else {
                // Clear Dialog Content
                setNewLocation({'clientRef': '', 'name':'', 'region':'', 'street':'', 'suburb':'', 'state': '', 'postcode':''})
                setCreateLocation(false);

                // Add new row to table data
                setData(oldArray => [...oldArray, res.create_location.location]);
            }
        });
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
                            <Table sx={{tableLayout: 'fixed', borderCollapse: 'separate'}}>
                                <TableHead>
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map(header => {
                                            return (
                                                <TableCell key={header.id} colSpan={header.colSpan} sx={{fontWeight: 'bold', padding: '10px, 5px'}}>
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
                                                        <TableCell key={cell.id} sx={{padding: '10px, 5px'}}>
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
                        <p>No Contacts Found</p>
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

                        <Button variant="outlined" 
                            style={{margin: '0px 5px 0px 5px'}}
                            onClick={(e) => setCreateLocation(true)}
                        >
                            Create New Location
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>
        </Box>

        {/* Create Client Contact Dialog Box */}
        <Dialog open={createLocation} onClose={(e) => handleClose()} fullWidth={true} maxWidth={'md'}>
            <DialogTitle sx={{margin: '0 auto'}}>Create New Location</DialogTitle>
            <DialogContent sx={{paddingTop: '15px'}}>
                <Grid container spacing={1} align="center">
                    <Grid item xs={12}>
                        <TextField label="Client Reference" variant="standard" value={newLocation['clientRef']} onChange={(e) => setNewLocation(prev => ({...prev, 'clientRef':e.target.value}))}/>
                        <TextField label="Location Name" variant="standard" value={newLocation['name']} onChange={(e) => setNewLocation(prev => ({...prev, 'name':e.target.value}))}/>
                        <TextField select
                            fullWidth={true}
                            sx={{maxWidth: '195px'}}
                            variant="standard"
                            value={newLocation['region']}
                            SelectProps={{
                                native: true
                            }}
                            label="Region"
                            onChange={(e) => setNewLocation(prev => ({...prev, 'region':e.target.value}))} 
                            key="newRegion-select"
                        >
                            <option key={"blank_newRegion"} value={""}></option>
                            {regions?.map((region) => (
                                <option key={region.id} value={region.id}>{region.shortName}</option>
                            ))} 
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Street" variant="standard" value={newLocation['street']} onChange={(e) => setNewLocation(prev => ({...prev, 'street':e.target.value}))}/>
                        <TextField label="Suburb" variant="standard" value={newLocation['subrub']} onChange={(e) => setNewLocation(prev => ({...prev, 'suburb':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="State" variant="standard" value={newLocation['state']} onChange={(e) => setNewLocation(prev => ({...prev, 'state':e.target.value}))}/>
                        <TextField label="Postcode" variant="standard" value={newLocation['postcode']} onChange={(e) => setNewLocation(prev => ({...prev, 'postcode':e.target.value}))}/>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{margin: '0 auto'}}>
                <Button onClick={(e) => handleClose()}>Cancel</Button>
                    <Box sx={{position: 'relative', display: 'inline-block'}}>
                        <Button 
                            onClick={(e) => handleCreate()}
                            disabled={!Object.values(newLocation).every(x => x !== '')}
                        >
                            Create
                        </Button>
                        {waiting.create && (
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
            </DialogActions>
        </Dialog>
    </> 
    )
}

export default Locations;