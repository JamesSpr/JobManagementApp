import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, 
    getFacetedRowModel, getFacetedUniqueValues, getFacetedMinMaxValues, getSortedRowModel, 
    ColumnDef, Column, ColumnFiltersState, Table as ReactTable, Row, Cell } from '@tanstack/react-table'

import DebouncedInput from "../../components/DebouncedInput";

import { Button, CircularProgress, Box, Grid, IconButton, FormGroup, FormControlLabel, Checkbox, 
    Dialog, DialogTitle, DialogContent, Typography } from '@mui/material';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RefreshIcon from '@mui/icons-material/Refresh';

import CloseIcon from '@mui/icons-material/Close';
import { fuzzyFilter, dateSort, inDateRange } from '../../components/TableHelpers';
import { SnackBar, Table, Tooltip } from '../../components/Components';
import { fetchArchivedData } from './QueryData';
import JobAllocator from './JobAllocator';
import { defineJobIdentifier, openInNewTab } from '../../components/Functions';
import { EmployeeType, JobStageType, JobType, SnackType } from '../../types/types';

const JobTable = ({tableData, setRefreshTableData, users, jobStages}: {
    tableData: JobType[],
    setRefreshTableData: React.Dispatch<React.SetStateAction<boolean>>,
    users: EmployeeType[],
    jobStages: JobStageType[]
}) => {

    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();
    
    const [data, setData] = useState<JobType[]>([]);
    const [rowSelection, setRowSelection] = useState({});
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([{"id": "id", "desc": true}]);
    const [columnVisibility, setColumnVisibility] = useState({
        'id': false, 'client': true, 'jobNumber':true, 
        'po': false, 'sr': false, 'otherId': false, 
        'location': true, 'building': true, 'title': true, 
        'dateIssued': true, 'priority': true, 'overdueDate': true, 'stage': true, 
        'issueDate': false, 'quotedPrice': false, 'approvalDate': false, 'approvedQuote': false, 'approvedPrice': false, 
        'inspectionDate': false, 'commencementDate': false, 'completionDate': false, 'closeOutDate': false,
        'invoice': false, 'invoiceCreatedDate': false,  'invoiceDate': false, 'billSum': false, 'grossProfit': false, 
        'region': false, 'detailedLocation': false, 'description': false
    });
    const [showFooter, setShowFooter] = useState(false);
    const [allData, setAllData] = useState(false);

    const [waiting, setWaiting] = useState(false);
    const [snack, setSnack] = useState<SnackType>({active: false, variant: 'info', message: ''});

    useEffect(() => {
        setData(tableData);
    }, [tableData])

    useEffect(() => {
        // Set Default Page Size
        table.getState().pagination.pageSize = 20;
    }, [])

    const getAllData = async () => {
        if(allData === false) {
            setWaiting(true);
            await axiosPrivate({
                method: 'post',
                data: fetchArchivedData(),
            }).then((response) => {
                const res = response?.data?.data?.archivedJobs;
                setWaiting(false);

                if(res.edges.length > 0) {
                    for(let i = 0; i < res.edges.length; i++) {
                        res.edges[i].node['dateIssued'] = res.edges[i].node['dateIssued'] ? new Date(res.edges[i].node['dateIssued']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                        res.edges[i].node['overdueDate'] = res.edges[i].node['overdueDate'] ? new Date(res.edges[i].node['overdueDate']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                        res.edges[i].node['commencementDate'] = res.edges[i].node['commencementDate'] ? new Date(res.edges[i].node['commencementDate']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                        res.edges[i].node['completionDate'] = res.edges[i].node['completionDate'] ? new Date(res.edges[i].node['completionDate']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                        res.edges[i].node['inspectionDate'] = res.edges[i].node['inspectionDate'] ? new Date(res.edges[i].node['inspectionDate']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                        res.edges[i].node['closeOutDate'] = res.edges[i].node['closeOutDate'] ? new Date(res.edges[i].node['closeOutDate']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                        res.edges[i].node['estimateSet']['issueDate'] = res.edges[i].node['estimateSet']['issueDate'] ? new Date(res.edges[i].node['estimateSet']['issueDate']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                        res.edges[i].node['estimateSet']['approvalDate'] = res.edges[i].node['estimateSet']['approvalDate'] ? new Date(res.edges[i].node['estimateSet']['approvalDate']).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                       
                        if(res.edges[i].node['invoiceSet'].length > 0) {
                            res.edges[i].node['invoiceSet'][0]['dateCreated'] = res.edges[i].node['invoiceSet'][0]?.dateCreated ? new Date(res.edges[i].node['invoiceSet'][0]?.dateCreated).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                            res.edges[i].node['invoiceSet'][0]['dateIssued'] = res.edges[i].node['invoiceSet'][0]?.dateIssued ? new Date(res.edges[i].node['invoiceSet'][0]?.dateIssued).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                            res.edges[i].node['invoiceSet'][0]['datePaid'] = res.edges[i].node['invoiceSet'][0]?.datePaid ? new Date(res.edges[i].node['invoiceSet'][0]?.datePaid).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : ""
                        }
                    }

                    setAllData(true);
                    setData(prev => ([...prev, ...res?.edges?.map((job: { node: JobType; }) => job.node)]));
                }
            }).catch((err) => {
                console.log("Error:", err);
                setSnack({active: true, variant: 'error', message: "Error fetching archived data. Try again or Contact Developer."})
            });
        }
    }

    const footerCounts = (column: Column<JobType>) => {
        return column.getFacetedUniqueValues().size
    }

    const footerSum = (table: ReactTable<JobType>, column: Column<JobType>) => {
        let sum = 0.0
      
        for(var i = 0; i < table.getFilteredRowModel().flatRows.length; i++) {
            sum += Number(table.getFilteredRowModel().flatRows[i].getValue(column.id))
        }
        return sum
    }

    // Table Columns
    const columns = useMemo<ColumnDef<JobType>[]>(() => [
        {
            accessorKey: 'id',
            header: () => 'ID',
            cell: info => info.getValue(),
            footer: '',
            size: 50,
        },
        {                
            accessorFn: row => {
                if(row.client?.displayName){ 
                    return row.client?.displayName
                } 
                if(row.client?.name){
                    return row.client?.name
                }

                return "";
            },
            id: 'client',
            header: () => 'Client',
            cell: info => info.getValue(),
            footer: '',
            size: 125,
        },
        {                
            accessorFn: row => defineJobIdentifier(row),
            id: 'jobNumber',
            header: () => 'Job Number',
            cell: info => info.getValue(),
            footer: ({column}) => footerCounts(column),
            size: 120,
        },
        {
            accessorFn: row => row.po ? "PO" + row.po : ' ',
            id: 'po',
            header: () => 'PO',
            footer: '',
            size: 100,
        },
        {
            accessorFn: row => row.sr ? "SR" + row.sr : ' ',
            id: 'sr',
            header: () => 'SR',
            footer: '',
            size: 100,
        },
        {
            accessorKey: 'otherId',
            header: () => 'Other',
            footer: '',
            size: 100,
        },
        {
            accessorFn: row => row.location?.name ?? '',
            id: 'location',
            header: () => 'Location',
            cell: info => info.getValue(),
            footer: '',
            size: 180,
        },
        {
            accessorKey: 'building',
            header: () => 'Building',
            footer: '',
            size: 160,
        },
        {
            accessorKey: 'title',
            header: () => 'Title',
            enableSorting: false,
            footer: '',
            size: 350,
        },
        {
            accessorKey: 'dateIssued',
            id: 'dateIssued',
            header: () => 'Issue Date',
            filterFn: inDateRange,
            sortingFn: dateSort,
            footer: ({column}) => footerCounts(column),
            size: 100,
        },
        {
            accessorKey: 'priority',
            header: () => 'Priority',
            footer: '',
            size: 70,
        },
        {
            accessorKey: 'overdueDate',
            id: 'overdueDate',
            header: () => 'Overdue Date',
            filterFn: inDateRange,
            sortingFn: dateSort,
            footer: props => footerCounts(props.column),
            size: 125,
        },
        {
            accessorKey: 'detailedLocation',
            header: () => 'Detailed Location',
            footer: '',
            size: 200,
        },
        {
            accessorKey: 'description',
            header: () => 'Description',
            footer: '',
            size: 500,
        },
        {
            accessorKey: 'stage',
            header: () => 'Status',
            cell: info => (
                <Tooltip title={table?.options?.meta?.getStageDescription?.(info.getValue() as string) ?? ""}>{info.getValue() as string}</Tooltip>
            ), 
            footer: '',
            size: 80,
        },
        {
            accessorFn: row => row.estimateSet ? row?.estimateSet[row?.estimateSet?.findIndex(element => {
                if(element.issueDate) {
                    return true;
                }
                return false;
            })]?.issueDate ?? "" : "",
            id: 'issueDate',
            header: () => 'Date Quote Sent',
            cell: info => info.getValue(),
            size: 140,
        },
        {
            accessorFn: row => row.estimateSet ? row?.estimateSet[row?.estimateSet?.findIndex(element => {
                if(element.issueDate) {
                    return true;
                }
                return false;
            })]?.price ?? "" : "",
            id: 'quotedPrice',
            header: () => 'Quoted Price',
            cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue() as number),
            footer: ({table, column}) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(footerSum(table, column)),
            size: 140,
        },
        {
            accessorFn: row => row.estimateSet ? row?.estimateSet[row?.estimateSet?.findIndex(element => {
                if(element.approvalDate) {
                    return true;
                }
                return false;
            })]?.name ?? "" : "",
            id: 'approvedQuote',
            header: () => 'Approved Quote',
            cell: info => info.getValue(),
            size: 140,
        },
        {
            accessorFn: row => row.estimateSet ? row?.estimateSet[row?.estimateSet?.findIndex(element => {
                if(element.approvalDate) {
                    return true;
                }
                return false;
            })]?.approvalDate ?? "" : "",
            id: 'approvalDate',
            header: () => 'Approval Date',
            cell: info => info.getValue(),
            filterFn: inDateRange,
            sortingFn: dateSort,
            size: 140,
        },
        {
            accessorFn: row => row.estimateSet ? row?.estimateSet[row?.estimateSet?.findIndex(element => {
                if(element.approvalDate) {
                    return true;
                }
                return false;
            })]?.price ?? "" : "",
            id: 'approvedPrice',
            header: () => 'Approved Price',
            cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue() as number),
            footer: ({table, column}) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(footerSum(table, column)),
            size: 140,
        },
        {
            accessorKey: 'inspectionDate',
            header: () => 'Inspection Date',
            cell: info => info.getValue(),
            filterFn: inDateRange,
            sortingFn: dateSort,
            size: 120,
        },
        {
            accessorKey: 'commencementDate',
            header: () => 'Start Date',
            cell: info => info.getValue(),
            filterFn: inDateRange,
            sortingFn: dateSort,
            size: 120,
        },
        {
            accessorKey: 'completionDate',
            header: () => 'Finish Date',
            cell: info => info.getValue(),
            filterFn: inDateRange,
            sortingFn: dateSort,
            size: 120,
        },
        {
            accessorKey: 'closeOutDate',
            header: () => 'Close Out Date',
            cell: info => info.getValue(),
            filterFn: inDateRange,
            sortingFn: dateSort,
            size: 120,
        },
        {
            accessorFn: row => (row?.billSet?.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0) / 1.1) ?? 0,
            id: 'billSum',
            header: () => 'Bill Amount',
            cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue() as number),
            footer: ({table, column}) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(footerSum(table, column)),
            size: 120,
        },
        {
            accessorFn: row => ['FIN', 'INV', 'PAY', 'BSA'].includes(row?.stage) ? 
                (row?.estimateSet[row?.estimateSet?.findIndex(element => element?.approvalDate)]?.price ?? 0) - ((row?.billSet?.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0) / 1.1) ?? 0) 
                : 0,
            id: 'grossProfit',
            header: () => 'Gross Profit',
            cell: info => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(info.getValue() as number),
            footer: ({table, column}) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(footerSum(table, column)),
            size: 120,
        },
        {
            accessorFn: row => row?.invoiceSet?.[0]?.number ?? "",
            id: 'invoice',
            header: () => 'Invoice #',
            cell: info => info.getValue(),
            footer: '',
            size: 90,
        },
        {
            accessorFn: row => row.invoiceSet?.[0]?.dateCreated ?? "",
            id: 'invoiceCreatedDate',
            header: () => 'Invoice Created',
            filterFn: inDateRange,
            sortingFn: dateSort,
            footer: props => footerCounts(props.column),
            size: 130,
        },
        {
            accessorFn: row => row.invoiceSet?.[0]?.dateIssued ?? "",
            id: 'invoiceDate',
            header: () => 'Invoice Sent',
            filterFn: inDateRange,
            sortingFn: dateSort,
            footer: props => footerCounts(props.column),
            size: 115,
        },
        {
            accessorFn: row => row.location?.region?.shortName ?? '',
            id: "region",
            header: () => 'Region',
            cell: info => info.getValue(),
            footer: '',
            size: 70,
        },
    ], []);

    const table = useReactTable({
        data,
        columns,
        state: {
            rowSelection,
            columnFilters,
            globalFilter,
            columnVisibility,
            sorting,
        },
        onRowSelectionChange: setRowSelection,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues(),
        globalFilterFn: fuzzyFilter,
        enableMultiRowSelection: false,  
        enableMultiSort: true,
        
    });

    const tableMeta = {
        getStageDescription: (value: string) => {
            let description = ""
            jobStages.map(stage => (
                stage['name'] === value ? description = stage['description'] : ""
            ))
            return description;
        }
    }

    const handleOpenSelected = () => {
        for(var row in rowSelection) {
            const rowData = table.getRowModel().rowsById[row].original;
            openInNewTab("/job/edit/" + defineJobIdentifier(rowData));
        }
    }

    const handleOpenSelectedBSAFE = () => {
        for(var row in rowSelection) {
            const rowData = table.getRowModel().rowsById[row].original;
            if(rowData.bsafeLink) {
                openInNewTab(rowData.bsafeLink);
                return;
            } 
        }
        setSnack({active: true, variant: 'error', message: 'Job does not have a BSAFE Link'})
    }

    const [openSettings, setOpenSettings] = useState(false);
    const [openEmailOptions, setOpenEmailOptions] = useState(false);

    const handleCloseSettings = () => {
        if(!waiting) {
            setOpenSettings(false);
        }
    }

    return (
        <>
            <Grid container spacing={1} direction={'column'} alignItems="center">
                <Grid item xs={12} style={{width: table.getTotalSize()}} textAlign={'center'}>
                        <DebouncedInput 
                            value={globalFilter ?? ''}
                            onChange={(value: any) => setGlobalFilter(String(value))}
                            placeholder="Search All Jobs"
                            style={{display:'inline-block', width: '80%', maxWidth: '1200px'}}
                        />

                        <IconButton onClick={() => setOpenSettings(true)}>
                            <FilterAltIcon />
                        </IconButton>

                        <IconButton onClick={() => setRefreshTableData(true)}>
                            <RefreshIcon />
                        </IconButton>
                </Grid>
                {data && data.length > 0 ? 
                    <Grid item xs={12} style={{overflowX: 'auto', overflowY: 'hidden'}}>
                        <Table data={data} columns={columns} tableMeta={tableMeta} 
                            rowOnDoubleClick={(row) => navigate("/job/edit/" + defineJobIdentifier(row.original))}
                            rowSelection={rowSelection} setRowSelection={setRowSelection}
                            columnFilters={columnFilters} setColumnFilters={setColumnFilters}
                            globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                            sorting={sorting} setSorting={setSorting}
                            columnVisibility={columnVisibility}
                            pagination={true}
                            showFooter={showFooter}
                        />
                    </Grid>
                
                : <CircularProgress />
            }

                <Grid item xs={12}>
                    <Button
                        variant='outlined'
                        onClick={() => setSorting([{"id": "id", "desc": true}])}
                    >
                        Reset Sort
                    </Button>

                    <Button 
                        variant="outlined"
                        sx={{margin: '0px 5px 0px 5px'}}
                        onClick={() => setOpenEmailOptions(true)}
                    >
                        Email Job Details
                    </Button>

                    <Button 
                        variant="outlined"
                        sx={{margin: '0px 5px 0px 5px'}}
                        onClick={handleOpenSelectedBSAFE}
                    >
                        Open BSAFE
                    </Button>

                    <Button
                        variant='outlined'
                        onClick={handleOpenSelected}
                    >
                        Open Selected Jobs
                    </Button>
                    
                    {/* {auth?.user.role === "DEV" ? 
                    <Box>
                        <Button
                            variant='outlined'
                            onClick={() => setColumnFilters([{"id": "location", "value": ["RAAF Richmond", "RAAF Glenbrook"]}])}
                        >
                            Filter Test
                        </Button>
                    </Box>
                    : <></>} */}
                </Grid>
            

            </Grid>

            <SnackBar snack={snack} setSnack={setSnack} />

            {/* Settings Dialog */}
            <Dialog open={openSettings} onClose={handleCloseSettings} maxWidth='lg'>
                <DialogTitle>
                    <Typography sx={{textAlign: 'center'}}>Table Settings</Typography>
                    <IconButton
                        aria-label="close"
                        onClick={handleCloseSettings}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            marginTop: '4px',
                            color: (theme) => theme.palette.grey[500],
                        }}
                        >
                        <CloseIcon/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <FormGroup sx={{marginTop: '5px', marginBottom: '20px'}}>
                        <Grid container>
                            <Grid item xs={12} >
                                {waiting && (
                                    <CircularProgress size={24} 
                                        sx={{
                                            colour: 'primary',
                                            position: 'relative',
                                            top: '7px',
                                            marginRight: '10px',
                                        }}
                                    />
                                )}
                                <FormControlLabel control={
                                    <Checkbox checked={allData} onChange={getAllData}/>
                                } label="Show Archived Jobs" />
                                <FormControlLabel control={
                                    <Checkbox checked={showFooter} onChange={() => setShowFooter(!showFooter)}/>
                                } label="Show Footer" />
                            </Grid>
                        </Grid>
                    </FormGroup>
                    <p>Visible Columns</p>
                    <FormGroup sx={{marginTop: '5px'}}>
                        <Grid container>
                            {
                                openSettings ? Object.entries(columnVisibility).map(
                                    ([key, value]) => {
                                        return <Grid item xs={2} ><FormControlLabel control={<Checkbox checked={value} onChange={() => setColumnVisibility(prev => ({...prev, [key]: !value}))}/>} label={key} /></Grid>
                                    }
                                ) : null
                            }
                        </Grid>
                    </FormGroup>
                </DialogContent>
            </Dialog>

            <JobAllocator open={openEmailOptions} onClose={() => setOpenEmailOptions(false)} 
            table={table} rowSelection={rowSelection} users={users} setSnack={setSnack}/>
        </>
    
    );
}

