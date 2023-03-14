import React, { useState, useEffect, useMemo, useCallback }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { useReactTable, getCoreRowModel, flexRender, getFilteredRowModel, getPaginationRowModel,
    getFacetedRowModel,getFacetedUniqueValues,getFacetedMinMaxValues,
    Column, Table, ColumnDef, ColumnFiltersState  } from '@tanstack/react-table'
import { Grid, Box, AppBar, Toolbar, CircularProgress, Button } from '@mui/material';
import fuzzyFilter from '../../components/FuzzyFilter';
import DebouncedInput from '../../components/DebouncedInput';
import useAuth from '../auth/useAuth';
import RemittanceAdvice from './RemittanceAdvice'
import { PaginationControls } from '../../components/Components';

const Invoices = () => {

    // const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const [data, setData] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [remittanceAdvice, setRemittanceAdvice] = useState(false);

    // Navigation Blocker
    // usePrompt('You have unsaved changes. Are you sure you want to leave?', updateRequired && !loading);

    // Keyboard shortcuts
    const handleKeyPress = useCallback((e) => {
        if (e.code === 'KeyS' && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
            e.preventDefault();
            // console.log(saveCommand)
            // if(!saveCommand) {
                
            //     console.log("Updating")
            //     saveCommand = true;
            //     handleUploadChanges();
            // }
        }
    }, [])

    useEffect(() => {
        // Attach event listener
        document.addEventListener('keydown', handleKeyPress);
        
        // Remove event listener
        return () => {
            document.addEventListener('keydown', handleKeyPress)
        }

    }, [handleKeyPress]);

    // Get Data
    useEffect(() => {
        // Set Default Page Size
        table.getState().pagination.pageSize = 30;
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

                for(let i = 0; i < res.length; i++) {
                    res.invoices[i]['dateIssued'] = res.invoices[i]['dateIssued'] ? new Date(res.invoices[i]['dateIssued']).toLocaleDateString('en-AU') : ""
                    res.invoices[i]['dateCreated'] = res.invoices[i]['dateCreated'] ? new Date(res.invoices[i]['dateCreated']).toLocaleDateString('en-AU') : ""
                    res.invoices[i]['datePaid'] = res.invoices[i]['datePaid'] ? new Date(res.invoices[i]['datePaid']).toLocaleDateString('en-AU') : ""
                }

                setData(res.invoices);
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

    type Invoice = {
        id: string
        myobUid: string
        number: string
        amount: number
        dateCreated: Date
        dateIssued: Date
        datePaid: Date
    }


    // Table Columns
    const columns = useMemo<ColumnDef<Invoice>[]>(() => [
        {                
            accessorKey: 'number',
            header: () => 'Invoice',
            size: 150,
        },
        {                
            accessorKey: 'amount',
            header: () => 'Amount',
            cell: info => "$" + info.getValue(),
            size: 150,
        },
        {
            accessorKey: 'dateCreated',
            header: () => 'Created',
            size: 150,
        },
        {
            accessorKey: 'dateIssued',
            header: () => 'Issued',
            size: 150,
        },
        {
            accessorKey: 'datePaid',
            header: () => 'Paid',
            size: 150,
        },
    ], []);

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),   
        getPaginationRowModel: getPaginationRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues(),
        globalFilterFn: fuzzyFilter,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        state: {
            columnFilters,
            globalFilter,
        },
    });  

    // Dialog Controls
    const handleDialogClose = (event: { target: { name: string; }; }, reason: string, updatedInvoices: any[]) => {
        if(event.target.name === "submit") {
            // Update table with new remittance advice
            data.map((inv: {id: string}) => updatedInvoices.find((updated: { id: string; }) => updated.id === inv.id) || inv)
        }
        setRemittanceAdvice(false);
    }

    return(<>
        <Grid container spacing={1} justifyContent="center" alignItems="center">
            <Grid item xs={12}>
                <DebouncedInput
                    value={globalFilter ?? ''}
                    onChange={(value: any) => setGlobalFilter(String(value))}
                    placeholder={`Search Invoices... (${data.length})`}
                    style={{maxWidth: table.getTotalSize()}}
                />
            </Grid>
            <Grid item xs={12} style={{overflowX: 'auto', overflowY: 'hidden'}}>
                {loading ? 
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}} >
                        <CircularProgress />
                    </Box>
                    :
                    data && data.length > 0 ? <>
                        <table className="table" style={{width: table.getTotalSize()}}>
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
                                                        {header.column.getCanFilter() ? (
                                                        <div>
                                                            <Filter column={header.column} table={table} />
                                                        </div>
                                                        ) : null}
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
                        </table>
                        <Grid item xs={12}>
                            <PaginationControls table={table}/>
                        </Grid>  
                    </>
                    : <>
                        <p>No Invoices Found</p>
                    </>
                }
            </Grid>   
        </Grid>

        {/* Footer AppBar with Controls */}
        <Box sx={{ flexGrow: 1}}>
            <AppBar position="fixed" sx={{ top:'auto', bottom: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }}
            style={{height: '50px', backgroundColor: 'rgb(250,250,250)', boxShadow: 'rgb(0 0 0 / 10%) 0px 1px 1px -1px, rgb(0 0 0 / 10%) 0px 1px 1px 0px, rgb(0 0 0 / 10%) 0px 0 10px 2px'}}>
                <Toolbar style={{minHeight: '50px'}}>
                    <Box style={{margin: '0 auto'}}>
                        <Button variant="outlined" onClick={e => setRemittanceAdvice(true)}>Remittance Advice</Button>
                    </Box>
                </Toolbar>
            </AppBar>
        </Box>

        <RemittanceAdvice open={remittanceAdvice} onClose={handleDialogClose} invoices={data} clients={clients}/>
    
    </>);
}


