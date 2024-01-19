import React, { useState, useEffect, useMemo, }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Button, IconButton, Dialog, DialogContent, DialogTitle, 
         Grid, Box, CircularProgress, Tooltip } from '@mui/material';
import { usePrompt } from '../../hooks/promptBlocker';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import DebouncedInput from '../../components/DebouncedInput';
import useAuth from '../auth/useAuth';
import { BasicDialog, Footer, InputField, PaginationControls, ProgressIconButton, SnackBar, Table, useSkipper } from '../../components/Components';
import { blankContractor } from '../job/Queries';
import { ContactType, ContractorType, SnackBarType, SnackType } from '../../types/types';
import { ColumnDef } from '@tanstack/table-core';
import { Step, Stepper } from '../../components/stepper/Stepper';

type ChangedRowType = {
    [key: number]: boolean
}

const Contractors = () => {

    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const [loading, setLoading] = useState(true);
    const [updateRequired, setUpdateRequired] = useState(false);
    const [data, setData] = useState<ContractorType[]>([]);
    const [newContractor, setNewContractor] = useState<ContractorType>(blankContractor);
    const [changedRows, setChangedRows] = useState<ChangedRowType>({});
    const [createContractor, setCreateContractor] = useState(false);

    const [waiting, setWaiting] = useState(false);
    const [snack, setSnack] = useState<SnackType>({active: false, variant: 'info', message:''})

    // Table
    const [globalFilter, setGlobalFilter] = React.useState('')

    // Navigation Blocker
    usePrompt('You have unsaved changes. Are you sure you want to leave?', updateRequired && !loading);
        
    // Dialog Controls
    const handleDialogClose = (event: any, reason: string, value: ContractorType) => {
        if (reason !== 'backdropClick') {
            setNewContractor(value);
            setCreateContractor(false);
        }
    }

    const handleDialogCreate = (value: ContractorType) => {
        setNewContractor(value);
        handleCreate(value);
        setCreateContractor(false);
    }
    
    // Get Data
    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `{ 
                        contractors {
                            id
                            myobUid
                            name
                        abn
                        bsb
                        bankAccountName
                        bankAccountNumber
                    }
                }`,
                variables: {}
            }),
            }).then((response) => {
                const res = response?.data?.data?.contractors;            
                setData(res);
                setLoading(false);
            });
        }
        fetchData();

        return () => {
            controller.abort();
        }
    }, []);

    const editableCell = ({ getValue, row: { index }, column: { id }, table }: {
        getValue: any,
        row: { index: any },
        column: { id: any },
        table: any,
        setUpdateRequired?: React.Dispatch<React.SetStateAction<boolean>> 
    }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)

        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            if(initialValue !== value) {
                setChangedRows(prev => ({...prev, [index]: true}));
                table.options.meta?.updateData(index, id, value);
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        // Customise each input based on id
        let additionalProps = {}
        let onChange = (e: any) => {}
        switch(id) {
            case "name":
                onChange = (e) => setValue(e.target.value)
                additionalProps = {
                    maxLength: '50',
                }
                break;
            case "bsb":
                onChange = (e) => setValue(inputMask(id, e.target.value))
                additionalProps = {
                    maxLength: '7',
                    name: id,
                }
                break;
            case "abn":
                onChange = (e) => setValue(inputMask(id, e.target.value))
                additionalProps = {
                    maxLength: '14',
                    name: id,
                }
                break;
            case "bankAccountNumber":
                onChange = (e) => setValue(e.target.value)
                additionalProps = {
                    maxLength: '9',
                }
                break;
            case "bankAccountName":
                onChange = (e) => setValue(inputMask(id, e.target.value))
                additionalProps = {
                    maxLength: '32',
                    name: id,
                }
                break;
            default:
                onChange = (e) => setValue(e.target.value)
                break;
        }
        
        return (
            <input className="dataTableInput"value={value} onChange={onChange} onBlur={onBlur} {...additionalProps}/>
        )
    }

    // Table Columns
    const columns = useMemo<ColumnDef<ContractorType>[]>(() => [
        {                
            accessorKey: 'name',
            header: () => 'Supplier',
            cell: editableCell,
            size: 480,
        },
        {                
            accessorKey: 'abn',
            header: () => 'ABN',
            cell: editableCell,
            size: 120,
        },
        {
            accessorKey: 'bsb',
            header: () => 'BSB',
            cell: editableCell,
            size: 70,
        },
        {
            accessorKey: 'bankAccountNumber',
            header: () => 'Bank Number',
            cell: editableCell,
            size: 80,
        },
        {
            accessorKey: 'bankAccountName',
            header: () => 'Bank Name',
            cell: editableCell,
            size: 380,
        },
        {
            id: 'contacts',
            accessorFn: row => row?.contacts?.length,
            header: () => 'Contacts',
            cell: ({row}) => (
                <span style={{display: 'table', margin: '0 auto'}}>
                    <IconButton onClick={() => {console.log("To the contacts for:", row?.original?.name, row)}} style={{padding: '0px'}}>
                        <PersonIcon />
                    </IconButton>
                </span>
            ),
            size: 60,
        },
    ], []);

    const handleCreate = async (newContractor: ContractorType) => {
        //Send to MYOB
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation myobCreateContractor($contractor: myobContractorInput!, $uid: String!) { 
                    myob_create: myobCreateContractor(contractor: $contractor, uid: $uid) {
                        success
                        message
                        myobUid
                    }
                }`,
                variables: { 
                    uid: auth?.myob?.id,
                    contractor: newContractor,
                },
            }),
        }).then((response) => {
            const res = response?.data?.data?.myob_create;

            if(res.success){    
                setSnack({active: true, variant: 'success', message: "Successfully Created Contractor"})
                // Clear Dialog Content
                setNewContractor(blankContractor);
                setCreateContractor(false);
                setData(oldArray => [...oldArray, res.contractor]);
            }
            else {
                console.log("error",res);
                setSnack({active: true, variant: 'error', message: "Error Creating Contractor"})
            }
        }).catch((e) => {
            console.log("error", e);
            setSnack({active: true, variant: 'error', message: "Error Creating Contractor"})
        });   
        
    }

    const handleSave = async () => {
        setWaiting(true);
        // Gather the rows that have been changed
        let changedContractors = []
        for(let x in changedRows) {
            changedContractors.push(data[x])
        }

        // Update the changed data
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation myobUpdateContractor($contractors: [myobContractorInput]!, $uid: String!) { 
                    update: myobUpdateContractor(contractors: $contractors, uid: $uid) {
                        success
                        message
                    }
                }`,
                variables: { 
                    uid: auth?.myob?.id,
                    contractors: changedContractors,
                },
            }),
        }).then((response) => {
            const res = response?.data?.data?.update;
            if(res.success){
                setSnack({active: true, variant: 'success', message: res.message})
                setUpdateRequired(false);
            }
            else {
                console.log("error",res); 
                setSnack({active: true, variant: 'error', message: res.message})
            }
        }).catch((e) => {
            console.log("error", e);
        }).finally(() => {
            setWaiting(false);
        }); 
    }

    return(<>
        <Grid container spacing={1} alignItems="center">
            <Grid item xs={12} style={{overflowX: 'auto', overflowY: 'hidden'}}>
                <Grid item xs={12}>
                    <DebouncedInput
                        value={globalFilter ?? ''}
                        onChange={(value: any) => setGlobalFilter(String(value))}
                        placeholder="Search Contractors"
                        style={{maxWidth: '1200px'}}
                    />
                </Grid>
                {loading ? 
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}}>
                        <CircularProgress />
                    </Box>
                    :
                    <Table data={data} setData={setData} 
                        columns={columns} 
                        pagination
                        globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                    />
                }
            </Grid> 
        </Grid>

        <Footer>
            <Tooltip title="Save Changes">
                <ProgressIconButton waiting={waiting} disabled={!updateRequired} onClick={handleSave}>
                    <SaveIcon />
                </ProgressIconButton>
            </Tooltip>
            <Tooltip title="Create New Contractor">
                <IconButton onClick={(e) => setCreateContractor(true)}><AddIcon /></IconButton>
            </Tooltip>
        </Footer>

        <SnackBar snack={snack} setSnack={setSnack} />

        {/* Create Contractor Dialog Box */}
        <CreateContractorDialog createObject={newContractor} open={createContractor} onCreate={handleDialogCreate} onClose={handleDialogClose}/>
    </>);
}

