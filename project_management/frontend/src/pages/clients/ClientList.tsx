import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../auth/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { BasicDialog, Footer, InputField, ProgressButton, ProgressIconButton, SnackBar, Table } from "../../components/Components";
import { useReactTable, getCoreRowModel, flexRender, SortingState, getSortedRowModel, VisibilityState, } from '@tanstack/react-table'
import { SnackType } from "../../types/types";
import { Box, CircularProgress, Grid, Typography, Button, Dialog, DialogContent, IconButton } from "@mui/material";

import AddIcon from '@mui/icons-material/Add';

interface ClientType {
    id: '', 
    name:''
}

const ClientList = () => {

    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();
    const navigate = useNavigate();

    const [createClient, setCreateClient] = useState(false);
    const [newClient, setNewClient] = useState({name: '', abn: ''});
    const [data, setData] = useState<ClientType[]>([]);
    const [createWait, setCreateWait] = useState(false);

    const [snack, setSnack] = useState<SnackType>({active: false, variant: 'info', message: ''})

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
        accessorKey: 'id',
        header: () => 'ID',
        size: 0,
    },
    {                
        accessorKey: 'name',
        header: () => 'Client List',
        size: 350,
        enableSorting: false
    },
    ], []);

    const [sorting, setSorting] = useState<SortingState>([{id: 'id', desc: false}])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({id: false})

    const handleCreate = async () => {
        setCreateWait(true);

        for(let field in newClient) {
            if(field == "") {
                setSnack({active:false, variant:"error", message: "Please ensure all fields are filled."})
                return
            }
        }

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation createClient($details: ClientInputType!) { 
                    create: createClient(details: $details) {
                        success
                        message
                        client {
                            id
                            myobUid
                            name
                            abn
                        }
                    }
                }`,
                variables: {
                    details: newClient,
                },
            }),
        }).then((response) => {
            const res = response?.data?.data?.create;

            if(res.success){
                setCreateClient(false);
                setData(oldArray => [...oldArray, res.client]);
                setSnack({active:true, variant: "success", message: res.message})
            }
            else {
                console.log("error", res)
                setSnack({active:true, variant: "error", message: res.message})
            }

        }).catch((err) =>  {
            console.log(err);
            setSnack({active:true, variant: "error", message: "Server Error when Creating new Client"})
        }).finally(() => {
            setCreateWait(false);
        });
    }

    const handleInput =  (e: { target: { value: string, name: string }; }) => {
        setNewClient(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    return ( 
        <>
            <Grid container spacing={1} direction={'column'} alignItems={"center"} justifyContent={"center"}>
                <Grid item xs={12}>
                    <Typography variant='h6' style={{textAlign: "center", fontWeight: 'bold'}}>Clients</Typography>
                    <p>Select a client for details, or add a new client below</p>
                </Grid>
                <Grid item xs={1}/>
                <Grid item xs={10}>
                {data.length > 0 ? 
                    <Table data={data} columns={columns}
                        rowOnDoubleClick={row => {navigate(`/client/${row.original.id}`)}}
                        sorting={sorting}
                        columnVisibility={columnVisibility}
                    />
                : 
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}}>
                        <CircularProgress />
                    </Box>
                }
                </Grid>     
                <Grid item xs={1}/>
            </Grid>     

            {/* Footer AppBar with Controls */}
            <Footer>
                <ProgressIconButton onClick={() => setCreateClient(true)} waiting={createWait}>
                    <AddIcon />
                </ProgressIconButton>
            </Footer>
    
             {/* Create Client Contact Dialog Box */}
             <BasicDialog open={createClient} close={() => setCreateClient(false)}
                title="Create New Contact" 
                action={handleCreate}
                waiting={createWait}
                center fullWidth maxWidth="sm"
            >
                <Grid container spacing={1} direction={'column'} alignItems={"center"} justifyContent={"center"}>
                    <Grid item xs={12}>
                        <InputField type="text" name="name" label="Client Name" value={newClient.name} onChange={handleInput}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="text" name="abn" label="Client ABN" value={newClient.abn} onChange={handleInput}/>
                    </Grid>
                </Grid>
            </BasicDialog>
    
            <SnackBar snack={snack} setSnack={setSnack} />
        </>
    )
}


export default ClientList;