// const Filter = ({column, table, ...props}) => {
//     const firstValue = table.getPreFilteredRowModel().flatRows[0]?.getValue(column.id)

//     const columnFilterValue = column.getFilterValue()
    
//     const sortedUniqueValues = useMemo(
//       () =>
//         typeof firstValue === 'number'
//           ? [] 
//           : Array.from(column.getFacetedUniqueValues().keys()).sort(),
//       [column.getFacetedUniqueValues()]
//     )
  
//     if(column?.columnDef?.sortingFn?.name === "dateSort") { //dateColumns.includes(column.id)
//         return (
//             <>
//                 <DebouncedInput
//                     type="date"
//                     value={(columnFilterValue)?.[0] ?? ''}
//                     onChange={(value: any) => {
//                         column.setFilterValue((old: any[]) => [value, old?.[1]])
//                     }}
//                 />
//                 <DebouncedInput
//                     type="date"
//                     value={(columnFilterValue)?.[1] ?? ''}
//                     onChange={(value: any) => {
//                         column.setFilterValue((old: any[]) => [old?.[0], value])
//                     }}
//                 />
//             </>
//           )
//     }

//     if(typeof firstValue === 'number') {
//         return (
//             <>
//                 <DebouncedInput
//                     type="number"
//                     min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
//                     max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
//                     value={(columnFilterValue)?.[0] ?? ''}
//                     onChange={(value: any) =>
//                         column.setFilterValue((old: any[]) => [value, old?.[1]])
//                     }
//                     placeholder={`Min ${
//                         column.getFacetedMinMaxValues()?.[0]
//                         ? `(${column.getFacetedMinMaxValues()?.[0]})`
//                         : ''
//                     }`}
//                 />

//                 <DebouncedInput
//                     type="number"
//                     min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
//                     max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
//                     value={(columnFilterValue)?.[1] ?? ''}
//                     onChange={(value: any) =>
//                         column.setFilterValue((old: any[]) => [old?.[0], value])
//                     }
//                     placeholder={`Max ${
//                         column.getFacetedMinMaxValues()?.[1]
//                         ? `(${column.getFacetedMinMaxValues()?.[1]})`
//                         : ''
//                     }`}
//                 />
//             </>
//         )
//     }

//     return (
//       <>
//         <datalist id={column.id + 'list'}>
//           {sortedUniqueValues.slice(0, 5000).map((value, index) => (
//             <option value={value?.name ?? value} key={index + '_' + value} />
//           ))}
//         </datalist>

//         <DebouncedInput
//           type="text"
//           value={(columnFilterValue ?? '')}
//           onChange={(value: any) => column.setFilterValue(value)}
//           placeholder={`${column.getFacetedUniqueValues().size} Items`}
//           list={column?.id?.name ?? column.id + 'list'}
//           {...props}
//         />
//       </>
//     )
//   }


export default JobTable;