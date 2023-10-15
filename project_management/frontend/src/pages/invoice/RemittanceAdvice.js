import React, { useState, useMemo }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { useReactTable, getCoreRowModel, flexRender, getFilteredRowModel, getPaginationRowModel } from '@tanstack/react-table'
import { Dialog, DialogContent, DialogTitle, Grid, Typography, IconButton, Snackbar, Alert, Portal } from '@mui/material';
import { FileUploadSection, InputField, ProgressButton, SnackBar } from '../../components/Components';
import CloseIcon from '@mui/icons-material/Close';
import { Box } from '@mui/system';
import useAuth from '../auth/useAuth';

const RemittanceAdvice = ({ open, onClose, invoices, clients }) => {

    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();
    const [waiting, setWaiting] = useState({'remittance': false});
    const [data, setData] = useState();
    const [client, setClient] = useState();     
    const [remittanceDate, setRemittanceDate] = useState();     
    const [snack, setSnack] = useState({'active': false, 'message': '', variant: ''})
    
    const handleRemittanceAdvice = async () => {
        setWaiting(prev => ({...prev, 'remittance': true}));
        const [file] = remittance_input.files;

        if (!file) {
            console.log("No File Uploaded")
            setWaiting(prev => ({...prev, 'remittance': false}));
            return
        }

        let fileReader = new FileReader();
        fileReader.readAsDataURL(file)
        fileReader.onload = async () => {
            let data = fileReader.result
            try {
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
                    console.log("Extraction", res);
                    setWaiting(prev => ({...prev, 'remittance': false}));
                    setRemittanceDate(res.adviceDate);
                    setData(res.data);
                    setClient(res.client);
                    if(!res?.success) {
                        setSnack({'active': true, variant:'error', message: res.message});
                    }
                });
            } catch (err) {
                console.log("error:", err);
            }
        }      
    
    }

    const handleClose = async (event, reason) => {
        if (reason !== 'backdropClick') {
            // TODO: Snackbar
            if(event.target.name == "submit") {
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
                        mutation myobProcessPayment($uid: String!, $invoices: [InvoiceUpdateInput]!, $client: String!, $paymentDate: Date!) {
                            process_payment: myobProcessPayment(uid: $uid, invoices: $invoices, client: $client, paymentDate: $paymentDate) {
                                success
                                message
                                error
                                invoiceSet {
                                    id
                                    myobUid
                                    number
                                    dateCreated
                                    dateIssued
                                    datePaid
                                    amount
                                }
                            }
                        }`,
                        variables: {
                            uid: auth?.myob.id,
                            invoices: data,
                            client: client,
                            paymentDate: remittanceDate,
                        },
                }),
                }).then((response) => {
                    console.log(response)
                    const res = response?.data?.data?.process_payment; 
                    console.log("UpdateInvoices Response", res.invoiceSet)
                    setWaiting(prev => ({...prev, 'submit': false}));
                    onClose(event, reason, res.invoiceSet);

                    if(res.success) {
                        setSnack({'active': true, variant:'success', message: 'Sucessfully updated invoices from remittance advice.'})
                    }
                    else {
                        setSnack({'active': true, variant:'error', message: 'Error updating invoices. Please try again or contact admin.'})
                        console.log(JSON.parse(res.error))
                    }

                    setData([]);
                    setClient('');
                    setRemittanceDate('');
                }).catch((err) => {
                    console.log("error:", err);
                    setSnack({'active': true, variant:'error', message: 'Error Connecting to Server. Please try again or contact admin.'})
                });
            }
            else {
                onClose(event, reason);
                setData([]);
                setClient('');
                setRemittanceDate('');
            }
        }
    }

    // Table Columns
    const columns = useMemo(() => [
        {                
            accessorKey: 'number',
            header: () => 'Invoice',
            size: 80,
            footer: 'Total: ',
        },
        {                
            accessorKey: 'amount',
            header: () => 'Amount',
            cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue()),
            size: 120,
            footer: () => table.options.meta?.getMaintenanceTotal(),
        },
        {                
            id: 'included',
            accessorFn: row => table.options.meta?.checkMaintenanceInvoice(row) ? "✓" : "X",
            header: () => '',
            size: 5,
            footer: ''
        },
    ], []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        meta: {
            checkMaintenanceInvoice: (row) => {
                if(invoices.find(inv => inv.number === row.number)) {
                    return true;
                }
                return false;
            },
            getMaintenanceTotal: () => {
                // console.log(row, invoices.find(inv => inv.number === row.invoice))
                let sum = 0.0
                data.map(d => {
                    if(invoices.find(inv => inv.number === d.number)) {
                        sum += d.amount;
                    }   
                })
                
                return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(sum);
            },
        }
    });  

    return( <>
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle sx={{width: '100%', padding: '0px', paddingTop: '10px', margin: '0 auto'}}>
                <Typography variant='h6' 
                    style={{display: 'inline-block', position: 'relative', left: '24px', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                    Remittance Advice
                </Typography>
                <IconButton onClick={handleClose} style={{float: 'right', right: '12px', padding: '2px 0px'}} >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent style={{padding: '4px 12px'}}>
                <Grid container spacing={1} align="center">
                    { data && remittanceDate ? <>
                        <Grid item xs={12}>
                            <InputField width={300}
                                type="select"
                                label="Client"
                                value={client}
                                onChange={e => setClient(e.target.value)}
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
                                onChange={e => setRemittanceDate(e.target.value)} 
                                max="9999-12-31"
                                />
                        </Grid>
                        <Grid item xs={12} style={{overflow: 'auto hidden'}}>
                            <table style={{width: table.getTotalSize()}}>
                                <thead>
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map(header => {
                                                return (
                                                    <th key={header.id} colSpan={header.colSpan} style={{width: header.getSize(), padding: '5px'}}>
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
                                            <tr key={row.id} style={{height: '20px'}}>
                                                {row.getVisibleCells().map(cell => {
                                                    return (
                                                        <td key={cell.id} style={{padding: '4px 5px'}}>
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
                                <tfoot>
                                    {table.getFooterGroups().map(footerGroup => (
                                        <tr key={footerGroup.id}>
                                        {footerGroup.headers.map(header => (
                                            <th key={header.id} style={{padding: '5px'}}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.footer,
                                                    header.getContext()
                                                    )}
                                            </th>
                                        ))}
                                        </tr>
                                    ))}
                                </tfoot>
                            </table>
                            <ProgressButton name="Submit" onClick={handleClose} waiting={waiting.submit} />
                        </Grid></>
                        :
                        <Grid item xs={12} align="center">
                            <p>Upload Remittance advice PDF</p>
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
                    }
                </Grid>
            </DialogContent>
        </Dialog>

        <SnackBar snack={snack} setSnack={setSnack} />
    </>
    )
}

export default RemittanceAdvice;