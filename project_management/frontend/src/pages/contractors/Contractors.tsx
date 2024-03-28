import React, { useState, useEffect, useMemo, }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { IconButton, Grid, Box, CircularProgress } from '@mui/material';
import { usePrompt } from '../../hooks/promptBlocker';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import { Footer,ProgressIconButton, SnackBar, Table, Tooltip } from '../../components/Components';
import { blankContractor } from '../../types/blanks';
import { ContractorType, SnackType } from '../../types/types';
import { ColumnDef, ColumnFiltersState } from '@tanstack/table-core';
import CreateContractorDialog from './create/Dialog';

type ChangedRowType = {
    [key: number]: boolean
}

const Contractors = () => {

    const axiosPrivate = useAxiosPrivate();
    const [loading, setLoading] = useState(true);
    const [updateRequired, setUpdateRequired] = useState(false);
    const [data, setData] = useState<ContractorType[]>([]);
    const [changedRows, setChangedRows] = useState<ChangedRowType>({});

    const [createContractor, setCreateContractor] = useState(false);
    const [newContractor, setNewContractor] = useState<ContractorType>(blankContractor);

    const [waiting, setWaiting] = useState(false);
    const [snack, setSnack] = useState<SnackType>({active: false, variant: 'info', message:''})

    // Table
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    // Navigation Blocker
    usePrompt('You have unsaved changes. Are you sure you want to leave?', updateRequired && !loading);
        
    // Dialog Controls
    const handleDialogClose = (event: any, reason: string, value: ContractorType) => {
        if (reason !== 'backdropClick') {
            setNewContractor(value);
            setCreateContractor(false);
        }
    }

    const handleDialogCreate = async (value: ContractorType) => {
        setWaiting(true);

        //Send to MYOB
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation createContractor($contractor: ContractorInput!) { 
                    create: createContractor(contractor: $contractor) {
                        success
                        message
                        contractor {
                            id
                            myobUid
                            name
                            abn
                            bsb
                            bankAccountName
                            bankAccountNumber
                        }
                    }
                }`,
                variables: { 
                    contractor: newContractor,
                },
            }),
        }).then((response) => {
            const res = response?.data?.data?.create;
            console.log(res);

            if(res.success){    
                setSnack({active: true, variant: 'success', message: "Successfully Created Contractor"})
                // Clear Dialog Content
                setData(oldArray => [...oldArray, res.contractor]);
                setNewContractor(blankContractor);
                setCreateContractor(false);
            }
            else {
                console.log("error",res);
                setSnack({active: true, variant: 'error', message: "Error Creating Contractor"})
            }
        }).catch((e) => {
            console.log("error", e);
            setSnack({active: true, variant: 'error', message: "Error Creating Contractor"})
        }).finally(() => {
            setWaiting(false);
        });   
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
            size: 95,
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
                mutation updateContractors($contractors: [ContractorInput]!) { 
                    update: updateContractors(contractors: $contractors) {
                        success
                        message
                    }
                }`,
                variables: { 
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
                {loading ? 
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}}>
                        <CircularProgress />
                    </Box>
                    :
                    <Table data={data} setData={setData} 
                        columns={columns} 
                        setUpdateRequired={setUpdateRequired}
                        pagination
                        columnFilters={columnFilters} setColumnFilters={setColumnFilters}
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
        <CreateContractorDialog newContractor={newContractor} setNewContractor={setNewContractor} 
            open={createContractor} onCreate={handleDialogCreate} onClose={handleDialogClose}
            inputMask={inputMask} waiting={waiting}
        />
    </>);
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
            if(bsbReg.test(val)) {
                break; 
            }

            val = val.replaceAll('-', '');
            if(val.length >= 4) {
                val = val.slice(0, 3) + "-" + val.slice(3, val.length > 6 ? 6 : val.length)
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
            if(abnReg.test(val)) {
                break; 
            }

            val = val.replaceAll(' ', '');
            if(val.length >= 9) {
                console.log(val.slice(0,2), val.slice(2,5), val.slice(5,8), val.slice(8, val.length > 11 ? 11 : val.length))
                val = val.slice(0,2) + " " + val.slice(2,5) + " " + val.slice(5,8) + " " + val.slice(8, val.length > 11 ? 11 : val.length)
                break;
            }
            if(val.length >= 6) {
                val = val.slice(0,2) + " " + val.slice(2,5) + " " + val.slice(5, val.length)
                break;
            }
            if(val.length >= 3) {
                val = val.slice(0,2) + " " + val.slice(2, val.length)
            }
            
            break;
        case "bankAccountName":
            val = val.toUpperCase();
            break;
        default:
            val = val;
            break;
    }
    return val;
}

export default Contractors;