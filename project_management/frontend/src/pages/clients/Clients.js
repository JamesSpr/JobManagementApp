import React, { useEffect, useState, useMemo } from "react";
import {
    createTable,
    Column,
    ExpandedState,
    useReactTable,
    getCoreRowModel,
    getExpandedRowModel,
    getGroupedRowModel,
    ColumnDef,
    flexRender,
    isRowSelected,
} from '@tanstack/react-table'

import { 
    Table, 
    TableHead, 
    TableBody,
    TableFooter,
    TableCell,
    TableRow,
    TableContainer,
    Button,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    TextField,
    FormControl, 
    Box,
    AppBar, 
    Toolbar,
    CircularProgress
} from '@mui/material';
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const Clients = () => {

    const axiosPrivate = useAxiosPrivate();
    const location = useLocation();
    const navigate = useNavigate();

    const [createClient, setCreateClient] = useState(false);
    const [newClient, setNewClient] = useState('');
    const [data, setData] = useState([]);

    // Fetch Clients Data
    useEffect(() => {
        const cancelToken = axios.CancelToken.source();
        
        axiosPrivate({
            method: 'post',
            cancelToken: cancelToken.token,
            data: JSON.stringify({
                query: `{ 
                    clients {
                        id
                        name
                    }
                }`,
                variables: {}
            }),
        }).then((response) => {
            const res = response?.data?.data;
            // console.log("res", res);
            setData(res?.clients);
        }).catch((err) => {
            if (axios.isCancel(err)) {
                // API Request has been cancelled
                // console.log("Client API Request Cancelled!");
            } else {
                // todo:handle error
                console.log("Please Contact Admin:", err)
            }
        });

        return () => {
            cancelToken.cancel();
        }

    }, [])


    // Table Columns
    const columns = useMemo(() => [
        {                
            accessorKey: 'name',
            header: () => 'Client List'
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
            setCreateClient(false);
        }
    }

    const handleCreate = async () => {
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `
                    mutation createClient($name: String!) { 
                        create_client: createClient(name: $name) {
                        client {
                            name
                        }
                    }
                }`,
                variables: { 
                    name: newClient,
                },
                }),
            }).then((response) => {
                const res = response?.data?.data;
                if(res.errors){
                    console.log("error",res)
                    // setCreationError(res.errors[0].message);
                }
                else {
                    setCreateClient(false);
                    setData(oldArray => [...oldArray, res.create_client.client]);
                }
            });
        } catch (err) {
            console.log(err);
        }
    }

    return ( 
    <>
        <Grid container spacing={1} alignItems="center">
            <Grid item xs={1} align="center" />
            <Grid item xs={10} align="center">
            {data.length > 0 ? 
                <TableContainer style={{paddingBottom: "20px"}}>
                    <Table sx={{tableLayout: 'fixed', maxWidth: '800px', borderCollapse: 'separate'}}>
                        <TableHead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => {
                                    return (
                                        <TableCell key={header.id} colSpan={header.colSpan} sx={{fontWeight: 'bold', padding: '10px 5px 10px 5px'}} style={{ width: header.getSize()}}>
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
                                    <TableRow hover={location.pathname !== "/clients"} key={row.id} 
                                    onDoubleClick={(e) => {location.pathname !== "/clients" ? navigate(`${location.pathname}/${row.original.name}`) : null}}>
                                        {row.getVisibleCells().map(cell => {
                                            return (
                                                <TableCell key={cell.id} sx={{padding: '10px 5px 10px 10px'}}>
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
            : 
                <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}} align="center">
                    <CircularProgress />
                </Box>
            }
            </Grid>     
            <Grid item xs={1} align="center" />
        </Grid>     

        {/* Footer AppBar with Controls */}
        { location.pathname === "/clients" ? 
            <Box sx={{ flexGrow: 1}}>
                <AppBar position="fixed" sx={{ top:'auto', bottom: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }}
                style={{height: '50px', backgroundColor: 'rgb(250,250,250)', boxShadow: 'rgb(0 0 0 / 10%) 0px 1px 1px -1px, rgb(0 0 0 / 10%) 0px 1px 1px 0px, rgb(0 0 0 / 10%) 0px 0 10px 2px'}}>
                    <Toolbar style={{minHeight: '50px'}}>
                        <Box style={{margin: '0 auto'}}>

                            <Button variant="outlined" 
                                style={{margin: '0px 5px 0px 5px'}}
                                onClick={(e) => setCreateClient(true)}
                            >
                                Create New Client
                            </Button>
                        </Box>
                    </Toolbar>
                </AppBar>
            </Box>
            : <></>
        }

         {/* Create Client Contact Dialog Box */}
         <Dialog open={createClient} onClose={(e) => handleClose()}>
            <DialogTitle sx={{margin: '0 auto'}}>Create New Contact</DialogTitle>
            <DialogContent>
                <Grid container spacing={1} align="center">
                    {/* <Box component="form" sx={{margin: '0 auto', display: 'flex', flexWrap:'wrap'}}> */}
                    <Grid item xs={12}>
                        <FormControl style={{ width: 184 }}>
                            <TextField id="standard-basic" label="Client Name" variant="standard" value={newClient} onChange={(e) => setNewClient(e.target.value)}/>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <Button sx={{paddingTop: '25px'}} onClick={(e) => handleClose()}>Cancel</Button>
                        <Button sx={{paddingTop: '25px'}} onClick={(e) => handleCreate()}>Create</Button>
                    </Grid>
                </Grid>
            </DialogContent>
        </Dialog>
    </>
    )
}

export default Clients;