import React, { useState, useEffect, useMemo, useCallback }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { useReactTable, getCoreRowModel, flexRender, getFilteredRowModel, getPaginationRowModel,
    getFacetedRowModel,getFacetedUniqueValues,getFacetedMinMaxValues,
    Column, Table, ColumnDef, ColumnFiltersState } from '@tanstack/react-table'
import { Grid, Box, CircularProgress } from '@mui/material';
import fuzzyFilter from '../../components/FuzzyFilter';
import DebouncedInput from '../../components/DebouncedInput';
import { PaginationControls } from '../../components/Components';

const Bills = () => {
    
    const axiosPrivate = useAxiosPrivate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Keyboard shortcuts
    const handleKeyPress = useCallback((e: { code: string; metaKey: any; ctrlKey: any; preventDefault: () => void; }) => {
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
                        bills {
                            myobUid
                            id
                            invoiceNumber
                            amount
                            invoiceDate
                            job {
                            id
                            po
                            }
                            supplier {
                            id
                            name
                            }
                            processDate
                        }
                    }`,
                    variables: {}
                }),
            }).then((response) => {
                const res = response?.data?.data?.bills;

                for(let i = 0; i < res.length; i++) {
                    res[i]['invoiceNumber'] = res[i]['invoiceNumber'] ? res[i]['invoiceNumber'] : ""
                    res[i]['invoiceDate'] = res[i]['invoiceDate'] ? new Date(res[i]['invoiceDate']).toLocaleDateString('en-AU') : ""
                    res[i]['processDate'] = res[i]['processDate'] ? new Date(res[i]['processDate']).toLocaleDateString('en-AU') : ""
                }

                setData(res);
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

    type Bill = {
        id: string
        invoiceNumber: string
        amount: number
        invoiceDate: Date
        job: {
            id: string
            po: string
        }
        supplier: {
            id: string
            name: string
        }
        processDate: Date
        myobUid: String
    }


    // Table Columns
    const columns = useMemo<ColumnDef<Bill>[]>(() => [
        {
            id: 'supplier',
            accessorFn: row => row.supplier.name,
            header: () => 'Contractor',
            size: 350,
        },
        {
            id: 'job',
            accessorFn: row => "PO" + row.job.po,
            header: () => 'Job',
            size: 150,
        },
        {                
            accessorKey: 'invoiceNumber',
            header: () => 'Invoice Number',
            size: 150,
        },
        {                
            accessorKey: 'amount',
            header: () => 'Amount',
            cell: info => "$" + info.getValue(),
            size: 150,
        },
        {
            accessorKey: 'invoiceDate',
            header: () => 'Date',
            // cell: info => info.getValue() ? ,
            size: 150,
        },
        {
            accessorKey: 'processDate',
            header: () => 'Process Date',
            // cell: info => info.getValue() ? ,
            size: 150,
        },
        // {
        //     accessorKey: 'myobUid',
        //     header: () => 'MYOB',
        //     // cell: info => info.getValue() ? ,
        //     size: 300,
        // },
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

    return(<>
        <Grid container spacing={0} justifyContent="center" alignItems="center">
            <Grid item xs={12}>
                <DebouncedInput
                    value={globalFilter ?? ''}
                    onChange={(value: any) => setGlobalFilter(String(value))}
                    placeholder={`Search Bills... (${data.length})`}
                    style={{maxWidth: table.getTotalSize()}}
                />
            </Grid>
            <Grid item xs={12} style={{overflowX: 'auto', overflowY: 'hidden'}}>
                {loading ? 
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}}>
                        <CircularProgress />
                    </Box>
                    :
                    data && data.length > 0 ? <>
                        <table className="table" style={{width: table.getTotalSize(), maxWidth: '100%'}}>
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
    
export default Bills;