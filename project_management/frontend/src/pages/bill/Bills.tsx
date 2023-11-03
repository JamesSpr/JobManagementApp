import React, { useState, useEffect, useMemo, useCallback }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { ColumnDef, ColumnFiltersState } from '@tanstack/react-table'
import { Grid, Box, CircularProgress } from '@mui/material';
import { dateSort, fuzzyFilter, inDateRange } from '../../components/TableHelpers';
import DebouncedInput from '../../components/DebouncedInput';
import { Table } from '../../components/Components';

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
        const controller = new AbortController();

        const fetchData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `{ 
                        bills {
                            id
                            myobUid
                            amount
                            invoiceNumber
                            invoiceDate
                            processDate
                            thumbnailPath
                            billType
                            job {
                            id
                            po
                            }
                            supplier {
                            id
                            name
                            }
                        }
                    }`,
                    variables: {}
                }),
            }).then((response) => {
                const res = response?.data?.data?.bills;

                for(let i = 0; i < res.length; i++) {
                    res[i]['invoiceNumber'] = res[i]['invoiceNumber'] ? res[i]['invoiceNumber'] : ""
                    res[i]['invoiceDate'] = res[i]['invoiceDate'] ? new Date(res[i]['invoiceDate']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                    res[i]['processDate'] = res[i]['processDate'] ? new Date(res[i]['processDate']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
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
            accessorFn: row => row.job.po,
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
            filterFn: inDateRange,
            sortingFn: dateSort,
            size: 150,
        },
        {
            accessorKey: 'processDate',
            header: () => 'Process Date',
            filterFn: inDateRange,
            sortingFn: dateSort,
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

    return(<>
        <Grid container direction="column" alignItems="center">
            {loading ? 
                <Grid item xs={12}>
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingTop: '10px'}}>
                        <CircularProgress />
                    </Box>
                </Grid>
                :
                <>
                <Grid item xs={12}>
                    <DebouncedInput
                        value={globalFilter ?? ''}
                        onChange={(value: any) => setGlobalFilter(String(value))}
                        placeholder={`Search Bills... (${data.length})`}
                        style={{width: '1000px'}}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Table pagination data={data} columns={columns} 
                        columnFilters={columnFilters} setColumnFilters={setColumnFilters} 
                        globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                    />
                </Grid>   
                </>
        }
        </Grid>
    </>);
}
    
export default Bills;