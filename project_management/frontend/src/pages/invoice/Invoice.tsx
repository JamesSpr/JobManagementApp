import { useState, useEffect } from 'react'
import { SnackBar, TabComponent } from '../../components/Components';
import { ClientType, InvoiceType, RemittanceType, SnackType } from '../../types/types';

import InvoiceList from './Invoices';
import RemittanceAdvice from './remittance/RemittanceAdvice';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Box, CircularProgress } from '@mui/material';

const Invoice = () => {  

    const axiosPrivate = useAxiosPrivate();

    const [invoices, setInvoices] = useState<InvoiceType[]>([]);
    const [clients, setClients] = useState<ClientType[]>([])
    const [remittanceAdvice, setRemittanceAdvice] = useState<RemittanceType[]>([]);
    const [loading, setLoading] = useState(true);

    const [snack, setSnack] = useState<SnackType>({active: false, variant: 'info', message: ''})
    const [tabValue, setTabValue] = useState(0); // Active Tab tabValue
    const tabOptions = ["Invoices", "Remittance Advice"]
    const tabItems = [
        <InvoiceList invoices={invoices} />,

        <RemittanceAdvice 
            clients={clients} 
            invoices={invoices} setInvoices={setInvoices} 
            remittanceAdvice={remittanceAdvice} setRemittanceAdvice={setRemittanceAdvice} 
        />
    ]

    // Get Data
    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            await axiosPrivate({ 
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `{ 
                        invoices {
                            id
                            myobUid
                            number
                            dateCreated
                            dateIssued
                            datePaid
                            amount
                            job {
                                id
                                po
                                sr
                                otherId
                            }
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
                        clients {
                            id
                            name
                        }
                    }`,
                    variables: {}
                }),
            }).then((response) => {
                const res = response?.data?.data;
                console.log(res);

                for(let i = 0; i < res.invoices.length; i++) {
                    res.invoices[i]['dateIssued'] = res.invoices[i]['dateIssued'] ? new Date(res.invoices[i]['dateIssued']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                    res.invoices[i]['dateCreated'] = res.invoices[i]['dateCreated'] ? new Date(res.invoices[i]['dateCreated']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                    res.invoices[i]['datePaid'] = res.invoices[i]['datePaid'] ? new Date(res.invoices[i]['datePaid']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                }
                for(let i = 0; i < res.remittanceAdvice.length; i++) {
                    res.remittanceAdvice[i]['date'] = res.remittanceAdvice[i]['date'] ? new Date(res.remittanceAdvice[i]['date']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                }

                setInvoices(res.invoices);
                setRemittanceAdvice(res.remittanceAdvice)
                setClients(res.clients)
                setLoading(false);
            }).catch((err) => {
                // TODO: handle error
                if(err.name === "CanceledError") {
                    return
                }
                console.log("Error:", err);
            });
        }

        fetchData();

        return () => {
            controller.abort();
        } 
    }, []);

    return (
        <>
        {!loading ?
            <TabComponent tabValue={tabValue} setTabValue={setTabValue} tabOptions={tabOptions} tabItems={tabItems} />
            :
            <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}}>
                <CircularProgress />
            </Box>
        }

        <SnackBar snack={snack} setSnack={setSnack} />
        </>
    )

}

export default Invoice;