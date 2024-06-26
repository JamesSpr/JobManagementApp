import { useState, useEffect, useMemo, useCallback }  from 'react';
import { ColumnDef, ColumnFiltersState  } from '@tanstack/react-table'
import { Grid } from '@mui/material';
import DebouncedInput from '../../components/DebouncedInput';
import { Table } from '../../components/Components';
import { InvoiceType } from '../../types/types';
import { defineJobIdentifier } from '../../components/Functions';
import { dateSort, inDateRange } from '../../components/TableHelpers';

const InvoiceList = ({invoices}: {
    invoices: InvoiceType[]
}) => {
    // Table Columns
    const columns = useMemo<ColumnDef<InvoiceType>[]>(() => [
        {                
            accessorFn: row => defineJobIdentifier(row.job),
            id: 'job',
            header: () => 'Job',
            size: 150,
        },
        {                
            accessorKey: 'number',
            header: () => 'Invoice',
            size: 150,
        },
        {                
            accessorKey: 'amount',
            header: () => 'Amount',
            cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue() as number),
            size: 150,
        },
        {
            accessorKey: 'dateCreated',
            header: () => 'Created',
            filterFn: inDateRange,
            sortingFn: dateSort,
            size: 150,
        },
        {
            accessorKey: 'dateIssued',
            header: () => 'Issued',
            filterFn: inDateRange,
            sortingFn: dateSort,
            size: 150,
        },
        {
            accessorKey: 'datePaid',
            header: () => 'Paid',
            filterFn: inDateRange,
            sortingFn: dateSort,
            size: 150,
        },
    ], []);

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState('')

    return(<>
        <Grid container spacing={1} justifyContent="center" alignItems="center">
            <Grid item xs={12}>
                <DebouncedInput
                    value={globalFilter ?? ''}
                    onChange={(value: any) => setGlobalFilter(String(value))}
                    placeholder={`Search Invoices... (${invoices.length})`}
                    style={{maxWidth: '40%'}}
                />
            </Grid>
            <Grid item xs={12} style={{overflowX: 'auto', overflowY: 'hidden'}}>
                { invoices && invoices.length > 0 ? <>
                        <Table pagination data={invoices}
                            columns={columns}
                            columnFilters={columnFilters} setColumnFilters={setColumnFilters} 
                            globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                        />
                    </>
                    : <>
                        <p>No Invoices Found</p>
                    </>
                }
            </Grid>   
        </Grid>

        {/* Footer AppBar with Controls */}
        {/* <Footer>
            <Button variant="outlined" onClick={e => setRemittanceAdvice(true)}>Remittance Advice</Button>
        </Footer> */}       
    
    </>);
}

export default InvoiceList;