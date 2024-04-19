import { useState, useEffect, useMemo }  from 'react';
import useAxiosPrivate from '../../../hooks/useAxiosPrivate';
import { Dialog, DialogContent, DialogTitle, Grid, Typography, IconButton } from '@mui/material';
import { FileUploadSection, InputField, ProgressButton, SnackBar, Table, Tooltip } from '../../../components/Components';
import CloseIcon from '@mui/icons-material/Close';
import { Box } from '@mui/system';
import useAuth from '../../auth/useAuth';
import { ClientType, InvoiceType, RemittanceType, SnackType } from '../../../types/types';
import { ColumnDef, Table as ReactTable, Row } from '@tanstack/react-table';
import { EditableCell } from '../../../components/TableHelpers';

import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { blankInvoice } from '../../../types/blanks';

const CreateRemittance = ({ open, onClose, invoices, clients, setRemittanceAdvice }: {
    open: boolean
    onClose: (submit: boolean, updatedInvoices?: InvoiceType[]) => void,
    invoices: InvoiceType[],
    clients: ClientType[]
    setRemittanceAdvice: React.Dispatch<React.SetStateAction<RemittanceType[]>>
}) => {

    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();
    const [waiting, setWaiting] = useState({remittance: false, submit: false, check: false});
    const [data, setData] = useState<InvoiceType[]>([blankInvoice]);
    const [client, setClient] = useState('');     
    const [remittanceDate, setRemittanceDate] = useState('');
    const [invalidInvoices, setInvalidInvoices] = useState(true);
    const [uploaded, setUploaded] = useState(false);
    const [snack, setSnack] = useState<SnackType>({active: false, message: '', variant:'info'})
    const [fieldError, setFieldError] = useState({})
    
    useEffect(() => {
        if(data?.length == 0) {
            setData([blankInvoice]);
        }
    }, [data])

    const handleRemittanceAdvice = async () => {
        setWaiting(prev => ({...prev, 'remittance': true}));
        const target = document.getElementById('remittance_input') as HTMLInputElement;
        const [file] = target?.files as FileList;

        if (!file) {
            console.log("No File Uploaded")
            setWaiting(prev => ({...prev, 'remittance': false}));
            return
        }

        let fileReader = new FileReader();
        fileReader.readAsDataURL(file)
        fileReader.onload = async () => {
            let data = fileReader.result
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation extractRemittanceAdvice($file: String!, $filename: String!) {
                    remittance_advice: extractRemittanceAdvice(file: $file, filename: $filename) {
                        success
                        message
                        adviceDate
                        data {
                            number
                            amount
                        }
                        client
                    }
                }`,
                variables: { 
                    file: data,
                    filename: file.name,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data?.remittance_advice;
                // console.log("Extraction", res);

                setWaiting(prev => ({...prev, 'remittance': false}));
                setUploaded(true);

                if(res?.success) {
                    setSnack({'active': true, variant:'success', message: res.message});
                    setRemittanceDate(res.adviceDate);
                    setData(res.data);
                    setClient(res.client);    
                }
                else {
                    setSnack({'active': true, variant:'error', message: res.message});
                    setData([]);
                }
            }).catch((err) => {
                console.log("error:", err);
            });
        }      
    
    }

    const handleClose = async (event?: { target?: { name?: string}}, reason?: string) => {
        if (reason !== 'backdropClick') {
            if(event?.target?.name == "submit") {
                if(!client || !remittanceDate) {
                    !client ? setFieldError(prev => ({...prev, 'client': true})) : setFieldError(prev => ({...prev, 'date': true})) 
                    return
                }

                setWaiting(prev => ({...prev, 'submit': true}));

                // MYOB Payment
                await axiosPrivate({
                    method: 'post',
                    data: JSON.stringify({
                        query: `
                        mutation processRemittance($invoices: [InvoiceUpdateInput]!, $client: String!, $paymentDate: Date!) {
                            remittance: processRemittance(invoices: $invoices, client: $client, paymentDate: $paymentDate) {
                                success
                                message
                                invoices {
                                    id
                                    myobUid
                                    number
                                    dateCreated
                                    dateIssued
                                    datePaid
                                    amount
                                }
                                remittanceAdvice {
                                    id
                                    myobUid
                                    imgUid
                                    date
                                    amount
                                    client {
                                        name
                                        displayName
                                    }
                                    invoiceSet {
                                        id
                                        amount
                                    }
                                }
                            }
                        }`,
                        variables: {
                            invoices: data,
                            client: client,
                            paymentDate: remittanceDate,
                        },
                }),
                }).then((response) => {
                    console.log(response)
                    const res = response?.data?.data?.remittance; 
                    
                    setData([]);
                    setClient('');
                    setRemittanceDate('');
                    setUploaded(false);

                    if(res.success) {
                        setSnack({'active': true, variant:'success', message: res.message})
                        setRemittanceAdvice(prev => ([...prev, res.remittanceAdvice]))
                        onClose(true, res.invoices);
                    }
                    else {
                        setSnack({'active': true, variant:'error', message: res.message})
                        onClose(false);
                    }

                }).catch((err) => {
                    console.log("error:", err);
                    setSnack({'active': true, variant:'error', message: 'Error Connecting to Server. Please try again or contact admin.'})
                }).finally(() => {
                    setWaiting(prev => ({...prev, 'submit': false}));
                });
            }
            else {
                onClose(false);
                setUploaded(false);
                setData([]);
                setClient('');
                setRemittanceDate('');
            }
        }
    }

    const handleCheck = async () => {
        setWaiting(prev => ({...prev, 'check': true}));

        let externalInvoices: InvoiceType[] = []
        let errorFound = false
        data.map((invoice) => {
            let inv = invoices.find(inv => inv.number === invoice.number)

            // Ensure the amount is a number for api call later
            invoice.amount = typeof invoice?.amount === "number" ? invoice?.amount : parseFloat(invoice?.amount ?? '0')

            if(!inv) {
                externalInvoices.push(invoice);
            }
            else {
                let invoiceAmount = (invoice?.amount ?? 0).toFixed(2);
                let invAmount = typeof invoice?.amount === "number" ? ((inv.amount ?? 0) * 1.1).toFixed(2) : parseFloat(((inv.amount ?? 0) * 1.1).toString()).toFixed(2);

                if(invoiceAmount !== invAmount) {
                    setSnack({'active': true, variant:'error', message: "Some invoice prices do not match. Please review advice."});
                    setWaiting(prev => ({...prev, 'check': false}));
                    errorFound = true;
                }
            }
        })
        if(errorFound){ return }

        if(externalInvoices.length == 0) {
            setWaiting(prev => ({...prev, 'check': false}));
            setInvalidInvoices(false);
            return;
        }

        let queryString = ''
        for(let i = 0; i < externalInvoices.length ; i++) {
            if(i > 0) queryString += ' or '
            queryString += `Number eq '${externalInvoices[i].number}'`
        }
        
        // MYOB Payment
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation myobGetInvoices($uid: String!, $inv: String!) {
                    invoices: myobGetInvoices(uid: $uid, inv: $inv) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    inv: queryString,
                },
        }),
        }).then((response) => {
            // console.log(response)
            const res = response?.data?.data?.invoices; 
            
            if(res.success) {
                const extInv = JSON.parse(res.message);

                if(extInv.length == externalInvoices.length) {
                    setSnack({'active': true, variant:'success', message: "All invoices are valid."})
                    setInvalidInvoices(false);
                }
                else {
                    setSnack({'active': true, variant:'error', message: "All invoices cannot be found in MYOB. Please check."})
                }
            }                
            else {
                console.log(JSON.parse(res.error))
                setSnack({'active': true, variant:'error', message: res.message})
            }

        }).catch((err) => {
            console.log("error:", err);
            setSnack({'active': true, variant:'error', message: 'Error Connecting to Server. Please try again or contact admin.'})
        }).finally(() => {
            setWaiting(prev => ({...prev, 'check': false}));
        });
    }

    const handleAdd = () => {
        setInvalidInvoices(true);
        const {dateCreated, datePaid, dateIssued, ...invoice} = blankInvoice
        setData(prev => [...prev, invoice]) 
    }

    const handleDelete = (row: Row<InvoiceType>) => {
        setInvalidInvoices(true);
        setData(prev => {
            let newData: InvoiceType[] = [];
            prev.map((val, idx) => {
                if(idx != row.index) {
                    newData.push(val)
                }
            })
            return newData
        });
    }

    // Table Columns
    const columns = useMemo<ColumnDef<InvoiceType>[]>(() => [
        {
            id: 'editControls',
            cell: ({row}) => <IconButton onClick={() => handleDelete(row)} style={{padding: '0'}}><DeleteIcon/></IconButton>,
            footer: () => <IconButton onClick={handleAdd} style={{padding: '0'}}><AddIcon/></IconButton>,
            size: 40,
        },
        {                
            accessorKey: 'number',
            header: () => 'Invoice',
            cell: EditableCell,
            size: 120,
            footer: 'Maintenance /\nTotal: ',
        },
        {                
            accessorKey: 'amount',
            header: () => 'Amount',
            cell: props => EditableCell({...props, type: 'number'}),
            size: 120,
            footer: ({table}) => table?.options?.meta?.getTotals && `${table?.options?.meta?.getTotals()[0]} /\n${table?.options?.meta?.getTotals()[1]}` ,
        },
        {                
            id: 'included',
            header: () => '',
            cell: ({table, row}) => table.options.meta?.checkMaintenanceInvoice && table.options.meta?.checkMaintenanceInvoice(row) > 0 ? 
            table.options.meta?.checkMaintenanceInvoice(row) > 1 ? 
                "✓" : <Tooltip title='Price Does Not Match' ><p>!</p></Tooltip> : <Tooltip title='Not Found'><p>X</p></Tooltip>, 
            size: 5,
            footer: ''
        },
    ], []);

    const tableMeta = {
        updateData: (rowIndex: any, columnId: any, value: any) => {
            setInvalidInvoices(true);
            setData((old: any) => 
                old.map((row: any, index: any) => {
                if (index === rowIndex) {
                    return {
                    ...old[rowIndex]!,
                    [columnId]: value,
                    }
                }
                return row
                })
            )
        },
        checkMaintenanceInvoice: (row: Row<InvoiceType>) => {
            const inv = invoices.find(inv => inv.number === row.original.number)
            if(inv) {
                if(parseFloat(row.getValue('amount')).toFixed(2) === parseFloat(((inv.amount ?? 0) * 1.1).toString()).toFixed(2))
                    return 2;
                return 1;
            }
            return 0;
        },

        getTotals: () => {
            let sum = 0.0
            let maintenanceSum = 0.0
            data?.map(d => {
                if(invoices.find(inv => inv.number === d.number)) {
                    if(typeof(d.amount) == 'string') {
                        maintenanceSum += parseFloat(d.amount ?? 0);
                    }
                    else {
                        maintenanceSum += d.amount ?? 0;
                    }
                } 
                if(typeof(d.amount) == 'string') {
                    sum += parseFloat(d.amount ?? 0);
                }
                else {
                    sum += d.amount ?? 0;
                }
            })
            
            return [new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(maintenanceSum), new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(sum)];
        },
    }

    return( <>
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
            <DialogTitle sx={{width: '100%', padding: '0px', paddingTop: '10px', margin: '0 auto'}}>
                <Typography variant='h6' 
                    style={{display: 'inline-block', position: 'relative', left: '24px', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                    Remittance Advice
                </Typography>
                <IconButton style={{float: 'right', right: '12px', padding: '2px 0px'}} onClick={() => handleClose()} >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent style={{padding: '4px 12px'}}>
                <Grid container spacing={1} direction='column' alignItems='center'>
                    { uploaded ? <>
                        <Grid item xs={12}>
                            <InputField width={300}
                                type="select"
                                label="Client"
                                value={client}
                                onChange={e => {setClient(e.target.value); setInvalidInvoices(true);}}
                            >
                                <option key="blank" value=""></option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </InputField>
                        </Grid>
                        <Grid item xs={12}>
                            <InputField width={150}
                                type="date"
                                label="Date" 
                                name="date" 
                                value={remittanceDate} 
                                onChange={e => {setRemittanceDate(e.target.value); setInvalidInvoices(true);}} 
                                max="9999-12-31"
                                />
                        </Grid>
                        <Grid item xs={12}>
                            <Table data={data} columns={columns} tableMeta={tableMeta} showFooter={true} />
                        </Grid>
                        <Grid item xs={12}>
                            <ProgressButton name="Check" disabled={!invalidInvoices} onClick={handleCheck} waiting={waiting.check} />
                            <ProgressButton name="Submit" disabled={invalidInvoices} onClick={handleClose} waiting={waiting.submit} />
                        </Grid>
                        </>
                        :
                        <>
                        <Grid item xs={12}>
                            <p className='centered'>Upload Remittance advice PDF</p>
                        </Grid>
                        <Grid item xs={12}>
                            <Box style={{paddingTop: '15px'}}>
                                <FileUploadSection 
                                    onSubmit={handleRemittanceAdvice} 
                                    waiting={waiting.remittance} 
                                    id="remittance_input"
                                    type=".pdf"
                                    button="Upload"
                                    />
                            </Box>
                        </Grid>
                        </>
                    }
                </Grid>
            </DialogContent>
        </Dialog>

        <SnackBar snack={snack} setSnack={setSnack} />
    </>
    )
}

export default CreateRemittance;