const Filter = ({ column,table }: { column: Column<any>, table: Table<any> }) => {
    const firstValue = table.getPreFilteredRowModel().flatRows[0]?.getValue(column.id)
    const columnFilterValue = column.getFilterValue()
    const sortedUniqueValues = useMemo(
      () =>
        typeof firstValue === 'number'
          ? []
          : Array.from(column.getFacetedUniqueValues().keys()).sort(),
      [column.getFacetedUniqueValues()]
    )

    switch(typeof firstValue) {
        case "number":
            return (
                <div>
                    <div className="flex space-x-2">
                        <DebouncedInput
                        type="number"
                        min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
                        max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
                        value={(columnFilterValue as [number, number])?.[0] ?? ''}
                        onChange={(value: any) =>
                            column.setFilterValue((old: [number, number]) => [value, old?.[1]])
                        }
                        placeholder={`Min ${
                            column.getFacetedMinMaxValues()?.[0]
                            ? `(${column.getFacetedMinMaxValues()?.[0]})`
                            : ''
                        }`}
                        className="w-24 border shadow rounded"
                        />
                        <DebouncedInput
                        type="number"
                        min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
                        max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
                        value={(columnFilterValue as [number, number])?.[1] ?? ''}
                        onChange={(value: any) =>
                            column.setFilterValue((old: [number, number]) => [old?.[0], value])
                        }
                        placeholder={`Max ${
                            column.getFacetedMinMaxValues()?.[1]
                            ? `(${column.getFacetedMinMaxValues()?.[1]})`
                            : ''
                        }`}
                        className="w-24 border shadow rounded"
                        />
                    </div>
                    <div className="h-1" />
                </div>
            )
            default:
                return (<>
                    <datalist id={column.id + 'list'}>
                        {sortedUniqueValues.slice(0, 5000).map((value: any) => (
                        <option value={value} key={value} />
                        ))}
                    </datalist>
                    <DebouncedInput
                        type="text"
                        value={(columnFilterValue ?? '') as string}
                        onChange={(value: any) => column.setFilterValue(value)}
                        placeholder={`Search... (${column.getFacetedUniqueValues().size})`}
                        className="w-36 border shadow rounded"
                        list={column.id + 'list'}
                    />
                    <div className="h-1" />
                </>)
    }
}

export default Invoices;