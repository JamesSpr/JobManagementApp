import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../auth/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { Footer, InputField, ProgressButton, SnackBar } from "../../components/Components";
import { useReactTable, getCoreRowModel, flexRender, } from '@tanstack/react-table'
import { SnackType } from "../../types/types";
import { Box, CircularProgress, Grid, Typography, Button, Dialog, DialogContent, IconButton } from "@mui/material";

import CloseIcon from '@mui/icons-material/Close';

interface ClientType {
    id: '', 
    name:''
}

const ClientList = () => {

    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();
    const navigate = useNavigate();

    const [createClient, setCreateClient] = useState(false);
    const [newClient, setNewClient] = useState('');
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
            accessorKey: 'name',
            header: () => 'Client List',
            size: 500,
        },
    ], []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });   
    
    const handleCreate = async () => {
        setCreateWait(true);

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation myobCreateClient($uid:String!, $name: String!) { 
                    create_client: myobCreateClient(uid: $uid, name: $name) {
                        success
                        message
                        client {
                            id
                            name
                            myobUid
                        }
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    name: newClient,
                },
            }),
        }).then((response) => {
            const res = response?.data?.data?.create_client;

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
            setSnack({active:true, variant: "error", message: "Error Creating new Client"})
        }).finally(() => {
            setCreateWait(false);
        });
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
                        <table style={{tableLayout: 'fixed', maxWidth: '800px', borderCollapse: 'separate'}}>
                            <thead>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        return (
                                            <th key={header.id} colSpan={header.colSpan} style={{fontWeight: 'bold', padding: '10px 5px 10px 5px',  width: header.getSize()}} >
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
                                        <tr key={row.id} 
                                            onDoubleClick={(e) => {navigate(`/client/${row.original.name}`)}}
                                        >
                                            {row.getVisibleCells().map(cell => {
                                                return (
                                                    <td key={cell.id} style={{padding: '10px 5px 10px 10px'}}>
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
                <ProgressButton name="Create New Client" waiting={createWait} />
            </Footer>
    
             {/* Create Client Contact Dialog Box */}
             <Dialog open={createClient} onClose={() => setCreateClient(false)} fullWidth={true} maxWidth={'sm'}>
                <DialogContent>
                    <Grid container spacing={1} direction={'column'} alignItems={"center"} justifyContent={"center"}>
                        <span className="dialogTitle">
                            <h1
                                style={{display: 'inline-block', position: 'relative', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                                Create new Contact
                            </h1>
                            <IconButton onClick={() => setCreateClient(false)} style={{float: 'right', padding: '0px 0px 4px 0px'}}>
                                <CloseIcon />
                            </IconButton>
                        </span>
                        <Grid item xs={12}>
                            <InputField type="text" label="Client Name" value={newClient} onChange={(e) => setNewClient(e.target.value)}/>
                        </Grid>
                        <Grid item xs={12}>
                            <Button sx={{paddingTop: '25px'}} onClick={handleCreate}>Create</Button>
                        </Grid>
                    </Grid>
                </DialogContent>
            </Dialog>
    
            <SnackBar {...{snack, setSnack}} />
        </>
    )

}


export default ClientList;