const CreateContractorDialog = ({ createObject, open, onCreate, onClose }: {
    open:boolean
    onCreate: (value: ContractorType) => void
    onClose: (event: any, reason: string, value: ContractorType) => void
    createObject: ContractorType
}) => {

    const [value, setValue] = useState(createObject);
    const [fieldError, setFieldError] = useState({
        name: false, abn: false,bsb: false, bankAccountName: false, bankAccountNumber: false, contacts: [{
            address: false, locality: false, state: false, postcode: false, country: false
        }]
    });

    const handleDialogChange = (e: { target: { name: string; value: string | any[]; }; }) => {
        if(e.target.name === 'abn' && fieldError['abn'] && e.target.value.length == 14) {
            setFieldError(prev => ({...prev, 'abn': false}))
        }
        if(e.target.name === 'bsb' && fieldError['bsb'] && e.target.value.length == 7) {
            setFieldError(prev => ({...prev, 'bsb': false}))
        }
        if(e.target.name === 'bankAccountNumber' && fieldError['bankAccountNumber'] && e.target.value.length >= 6) {
            setFieldError(prev => ({...prev, 'bankAccountNumber': false}))
        }

        setValue((prev: any) => ({...prev, [e.target.name]: inputMask(e.target.name, e.target.value)}))
    }

    const handleClose = (event?: any, reason?: any) => {
        setFieldError({name: false, abn: false,bsb: false, bankAccountName: false, bankAccountNumber: false, contacts: [
            {address: false, locality: false, state: false, postcode: false, country: false}
        ]});
        onClose(event, reason, value);
    }

    const handleCreate = () => {
        let error = false;
        if(value['abn'].length < 14) {
            setFieldError(prev => ({...prev, 'abn': true}))
            error = true;
        }
        if(value['bsb'].length < 7) {
            setFieldError(prev => ({...prev, 'bsb': true}))
            error = true;
        }
        if(value['bankAccountNumber'].length < 6) {
            setFieldError(prev => ({...prev, 'bankAccountNumber': true}))
            error = true;
        }
        
        if(error) {
            return
        }

        onCreate(value);
    }

    const BankDetailsStep = (
        <Grid container spacing={1} direction='column' alignItems='center'>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError['name']} 
                    label="Contractor" name="name" 
                    value={value['name']} 
                    onChange={handleDialogChange} maxLength={50}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError['abn']} 
                    label="ABN" name="abn" 
                    value={value['abn']} 
                    onChange={handleDialogChange} maxLength={14}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError['bankAccountName']} 
                    label="Bank Account Name" name="bankAccountName" 
                    value={value['bankAccountName']} 
                    onChange={handleDialogChange} maxLength={32}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError['bsb']} 
                    label="BSB" name="bsb" 
                    value={value['bsb']} 
                    onChange={handleDialogChange} maxLength={7} 
                    style={{width: '75px', marginRight: '5px'}}
                />
                <InputField
                    type="text" 
                    error={fieldError['bankAccountNumber']} 
                    label="Account Number" name="bankAccountNumber" 
                    value={value['bankAccountNumber']} 
                    onChange={handleDialogChange} maxLength={9} 
                    style={{width: '120px', marginLeft: '5px'}}
                />
            </Grid>
        </Grid>
    )

    const ContactDetailsStep = (
        <Grid container spacing={1} direction='column' alignItems='center'>
            <Grid item xs={12}>
                <InputField
                    type="text"
                    label="Street" name="street" 
                    error={fieldError.contacts[0].address} 
                    value={value.contacts?.[0].address ?? ""} 
                    onChange={handleDialogChange} maxLength={255}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text"
                    label="City" name="city" 
                    error={fieldError.contacts[0].locality} 
                    value={value.contacts?.[0].locality} 
                    onChange={handleDialogChange} maxLength={255}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="select" 
                    error={fieldError.contacts[0].state} 
                    label="State" name="state" 
                    value={value.contacts?.[0].state}
                    onChange={handleDialogChange} maxLength={32}
                >
                    <option>NSW</option>
                    <option>ACT</option>
                    <option>NT</option>
                    <option>QLD</option>
                    <option>SA</option>
                    <option>TAS</option>
                    <option>VIC</option>
                    <option>WA</option>
                </InputField>
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError.contacts[0].postcode} 
                    label="Postcode" name="postcode" 
                    value={value.contacts?.[0].postcode} 
                    onChange={handleDialogChange} maxLength={4} 
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError.contacts[0].country} 
                    label="Postcode" name="postcode" 
                    value={value.contacts?.[0].country} 
                    onChange={handleDialogChange} maxLength={4} 
                />
            </Grid>

        </Grid>
    )

    const dialogActions = (
        <div className='custom-dialog-actions'>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
        </div>
    )

    return(
        <BasicDialog open={open} close={handleClose} 
            title='Create New Contractor' dialogActions={dialogActions}
            fullWidth maxWidth='sm' center
        >
            <Stepper>
                <Step name='Bank Details *'>
                    {BankDetailsStep}
                </Step>
                <Step name='Contact *'>
                    {ContactDetailsStep}
                </Step>
            </Stepper>
            
        </BasicDialog>
    )
}

