import { useState, useEffect, useMemo } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useReactTable, getCoreRowModel, flexRender, getFilteredRowModel, getPaginationRowModel,
    getFacetedRowModel,getFacetedUniqueValues,getFacetedMinMaxValues,
    Column, Table, ColumnDef, ColumnFiltersState } from '@tanstack/react-table'

import { Chart as ChartJS, LinearScale, CategoryScale, BarElement, PointElement, LineElement, Legend, Tooltip, LineController, BarController, } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { Button, Grid } from "@mui/material";
import { InputField, PaginationControls } from "../../components/Components";
import { TableFilter } from "../../components/FuzzyFilter";
import { HTMLElementChange } from "../../types/types";

interface chartData {
    id: string,
    myobUid: string,
    number: string,
    amount: string,
    dateCreated: Date,
}

const Dashboard = () => {

    const axiosPrivate = useAxiosPrivate();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [data, setData] = useState<chartData[]>([]);

    const [chartIncome, setChartIncome] = useState([0.0])
    const [chartBills, setChartBills] = useState([0.0])
    const [chartRunningTotal, setChartRunningTotal] = useState([0.0])

    interface FilterParameters {
        start: string
        end: string
        frequency: number
    }
    const [filterParams, setFilterParams] = useState<FilterParameters>({start: '', end:'', frequency:1})
    const [labels, setLabels] = useState<string[]>([])

    const [bills, setBills] = useState<chartData[]>([{id: '', myobUid:'', number: '', amount: '', dateCreated: new Date()}]);
    const [invoices, setInvoices] = useState<chartData[]>([{id: '', myobUid:'', number: '', amount: '', dateCreated: new Date()}]);
    const [runningTotal, setRunningTotal] = useState([0.0]);

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
                    res.invoices[i]['dateCreated'] = res.invoices[i]['dateCreated'] ? new Date(res.invoices[i]['dateCreated']) : ""
                    // if(res.invoices[i]['dateCreated']) {
                    //     res.invoices[i]['dateCreated'] = new Date(res.invoices[i]['dateCreated'])
                    // } else {
                    //     res.invoices.splice(i, 1)
                    // }
                }

                for(let i = 0; i < res.bills.length; i++) {
                    res.bills[i]['dateCreated'] = res.bills[i]['dateCreated'] ? new Date(res.bills[i]['dateCreated']) : ""
                }

                setClients(res.clients);

                setData((res.invoices).concat(res.bills))
                setBills(res.bills);
                setInvoices(res.invoices);

                const minDate = new Date(Math.min(...((res.invoices).concat(res.bills)).map((element: chartData) => (new Date(element.dateCreated))))).toISOString().split("T")[0]
                const maxDate = new Date(Math.max(...((res.invoices).concat(res.bills)).map((element: chartData) => (new Date(element.dateCreated))))).toISOString().split("T")[0]
                setFilterParams({start: minDate, end: maxDate, frequency: 1})

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


    const getFilterFrequency = () => {
        const d1 = new Date(filterParams.start)
        const d2 = new Date(filterParams.end)

        if(filterParams.frequency == 4) {
            return Math.round(((d2.getTime() - d1.getTime()) / (7 * 24 * 60 * 60 * 1000)));
        }
        // if(filterParams.frequency == 2) {
        //     return Math.round((d2.getTime() - d1.getTime()) / (2 * 7 * 24 * 60 * 60 * 1000));
        // }
        if(filterParams.frequency == 1) {
            return d2.getMonth() - d1.getMonth() + (12* (d2.getFullYear() - d1.getFullYear())) + 1
            // return ((d2.getFullYear() - d1.getFullYear()) * 12 - d1.getMonth() + d2.getMonth());
        }

        return 0
    }

    const updateChartData = () => {

        const frequency = getFilterFrequency();

        let billData = Array(frequency).fill(0.0);
        let invoiceData = Array(frequency).fill(0.0);
        let runningData = Array(frequency).fill(0.0);
        
        const monthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        setData([]);
        setLabels([])

        // Build the chart labels based on the frequency
        let labelCounter = Math.floor(new Date(filterParams.start).getMonth() * filterParams.frequency);
        let labels = []
        for(let i = 0; i < frequency; i++) {
            if(Math.floor(labelCounter/filterParams.frequency) > 11) {
                labelCounter = 0
            }
            labels.push(monthLabels[Math.floor(labelCounter/filterParams.frequency)])
            labelCounter ++;
        }

        const startYear = new Date(filterParams.start).getFullYear()
        const startMonth = new Date(filterParams.start).getMonth()
        for(let i = 0; i < invoices.length; i++) {
            if(invoices[i]['dateCreated'] >= new Date(filterParams.start) && invoices[i]['dateCreated'] <= new Date(filterParams.end)) {
                // console.log("Invoice", invoiceData, invoices[i]['dateCreated'].getMonth() - startMonth + (invoices[i]['dateCreated'].getFullYear() - startYear) * 12, parseFloat(invoices[i]['amount']))
                invoiceData[(invoices[i]['dateCreated'].getMonth() - startMonth) + ((invoices[i]['dateCreated'].getFullYear() - startYear) * 12)] += parseFloat(invoices[i]['amount'])
                setData(prev => [...prev, invoices[i]]);
            }
        }
        
        for(let i = 0; i < bills.length; i++) {
            if(bills[i]['dateCreated'] >= new Date(filterParams.start) && bills[i]['dateCreated'] <= new Date(filterParams.end)) {
                billData[(bills[i]['dateCreated'].getMonth() - startMonth) + ((bills[i]['dateCreated'].getFullYear() - startYear) * 12)] -= parseFloat(bills[i]['amount'])
                setData(prev => [...prev, bills[i]]);
            }
        }

        for(let i = 0; i < frequency; i++) {
            if(i > 0) {
                runningData[i] = runningData[i-1] + (invoiceData[i] + billData[i])
            }
            else {
                runningData[i] = (invoiceData[i] + billData[i])
            }
        }

        setChartData({
            labels,
            datasets: [
                {
                  type: 'line' as const,
                  label: 'Running Total',
                  borderColor: 'rgb(255, 99, 132)',
                  borderWidth: 2,
                  fill: false,
                  data: runningData,
                },
                {
                  type: 'bar' as const,
                  label: 'Income',
                  backgroundColor: 'rgb(75, 192, 192)',
                  data: invoiceData,
                  borderColor: 'white',
                  borderWidth: 2,
                },
                {
                  type: 'bar' as const,
                  label: 'Outgoing',
                  backgroundColor: 'rgb(53, 162, 235)',
                  data: billData,
                },
            ],
        })
    }

    function Table ({data, columns}: {data: chartData[], columns: ColumnDef<chartData>[]}) {
        const table = useReactTable({
            data,
            columns,
            // Pipeline
            getCoreRowModel: getCoreRowModel(),
            getFilteredRowModel: getFilteredRowModel(),
            getPaginationRowModel: getPaginationRowModel(),
        })

        return (
            <>
                <table>
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} >
                            {headerGroup.headers.map(header => {
                                return (
                                <th key={header.id} colSpan={header.colSpan} style={{padding: '0 20px'}}>
                                    {header.isPlaceholder ? null : (
                                    <div>
                                        {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                        )}
                                    </div>
                                    )}
                                </th>
                                )
                            })}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => {
                            return (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => {
                                return (
                                    <td key={cell.id}>
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                    </td>
                                )
                                })}
                            </tr>
                            )
                        })}
                    </tbody>
                </table>
                
                <PaginationControls table={table} />
            </>
        )
    }


    ChartJS.register(
        LinearScale,
        CategoryScale,
        BarElement,
        PointElement,
        LineElement,
        Legend,
        Tooltip,
        LineController,
        BarController
    );

    const [chartData, setChartData] = useState({
        labels,
        datasets: [
            {
              type: 'line' as const,
              label: 'Running Total',
              borderColor: 'rgb(255, 99, 132)',
              borderWidth: 2,
              fill: false,
              data: chartRunningTotal,
            },
            {
              type: 'bar' as const,
              label: 'Income',
              backgroundColor: 'rgb(75, 192, 192)',
              data: chartIncome,
              borderColor: 'white',
              borderWidth: 2,
            },
            {
              type: 'bar' as const,
              label: 'Outgoing',
              backgroundColor: 'rgb(53, 162, 235)',
              data: chartBills,
            },
        ],
    })


    const columns = useMemo<ColumnDef<chartData>[]>(() => [
        {
            accessorKey: 'number',
            header: () => "Number",
            cell: info => info.getValue(),
        },
        {
            accessorKey: 'amount',
            header: () => "Amount",
            cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue()),
            footer: props => props.column.id,
        },
        {
            accessorKey: 'dateCreated',
            header: () => "Date",
            cell: info => info.getValue().toDateString(),
        },
    ], [] )
    

    return ( 
        <>
            {!loading &&
            <>
                <Grid container spacing={1} 
                    alignItems="center" 
                    justifyContent="center"
                    alignContent="center"
                    textAlign="center"
                    direction="column"
                >
                    <Grid item xs={12}>
                        <h2>Maintenance Analytics</h2>
                    </Grid>
                    <Grid item xs={12}>
                        <h4>Filters</h4>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField type="select" label="Frequency" value={filterParams?.frequency} onChange={(e: React.ChangeEvent<HTMLElementChange>) => setFilterParams(prev => ({...prev, frequency: e.target.value as unknown as number}))}>
                            <option key={0} value={1}>Monthly</option>
                            <option key={1} value={4}>Weekly</option>
                        </InputField>
                        <InputField type="date" label="Filter Start Date" value={filterParams?.start} onChange={(e: React.ChangeEvent<HTMLElementChange>) => setFilterParams(prev => ({...prev, start: e.target.value}))}> </InputField>
                        <InputField type="date" label="Filter End Date"  value={filterParams?.end} onChange={(e: React.ChangeEvent<HTMLElementChange>) => setFilterParams(prev => ({...prev, end: e.target.value}))}> </InputField>
                        <Button variant="outlined" onClick={updateChartData}>Update Chart</Button>
                    </Grid>
                    <div style={{ position: "relative", margin: "auto", width: "60vw" }}>
                        <Chart type='bar' data={chartData} style={{height: '100%', width: '100%'}}/>
                    </div>
                    <Grid item xs={12}>
                        <Table {...{data, columns}} />
                    </Grid>
                </Grid>
            </>
            }
        </>
    )

}

export default Dashboard;