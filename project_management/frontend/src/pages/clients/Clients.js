import React, { useEffect, useState, useMemo } from "react";
import { useReactTable, getCoreRowModel, flexRender, } from '@tanstack/react-table'
import { Table, TableHead, TableBody, TableCell, TableRow, TableContainer, Button, Dialog, DialogContent, DialogTitle, Grid, TextField, FormControl,  Box, AppBar,  Toolbar, CircularProgress } from '@mui/material';
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { SnackBar } from "../../components/Components";
import useAuth from "../auth/useAuth";

const Clients = () => {

    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [createClient, setCreateClient] = useState(false);
    const [newClient, setNewClient] = useState('');
    const [data, setData] = useState([]);

    const [snack, setSnack] = useState({'active': false, 'message': '', 'variant': ''})

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
    });    

    const handleClose = (event, reason) => {
        if (reason !== 'backdropClick') {
            setCreateClient(false);
        }
    }

    const handleCreate = async () => {
        let successfulMYOBAddition = false
        let myobUID = ''

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation myobCreateClient($uid:String!, $client: String!) { 
                    create_client: myobCreateClient(uid: $uid, client: $client) {
                        success
                        message
                        uid
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    client: newClient,
                },
            }),
        }).then((response) => {
            const res = response?.data?.data?.create_client;
            if(!res.success){
                setSnack({active:true, message: res.message, variant: "error"})
                return
            }

            // console.log(res)
            myobUID = res.uid
            successfulMYOBAddition = true

        }).catch((err) =>  {
            console.log(err);
        });

        if(successfulMYOBAddition) {
            // console.log(myobUID)
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `
                    mutation createClient($name: String!, $myobUid: String!) { 
                        create_client: createClient(name: $name, myobUid: $myobUid) {
                            client {
                                name
                            }
                        }
                    }`,
                    variables: { 
                        name: newClient,
                        myobUid: myobUID
                    },
                }),
            }).then((response) => {
                const res = response?.data?.data?.create_client;

                if(!res.success){
                    console.log("error", res)
                    setSnack({active:true, message: res.message, variant: "error"})
                    return
                }

                setCreateClient(false);
                setData(oldArray => [...oldArray, res.client]);

            }).catch((err) => {
                console.log(err);
            });
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

        <SnackBar {...{snack, setSnack}} />
    </>
    )
}

export default Clients;