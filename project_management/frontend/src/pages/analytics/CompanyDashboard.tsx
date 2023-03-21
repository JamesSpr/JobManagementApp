import { useState, useEffect } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useReactTable, getCoreRowModel, flexRender, getFilteredRowModel, getPaginationRowModel,
    getFacetedRowModel,getFacetedUniqueValues,getFacetedMinMaxValues,
    Column, Table, ColumnDef, ColumnFiltersState } from '@tanstack/react-table'


    
const CompanyDashboard = () => {

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
                        getAccounts {

                        }
                    }`,
                    variables: {}
                }),
            }).then((response) => {
                const res = response?.data?.data;


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

export default CompanyDashboard;