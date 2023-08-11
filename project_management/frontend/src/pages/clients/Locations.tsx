import React, { useState, useEffect, useMemo }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Button, IconButton, Dialog, DialogActions, DialogContent, 
    DialogContentText, DialogTitle, Grid } from '@mui/material';
import { AusStates, LocationType, RegionType, SnackType } from '../../types/types';

import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { InputField, Table, useSkipper } from '../../components/Components';
import { ClientCreateDialogType } from './Client';

const Locations = ({locations, setLocations, regions, client, setUpdateRequired, setSnack, createDialog, setCreateDialog }:{
    locations: LocationType[], 
    setLocations: React.Dispatch<React.SetStateAction<LocationType[]>>, 
    regions: RegionType[], 
    client: string | undefined,
    setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
    createDialog: ClientCreateDialogType
    setCreateDialog: React.Dispatch<React.SetStateAction<any>>
}) => {

    const axiosPrivate = useAxiosPrivate();
    const [newLocation, setNewLocation] = useState({'clientRef': '', 'name':'', 'region':'', 'address':'', 'locality':'', 'state': '', 'postcode':''});

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
            if(initialValue !== value) {
                setUpdateRequired(true);
                table.options.meta?.updateData(index, id, value)
            }
        }

        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        return (
            <input className="dataTableInput" value={value as any} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
        )
    }

    const RegionSelectionCell = ({ getValue, row: {index}, column: { id }, table }:
    { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)
        const [regions, setRegions] = useState<RegionType[]>([])
        
        // When the input is blurred, we'll call our table meta's updateData function
        const onSelection = (e: { target: { value: any; }; }) => {
            setValue(e.target.value)
            if(initialValue !== value) {
                setUpdateRequired(true);
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
            <select value={value} onChange={onSelection}
                style={{display:'block', margin:'0 auto', width: 'calc(100% - 3px)', padding: '5px', fontSize: '0.875rem'}}
            >
                <option key={'blank'} value=''>{''}</option>
                {regions?.map((region: any) => (
                    <option key={region.id} value={region.id}>{region.shortName}</option>
                ))}
            </select>
        )
    }

    const StateSelectionCell = ({ getValue, row: {index}, column: { id }, table }:
    { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
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
            <select value={value} onChange={e => setValue(e.target.value)} onBlur={onBlur} 
                style={{display:'block', margin:'0 auto', width: 'calc(100% - 3px)', padding: '5px', fontSize: '0.875rem'}}
            >
                <option key={'blank'} value=''>{''}</option>
                {AusStates?.map((state: any, i) => (
                    <option key={i} value={state}>{state}</option>
                ))}
            </select>
        )
    }

    // Table Columns
    const columns = useMemo(() => [
        {                
            accessorKey: 'clientRef',
            header: () => 'Reference',
            cell: EditableCell,
            size: 80,
        },
        {                
            accessorKey: 'name',
            header: () => 'Name',
            cell: EditableCell,
            size: 250,
        },
        {
            accessorKey: 'region',
            header: () => 'Region',
            cell: RegionSelectionCell,
            size: 100,
        },
        {
            accessorKey: 'address',
            header: () => 'Street',
            cell: EditableCell,
            size: 250,
        },
        {
            accessorKey: 'locality',
            header: () => 'Suburb',
            cell: EditableCell,
            size: 200,
        },
        {
            accessorKey: 'state',
            header: () => 'State',
            cell: StateSelectionCell,
            size: 100,
        },
        {
            accessorKey: 'postcode',
            header: () => 'Postcode',
            cell: EditableCell,
            size: 100,
        },
        {
            id: 'controls',
            header: '',
            size: 40,
            cell: (row: any) => (
                <IconButton onClick={() => {openDialog(row)}} sx={{display: 'table', margin: '0 auto', padding:'0px'}}>
                    <DeleteIcon />
                </IconButton>
            ),
        },
    ], []);

    const handleDelete = async (row: any) => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation deleteLocation($id: String!) { 
                    delete: deleteLocation(id:$id) {
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
                setLocations(old => {
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

    const handleClose = (event?: any, reason?: any) => {
        if (reason !== 'backdropClick') {
            setCreateDialog((prev: any) => ({...prev, Locations: false}));
        }
    }

    const handleCreate = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
            query: ` 
                mutation createLocation($client:String!, $newLocation:LocationInputType!) { 
                create_location: createLocation(client:$client, newLocation:$newLocation) {
                    success
                    message
                    location {
                        id
                        clientRef
                        name
                        address
                        locality
                        state
                        postcode
                        region {
                            id
                        }
                    }
                }
            }`,
            variables: { 
                client: client,
                newLocation: newLocation,
            },
        }),
        }).then((response) => {
            const res = response?.data?.data.create_location;
            if(res.success) {
                // Clear Dialog Content
                setNewLocation({'clientRef': '', 'name':'', 'region':'', 'address':'', 'locality':'', 'state': '', 'postcode':''})
                setCreateDialog((prev: any) => ({...prev, Locations: false}));

                // Add new row to table data
                const newLocation = res?.location?.map((obj: any) => ({...obj, region: obj?.region?.id}))
                setLocations(oldArray => [...oldArray, newLocation]);
                setSnack({active: true, variant: 'success', message: res.message});
            }
            else {
                setSnack({active: true, variant: 'error', message: res.message});
            }
        }).catch((err) => {
            console.log("Error", err)
            setSnack({active: true, variant: 'error', message: "Error Creating Location"});
        })
    }

    const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()
    const tableMeta = {
        updateData: (rowIndex: string, columnId: any, value: any) => {
            setUpdateRequired(true);
            skipAutoResetPageIndex()
            setLocations(old => old.map((row, index) => {
                if(index === parseInt(rowIndex)) {
                    return {
                        ...old[parseInt(rowIndex)],
                        [columnId]: value,
                    }
                }
                return row;
            }));
        },
        getRegions: () => {
            return regions;
        },
    }

    return (
    <>
        <Table columns={columns} data={locations} tableMeta={tableMeta} autoResetPageIndex={autoResetPageIndex} skipAutoResetPageIndex={skipAutoResetPageIndex} pagination={true}/>

        {/* Create Client Contact Dialog Box */}
        <Dialog open={createDialog['Locations']} onClose={handleClose} fullWidth={true} maxWidth={'md'}>
            <DialogContent sx={{paddingTop: '15px'}}>
                <span className="dialogTitle">
                        <h1
                            style={{display: 'inline-block', position: 'relative', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                            Create new Location
                        </h1>
                        <IconButton onClick={() => handleClose()} style={{float: 'right', padding: '0px 0px 4px 0px'}}>
                            <CloseIcon />
                        </IconButton>
                </span>
                <Grid container spacing={1} direction={'column'} alignItems={"center"} justifyContent={"center"}>
                    <Grid item xs={12}>
                        <InputField type="string" label="Client Ref" value={newLocation['clientRef']} onChange={(e) => setNewLocation(prev => ({...prev, 'clientRef':e.target.value}))}/>
                        <InputField type="select" label="Region" value={newLocation['region']} 
                            onChange={(e) => setNewLocation(prev => ({...prev, 'region':e.target.value}))}
                        >
                            <option key={"blank_newRegion"} value={""}></option>
                            {regions?.map((region) => (
                                <option key={region.id} value={region.id}>{region.shortName}</option>
                            ))} 
                        </InputField>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="string" label="Location Name" value={newLocation['name']} onChange={(e) => setNewLocation(prev => ({...prev, 'name':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="string" label="Street" value={newLocation['address']} onChange={(e) => setNewLocation(prev => ({...prev, 'address':e.target.value}))}/>
                        <InputField type="string" label="Suburb" value={newLocation['locality']} onChange={(e) => setNewLocation(prev => ({...prev, 'locality':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="select" label="State" value={newLocation['state']} onChange={(e) => setNewLocation(prev => ({...prev, 'state':e.target.value}))}>
                            <option key={"blank_state"} value={""}></option>
                            {AusStates?.map((state, i) => (
                                <option key={i+1} value={state}>{state}</option>
                            ))} 
                        </InputField>
                        <InputField type="string" label="Postcode" value={newLocation['postcode']} onChange={(e) => setNewLocation(prev => ({...prev, 'postcode':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <Button 
                            onClick={() => handleCreate()}
                            disabled={!Object.values(newLocation).every(x => x !== '')}
                        >
                            Create
                        </Button>
                    </Grid>
                </Grid>
            </DialogContent>
        </Dialog>

        
        {/* Delete Alert Dialog */}
        <Dialog open={openAlert} onClose={() => setOpenAlert(false)}>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogContent>
                <DialogContentText>Are you sure you want to delete this location? This action will be permanent.</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {handleDelete(deleteRow)}}>Yes</Button>
                <Button onClick={() => {setDeleteRow(''); setOpenAlert(false)}}>No</Button>
            </DialogActions>
        </Dialog>
    </> 
    )
}

export default Locations;