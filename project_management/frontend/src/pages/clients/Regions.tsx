import React, { useState, useEffect, useMemo,  }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Button, IconButton, Grid, 
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, } from '@mui/material';

import { RegionType, SnackType } from '../../types/types';
import { InputField, PaginatedTable } from '../../components/Components';

import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { ClientCreateDialogType } from './Client';

const Regions = ({regions, setRegions, client, updateRequired, setUpdateRequired, setSnack, createDialog, setCreateDialog }:{
        regions: RegionType[], 
        setRegions: React.Dispatch<React.SetStateAction<RegionType[]>>
        client: string | undefined, 
        updateRequired: boolean, 
        setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>
        setSnack: React.Dispatch<React.SetStateAction<SnackType>>
        createDialog: ClientCreateDialogType
        setCreateDialog: React.Dispatch<React.SetStateAction<any>>
    }) => {

    const axiosPrivate = useAxiosPrivate();
    const [newRegion, setNewRegion] = useState({
        'shortName': '',
        'name': '',
        'email': '',
        'billToAddress': ''
    });

    const [openAlert, setOpenAlert] = useState(false);
    const [deleteRow, setDeleteRow] = useState('');

    // Dialog Controls
    const openDialog = (row: any) => {
        setDeleteRow(row.row);
        setOpenAlert(true);
    }  

    const EditableCell = ({ getValue, row: { index }, column: { id }, table }: 
        { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)

        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            table.options.meta?.updateData(index, id, value)
        }

        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        return (
            <input className="dataTableInput" value={value as any} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
        )
    }

    const EditableMultilineCell = ({ getValue, row: { index }, column: { id }, table }: 
        { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)

        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            table.options.meta?.updateData(index, id, value)
        }

        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        return (
            <textarea className="dataTableInput" rows={4} value={value as any} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
        )
    }

    // Table Columns
    const columns = useMemo(() => [
        {
            accessorKey: 'shortName',
            header: () => 'Abbreviation',
            cell: EditableCell,
            size: 100,
        },
        {
            accessorKey: 'name',
            header: () => 'Name',
            cell: EditableCell,
            size: 250,
        },
        {
            accessorKey: 'email',
            header: () => 'Email',
            cell: EditableCell,
            size: 300,
        },
        {
            accessorKey: 'billToAddress',
            header: () => 'Bill To Address',
            cell: EditableMultilineCell,
            size: 500,
        },
        {
            id: 'controls',
            header: '',
            size: 40,
            cell: (row: any) => (
                <IconButton onClick={() => {openDialog(row)}} sx={{display: 'table', margin: '0 auto'}}>
                    <DeleteIcon />
                </IconButton>
            ),
        }
    ], []);

    const handleClose = (event?: any, reason?: string) => {
        if (reason !== 'backdropClick') {
            setCreateDialog((prev: any) => ({...prev, Regions: false}));
        }
    }

    const handleDelete = async (row: any) => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation deleteRegion($id: String!) { 
                    delete: deleteRegion(id:$id) {
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
                setRegions(old => {
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
                mutation createRegion($client: String!, $region: RegionInput!) { 
                    create_region: createRegion(client: $client, region:$region) {
                    success
                    region {
                        id
                        name
                        shortName
                        email
                        billToAddress
                    }
                }
            }`,
            variables: { 
                client: client,
                region: newRegion,
            }, 
        }),
        }).then((response) => {
            const res = response?.data?.data?.create_region;
            if(res.success){
                // Clear Dialog Content
                setNewRegion({'shortName': '', 'name': '', 'email': '', 'billToAddress': ''});
                setCreateDialog((prev: any) => ({...prev, Regions: false}));

                setRegions(oldArray => [...oldArray, res.region]);
                setSnack({active: true, variant: 'success', message: "Successfully Created Region"});
            }
            else {
                console.log("error",res);
                setSnack({active: true, variant: 'error', message: "Error Creating Location"});
            }
        }).catch((err) => {
            console.log("Error", err)
            setSnack({active: true, variant: 'error', message: "Error Creating Location"});
        });
    }

    return (
    <>
        <PaginatedTable columns={columns} data={regions} setData={setRegions} setUpdateRequired={setUpdateRequired}/>

        {/* Create Client Contact Dialog Box */}
        <Dialog open={createDialog['Regions']} onClose={handleClose} fullWidth={true} maxWidth={'sm'}>
            <DialogContent>
                <span className="dialogTitle">
                    <h1
                        style={{display: 'inline-block', position: 'relative', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                        Create new Region
                    </h1>
                    <IconButton onClick={() => handleClose()} style={{float: 'right', padding: '0px 0px 4px 0px'}}>
                        <CloseIcon />
                    </IconButton>
                </span>
                <Grid container spacing={1} direction={'column'} alignItems={"center"} justifyContent={"center"}>
                    <Grid item xs={12}>
                        <InputField type="text" width={200} label="Name" value={newRegion['name']} onChange={(e) => setNewRegion(prev => ({...prev, 'name':e.target.value}))}/>
                        <InputField type="text" width={200} label="Abbreviation" value={newRegion['shortName']} onChange={(e) => setNewRegion(prev => ({...prev, 'shortName':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="text" width={400} label="Email" value={newRegion['email']} onChange={(e) => setNewRegion(prev => ({...prev, 'email':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="text" multiline rows={4} width={400} label="Bill To Address" value={newRegion['billToAddress']} onChange={(e) => setNewRegion(prev => ({...prev, 'billToAddress':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <Button sx={{paddingTop: '25px'}} onClick={(e) => handleCreate()}>Create</Button>
                    </Grid>
                </Grid>
            </DialogContent>
        </Dialog>

        {/* Delete Alert Dialog */}
        <Dialog open={openAlert} onClose={() => setOpenAlert(false)}>
            <DialogTitle>Delete Region</DialogTitle>
            <DialogContent>
                <DialogContentText>Are you sure you want to delete this region? This action will be permanent.</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {handleDelete(deleteRow)}}>Yes</Button>
                <Button onClick={() => {setDeleteRow(''); setOpenAlert(false)}}>No</Button>
            </DialogActions>
        </Dialog>
    </> 
    )
}

export default Regions;