import React, { useState, useEffect, useMemo } from "react";
import { Grid, Button, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, } from '@mui/material';
import { BasicDialog, InputField, Table, useSkipper } from "../../components/Components";
import { ContactType, RegionType, SnackType } from "../../types/types";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { ClientCreateDialogType } from "./Client";
import { SortingState } from "@tanstack/react-table";

const Contacts = ({contacts, setContacts, regions, client, setUpdateRequired, setSnack, createDialog, setCreateDialog }:{
    contacts: ContactType[], 
    setContacts: React.Dispatch<React.SetStateAction<ContactType[]>>, 
    regions: RegionType[], 
    client: string | undefined,
    setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>,
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
    createDialog: ClientCreateDialogType
    setCreateDialog: React.Dispatch<React.SetStateAction<any>>
}) => {

    const axiosPrivate = useAxiosPrivate();
    const [newContact, setNewContact] = useState({
        firstName:'',
        lastName:'',
        position:'',
        phone: '',
        email:'',
        region: '',
    })
    // const [openAlert, setOpenAlert] = useState(false);
    // const [deleteRow, setDeleteRow] = useState('');

    // // Dialog Controls
    // const openDialog = (row: any) => {
    //     console.log(row.row)
    //     setDeleteRow(row.row);
    //     setOpenAlert(true);
    // }    

    const handleClose = (event?: any, reason?: any) => {
        if (reason !== 'backdropClick') {
            setCreateDialog((prev: any) => ({...prev, Contacts: false}));
        }
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
            const onBlur = () => {
                if(initialValue !== value) {
                    table.options.meta?.updateData(index, id, value);
                    setUpdateRequired(true);
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
                    {regions?.map((region: any) => (
                        <option key={region.id} value={region.id}>{region.shortName}</option>
                    ))}
                </select>
            )
        }

    const CheckboxCell = ({ getValue, row: {index}, column: { id }, table }:
    { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState<boolean>(initialValue)

        // When the input is blurred, we'll call our table meta's updateData function
        const checkHandler = () => {
            setValue(!value)
            table.options.meta?.updateData(index, id, !value);
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        return (
            <input type="checkbox" id={index} checked={value} onChange={checkHandler}/>
        )
    }
    
    // Table Columns
    const columns = useMemo(() => [
        {                
            accessorKey: 'firstName',
            header: () => 'First Name',
            cell: EditableCell,
            size: 150,
            enableSorting: false,
        },
        {                
            accessorKey: 'lastName',
            header: () => 'Last Name',
            cell: EditableCell,
            size: 150,
            enableSorting: false,
        },
        {
            accessorKey: 'position',
            header: () => 'Position',
            cell: EditableCell,
            size: 250,
            enableSorting: false,
        },
        {
            accessorKey: 'email',
            header: () => 'Email',
            cell: EditableCell,
            size: 350,
            enableSorting: false,
        },
        {
            accessorKey: 'phone',
            header: () => 'Phone Number',
            cell: EditableCell,
            size: 150,
            enableSorting: false,
        },
        {
            accessorKey: 'region',
            header: () => 'Region',
            cell: RegionSelectionCell,
            size: 80,
            enableMultiSort: true,
        },
        {
            accessorKey: 'active',
            header: () => 'Active',
            cell: CheckboxCell,
            size: 80,
            enableMultiSort: true,
        }
        // {
        //     id: 'controls',
        //     header: '',
        //     size: 40,
        //     cell: (row: any) => (
        //         <IconButton onClick={() => {openDialog(row)}} sx={{display: 'table', margin: '0 auto', padding:'0px'}}>
        //             <DeleteIcon />
        //         </IconButton>
        //     ),
        // }
    ], []);

    // const handleDelete = async (row: any) => {
    //     await axiosPrivate({
    //         method: 'post',
    //         data: JSON.stringify({
    //             query: `
    //             mutation deleteContact($id: String!) { 
    //                 delete: deleteContact(id:$id) {
    //                 success
    //             }
    //         }`,
    //         variables: { 
    //             id: row.original.id,
    //         }, 
    //     }),
    //     }).then((response) => {
    //         // console.log(response)
    //         const res = response?.data?.data?.delete;
    //         if(res.success){
    //             // Clear Dialog Content
    //             setContacts(old => {
    //                 let newData = [];
    //                 for(let i = 0; i < old.length; i++) {
    //                     if(i !== parseInt(row.id)) {
    //                         newData.push(old[i]);
    //                     }
    //                 }
    //                 return newData;
    //             })
    //         }
    //         else {
    //             console.log("error", res)
    //         }
    //     });

    //     setDeleteRow('');
    //     setOpenAlert(false);
    // }

    const handleCreate = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation createContact($client: String!, $contact: ClientContactInput!) { 
                    create: createContact(client: $client, contact: $contact) {
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
                client: client,
            },
        }),
        }).then((response) => {
            const res = response?.data?.data?.create;
            if(res.success){
                // Clear Dialog Content
                setNewContact({
                    firstName:'',
                    lastName:'',
                    position:'',
                    phone: '',
                    email:'',
                    region: ''
                });
                setCreateDialog((prev: any) => ({...prev, Contacts: false}));
                let contact = res?.clientContact;
                contact['region'] = contact.region.id;
                setContacts(oldArray => [...oldArray, contact]);
            }
            else {
                console.log("error",res);
            }
        });
    }

    const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()
    const [sorting, setSorting] = useState<SortingState>([{"id": "active", "desc": true}]);
    const tableMeta = {
        updateData: (rowIndex: string, columnId: any, value: any) => {
            // setUpdateRequired(true);
            skipAutoResetPageIndex()
            setContacts(old => old.map((row, index) => {
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
        <Table columns={columns} data={contacts} tableMeta={tableMeta} 
            sorting={sorting} setSorting={setSorting} pagination={true}
            autoResetPageIndex={autoResetPageIndex} skipAutoResetPageIndex={skipAutoResetPageIndex}/>

        {/* Create Client Contact Dialog Box */}
        <Dialog open={createDialog['Contacts']} onClose={handleClose}>
            <DialogContent>
                <span className="dialogTitle">
                        <h1
                            style={{display: 'inline-block', position: 'relative', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                            Create new Contact
                        </h1>
                        <IconButton onClick={() => handleClose()} style={{float: 'right', padding: '0px 0px 4px 0px'}}>
                            <CloseIcon />
                        </IconButton>
                </span>
                <Grid container spacing={1} direction={'column'} alignItems={"center"} justifyContent={"center"}>
                    <Grid item xs={12}>
                        <InputField type="string" label="First Name" value={newContact['firstName']} onChange={(e) => setNewContact(prev => ({...prev, 'firstName':e.target.value}))}/>
                        <InputField type="string" label="Last Name" value={newContact['lastName']} onChange={(e) => setNewContact(prev => ({...prev, 'lastName':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="string" label="Position" value={newContact['position']} onChange={(e) => setNewContact(prev => ({...prev, 'position':e.target.value}))}/>
                        <InputField type="string" label="Phone" value={newContact['phone']} onChange={(e) => setNewContact(prev => ({...prev, 'phone':e.target.value}))}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="string" label="Email" value={newContact['email']} onChange={(e) => setNewContact(prev => ({...prev, 'email':e.target.value}))}/>
                        <InputField type="select" label="Region" value={newContact['region']} onChange={(e) => setNewContact(prev => ({...prev, 'region':e.target.value}))}
                        >
                            <option key={"blank_newRegion"} value={''}></option>
                            {regions?.map((region) => (
                            <option key={region.id} value={region.id}>{region.shortName}</option>
                            ))}
                        </InputField>
                    </Grid>
                    <Grid item xs={12}>
                        <Button sx={{paddingTop: '25px'}} onClick={handleCreate}>Create</Button>
                    </Grid>
                </Grid>
            </DialogContent>
        </Dialog>

        {/* Delete Alert Dialog */}
        {/* <BasicDialog title="Delete Contact" open={openAlert} close={() => setOpenAlert(false))} action={() => {handleDelete(deleteRow)}}>
            <p>Are you sure you want to delete this contact? This action will be permanent.</p>            
        </BasicDialog> */}

        {/* <Dialog open={openAlert} onClose={() => setOpenAlert(false)}>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogContent>
                <DialogContentText>Are you sure you want to delete this contact? This action will be permanent.</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {handleDelete(deleteRow)}}>Yes</Button>
                <Button onClick={() => {setDeleteRow(''); setOpenAlert(false)}}>No</Button>
            </DialogActions>
        </Dialog> */}
    </>    
    )
}

export default Contacts;