// Mask inputs
const inputMask = (name: any, val: any) => {
    let pattern = '';
    switch(name) {
        case "bsb":
            if(val.length <= 3) {
                pattern = `[0-9]{${val.length}}`;
            }
            else {
                pattern = `[0-9]{3}-[0-9]{${val.length - 4}}`;
            }
            
            let bsbReg = new RegExp(pattern)
            if(val.length === 4 && val.slice(3,4) !== "-" && !bsbReg.test(val)) {
                val = val.slice(0, 3) + "-" + val.slice(3,4)
            }

            break;

        case "abn":
            if(val.length <= 2) {
                pattern = `[0-9]{${val.length}}`;
            }
            else if(val.length <= 6) {
                pattern = `[0-9]{2} [0-9]{${val.length - 3}}`;
            }
            else if(val.length <= 10) {
                pattern = `[0-9]{2} [0-9]{3} [0-9]{${val.length - 7}}`;
            }
            else {
                pattern = `[0-9]{2} [0-9]{3} [0-9]{3} [0-9]{${val.length - 10}}`;
            }
            
            let abnReg = new RegExp(pattern)
            if(val.length === 3 && val.slice(2,3) !== " " && !abnReg.test(val)) {
                val = val.slice(0,2) + " " + val.slice(2,3)
            }
            if(val.length === 7 && val.slice(6,7) !== " " && !abnReg.test(val)) {
                val = val.slice(0,6) + " " + val.slice(6,7)
            }
            if(val.length === 11 && val.slice(10,11) !== " " && !abnReg.test(val)) {
                val = val.slice(0,10) + " " + val.slice(10,11)
            }
            
            break;
        case "bankAccountName":
            val = val.toUpperCase();
            break;
        default:
            break;
    }
    return val;
}


export default Contractors;