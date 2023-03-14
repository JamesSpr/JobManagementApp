import { useState, useEffect } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useReactTable, getCoreRowModel, flexRender, getFilteredRowModel, getPaginationRowModel,
    getFacetedRowModel,getFacetedUniqueValues,getFacetedMinMaxValues,
    Column, Table, ColumnDef, ColumnFiltersState } from '@tanstack/react-table'

const Dashboard = () => {

    const axiosPrivate = useAxiosPrivate()
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([])
    // const [invoices, setInvoices] = useState([])
    // const [bills, setBills] = useState([])
    const [data, setData] = useState([]);

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
                            amount
                            dateCreated
                        }
                        bills {
                            id
                            myobUid
                            number: invoiceNumber
                            amount
                            dateCreated: invoiceDate                            
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

                // Convert Dates & Add Tags
                for(let i = 0; i < res.invoices.length; i++) {
                    res.invoices[i]['dateIssued'] = res.invoices[i]['dateIssued'] ? new Date(res.invoices[i]['dateIssued']).toLocaleDateString('en-AU') : ""
                    res.invoices[i]['dateCreated'] = res.invoices[i]['dateCreated'] ? new Date(res.invoices[i]['dateCreated']).toLocaleDateString('en-AU') : ""
                    res.invoices[i]['datePaid'] = res.invoices[i]['datePaid'] ? new Date(res.invoices[i]['datePaid']).toLocaleDateString('en-AU') : ""
                }

                for(let i = 0; i < res.bills.length; i++) {
                    res.bills[i]['invoiceNumber'] = res.bills[i]['invoiceNumber'] ? res.bills[i]['invoiceNumber'] : ""
                    res.bills[i]['invoiceDate'] = res.bills[i]['invoiceDate'] ? new Date(res.bills[i]['invoiceDate']).toLocaleDateString('en-AU') : ""
                    res.bills[i]['processDate'] = res.bills[i]['processDate'] ? new Date(res.bills[i]['processDate']).toLocaleDateString('en-AU') : ""
                    res.bills[i]['amount'] = res.bills[i]['amount'] * -1
                }

                // setInvoices(res.invoices);
                // setBills(res.bills);
                setClients(res.clients);

                setData((res.invoices).concat(res.bills))
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
        
        </>
    )

}

export default Dashboard;